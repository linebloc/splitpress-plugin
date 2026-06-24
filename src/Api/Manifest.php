<?php

namespace SplitPress\Api;

use SplitPress\Core\Options;

defined('ABSPATH') || exit;

/**
 * Local cache layer for the test manifest.
 *
 * The manifest is fetched from the Laravel API and stored in a transient
 * so that every page load does not hit the remote API. The cache is invalidated
 * automatically by TTL or explicitly when a test changes.
 */
class Manifest
{
    private const TRANSIENT_KEY = 'splitpress_manifest';

    private const TTL_SECONDS = 300; // 5 minutes

    /**
     * Returns null when the API is unreachable or returns an error.
     * Callers must handle null — admin pages surface it as an error; the
     * frontend assignor treats it as "no active tests".
     *
     * @return array<string, mixed>|null
     */
    public static function get(): ?array
    {
        $cached = get_transient(self::TRANSIENT_KEY);

        if (is_array($cached)) {
            return $cached;
        }

        $manifest = (new Client)->get_manifest();

        if (is_array($manifest)) {
            set_transient(self::TRANSIENT_KEY, $manifest, self::TTL_SECONDS);

            return $manifest;
        }

        return null;
    }

    public static function flush(): void
    {
        delete_transient(self::TRANSIENT_KEY);
    }

    /**
     * Register the REST endpoint that allows the SplitPress app to push
     * an instant cache invalidation whenever plan overrides change.
     *
     * Secured with a per-site HMAC token derived from the stored API key.
     */
    public static function register_flush_endpoint(): void
    {
        add_action('rest_api_init', function (): void {
            register_rest_route('splitpress/v1', '/flush', [
                'methods' => 'POST',
                'callback' => [self::class, 'handle_flush_request'],
                'permission_callback' => '__return_true',
            ]);
        });
    }

    /**
     * @param  \WP_REST_Request<array<string, mixed>>  $request
     * @return \WP_REST_Response|\WP_Error
     */
    public static function handle_flush_request(\WP_REST_Request $request)
    {
        $api_key = Options::api_key();

        if (! $api_key) {
            return new \WP_Error('not_configured', 'Plugin not configured.', ['status' => 400]);
        }

        $token = (string) $request->get_header('X-SplitPress-Token');
        $expected = hash_hmac('sha256', 'manifest_flush', $api_key);

        if (! hash_equals($expected, $token)) {
            return new \WP_Error('unauthorized', 'Invalid token.', ['status' => 403]);
        }

        self::flush();

        return rest_ensure_response(['flushed' => true]);
    }

    /**
     * Find the first active test matching the given post ID or URL.
     *
     * @return array<string, mixed>|null
     */
    public static function find_test_for_post(int $post_id, string $post_type): ?array
    {
        $manifest = self::get();
        $tests = is_array($manifest) ? ($manifest['tests'] ?? []) : [];

        foreach ($tests as $test) {
            if (! isset($test['status']) || $test['status'] !== 'active') {
                continue;
            }

            if (isset($test['target_post_id']) && (int) $test['target_post_id'] === $post_id) {
                return $test;
            }
        }

        return null;
    }
}
