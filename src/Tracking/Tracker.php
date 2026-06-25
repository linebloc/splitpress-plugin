<?php

namespace SplitEvo\Tracking;

use SplitEvo\Api\Client;
use SplitEvo\Api\Manifest;
use SplitEvo\Core\Options;

defined('ABSPATH') || exit;

/**
 * Injects the lightweight front-end tracker script.
 *
 * The script handles: page view event, goal-page detection, and (later)
 * click/scroll/video/engagement metrics. It reports back to the WordPress
 * AJAX endpoint which proxies events to the Laravel API — keeping the API
 * key off the browser entirely.
 */
class Tracker
{
    public function register(): void
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue']);
        add_action('wp_ajax_nopriv_splitevo_event', [$this, 'handle_ajax_event']);
        add_action('wp_ajax_splitevo_event', [$this, 'handle_ajax_event']);
    }

    public function enqueue(): void
    {
        if (! Options::is_configured()) {
            return;
        }

        // Context is set by Assignor only when a test is active on this page.
        $context = apply_filters('splitevo_tracker_context', null);

        if ($context === null) {
            return;
        }

        wp_enqueue_script(
            'splitpress-tracker',
            SPLITEVO_URL.'assets/js/tracker.js',
            [],
            SPLITEVO_VERSION,
            ['strategy' => 'defer']
        );

        wp_localize_script(
            'splitpress-tracker',
            'SplitEvoConfig',
            [
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('splitevo_event'),
                'context' => $context,
                'goals' => $this->get_goals($context['test_id']),
            ]
        );
    }

    /**
     * AJAX handler: receives events from the tracker JS, validates the nonce,
     * and forwards the batch to the Laravel API.
     */
    public function handle_ajax_event(): void
    {
        check_ajax_referer('splitevo_event', 'nonce');

        // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- JSON string; individual event fields are sanitized in sanitize_event().
        $raw = isset($_POST['events']) ? wp_unslash($_POST['events']) : null;

        if (! is_string($raw)) {
            wp_send_json_error(['message' => 'Invalid payload'], 400);

            return;
        }

        $events = json_decode($raw, true);

        if (! is_array($events)) {
            wp_send_json_error(['message' => 'Invalid JSON'], 400);

            return;
        }

        // Sanitise each event — only allow expected fields through.
        $clean_events = array_map([$this, 'sanitize_event'], $events);
        $clean_events = array_filter($clean_events);

        if (empty($clean_events)) {
            wp_send_json_error(['message' => 'No valid events'], 400);

            return;
        }

        $success = (new Client)->send_events(array_values($clean_events));

        if ($success) {
            wp_send_json_success();
        } else {
            wp_send_json_error(['message' => 'API error'], 502);
        }
    }

    /**
     * @param  mixed  $event
     * @return array<string, mixed>|null
     */
    private function sanitize_event($event): ?array
    {
        if (! is_array($event)) {
            return null;
        }

        $allowed_types = ['page_view', 'goal_page', 'click', 'scroll', 'time_on_page', 'element_view', 'video_play', 'external_event'];

        $type = sanitize_key($event['type'] ?? '');

        if (! in_array($type, $allowed_types, true)) {
            return null;
        }

        $visitor_id = sanitize_text_field($event['visitor_id'] ?? '');
        if (! preg_match('/^splitevo_[a-f0-9]{32}$/', $visitor_id)) {
            return null;
        }

        // Tracker.js sends goal_id inside the meta object; extract it to the top level
        // so the Laravel API can store it in the events.goal_id column.
        $meta_raw = is_array($event['meta'] ?? null) ? $event['meta'] : [];
        $goal_id = isset($meta_raw['goal_id']) ? absint($meta_raw['goal_id']) : null;
        unset($meta_raw['goal_id']);

        return [
            'type' => $type,
            'test_id' => sanitize_text_field($event['test_id'] ?? ''),
            'variant_id' => absint($event['variant_id'] ?? 0),
            'visitor_id' => $visitor_id,
            'url' => esc_url_raw($event['url'] ?? ''),
            'goal_id' => $goal_id ?: null,
            'meta' => array_map(
                static function ($val) {
                    return is_scalar($val) ? sanitize_text_field((string) $val) : wp_json_encode($val);
                },
                $meta_raw
            ),
            'occurred_at' => absint($event['occurred_at'] ?? time()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function get_goals(string $test_id): array
    {
        $manifest = Manifest::get();
        $tests = $manifest['tests'] ?? [];

        foreach ($tests as $test) {
            if (isset($test['id']) && (string) $test['id'] === $test_id) {
                return $test['goals'] ?? [];
            }
        }

        return [];
    }
}
