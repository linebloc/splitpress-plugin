<?php

namespace SplitEvo\Core;

use SplitEvo\Api\Manifest;

defined('ABSPATH') || exit;

/**
 * Backend variant assignment — the core differentiator of SplitEvo.
 *
 * Hooks into `template_redirect` (before any output) to transparently replace
 * the original post's content with the assigned variant's content. The URL,
 * post ID, comments, SEO metadata, featured image, and template all come from
 * the original post — only post_content is swapped. This is the "ghost" model:
 * the visitor sees the original page identity with the variant's copy.
 *
 * This means: no JavaScript redirect, no flicker, no CLS, no broken comments.
 */
class Assignor
{
    /**
     * Currently active test data for this request.
     *
     * @var array<string, mixed>|null
     */
    private ?array $active_test = null;

    /**
     * Assigned variant index (0 = control).
     */
    private int $assigned_index = 0;

    public function register(): void
    {
        if (! Options::is_configured()) {
            return;
        }

        // Run before template selection so the content swap is in place early.
        add_action('template_redirect', [$this, 'assign'], 1);
    }

    public function assign(): void
    {
        // Only run on singular front-end pages.
        if (is_admin() || ! is_singular()) {
            return;
        }

        $post = get_queried_object();

        if (! ($post instanceof \WP_Post)) {
            return;
        }

        // Skip if this post type is not opted-in.
        $enabled = Options::enabled_post_types();
        if (! in_array($post->post_type, $enabled, true)) {
            return;
        }

        // Skip variant posts — they are not test targets themselves.
        if (get_post_meta($post->ID, '_splitevo_variant', true)) {
            return;
        }

        // Skip bots and crawlers — they should always see the control.
        if ($this->is_bot()) {
            return;
        }

        $test = Manifest::find_test_for_post($post->ID, $post->post_type);

        if ($test === null) {
            return;
        }

        $variants = $test['variants'] ?? [];
        $weights = array_column($variants, 'weight');

        if (empty($weights)) {
            return;
        }

        $this->active_test = $test;
        $this->assigned_index = Visitor::assign_variant((string) $test['id'], $weights);

        // Index 0 is always the control — no content swap needed.
        if ($this->assigned_index === 0) {
            $this->inject_context($test, 0, $post->ID);

            return;
        }

        $variant = $variants[$this->assigned_index] ?? null;
        $variant_pid = $variant['post_id'] ?? null;

        if (! $variant_pid) {
            return;
        }

        $variant_post = get_post((int) $variant_pid);

        if (! ($variant_post instanceof \WP_Post) || $variant_post->post_status !== 'publish') {
            return;
        }

        // Ghost swap: replace content and title from the variant. Post ID,
        // comments, SEO, template, and featured image remain from the original.
        $this->inject_variant_content($post, $variant_post);
        $this->inject_context($test, $this->assigned_index, (int) $variant_pid);
    }

    /**
     * Replace only the post content with the variant's content.
     * Everything else (ID, comments, SEO, template) stays from the original.
     */
    private function inject_variant_content(\WP_Post $original, \WP_Post $variant): void
    {
        global $wp_query, $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

        $original->post_content = $variant->post_content;
        $original->post_title = $variant->post_title;

        // Keep WP internals consistent with the modified original.
        $wp_query->posts = [$original];
        $wp_query->post = $original;
        $wp_query->post_count = 1;
        $post = $original;

        setup_postdata($original);

        // Prime all variant meta into WP's in-process cache in one DB query so
        // the filter below never needs an extra round-trip per key.
        get_post_meta($variant->ID);

        $original_id = $original->ID;
        $variant_id = $variant->ID;

        // Redirect post meta reads for the original post to the variant when the
        // variant has its own value. This transparently covers Yoast, RankMath,
        // AIOSEO, and any plugin that stores per-post settings in meta.
        add_filter(
            'get_post_metadata',
            static function ($value, $post_id, $meta_key, $single) use ($original_id, $variant_id) {
                if ($post_id !== $original_id || strpos($meta_key, '_edit_') === 0) {
                    return $value;
                }

                if (metadata_exists('post', $variant_id, $meta_key)) {
                    return get_post_meta($variant_id, $meta_key, $single);
                }

                return $value;
            },
            10,
            4
        );
    }

    /**
     * Expose test context to the tracker JS via wp_localize_script.
     */
    private function inject_context(array $test, int $variant_index, int $post_id): void
    {
        add_filter(
            'splitevo_tracker_context',
            function () use ($test, $variant_index, $post_id): array {
                return [
                    'test_id' => $test['id'],
                    'variant_index' => $variant_index,
                    'variant_id' => $test['variants'][$variant_index]['id'] ?? null,
                    'visitor_id' => Visitor::id(),
                    'post_id' => $post_id,
                ];
            }
        );
    }

    /**
     * Simple bot detection — avoids polluting test data with crawler traffic.
     */
    private function is_bot(): bool
    {
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? strtolower(sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT']))) : '';

        foreach (['bot', 'crawler', 'spider', 'slurp', 'googlebot', 'bingbot', 'facebookexternalhit', 'headlesschrome', 'prerender'] as $fragment) {
            if (strpos($ua, $fragment) !== false) {
                return true;
            }
        }

        return false;
    }
}
