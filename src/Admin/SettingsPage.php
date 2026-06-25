<?php

namespace SplitEvo\Admin;

use SplitEvo\Api\Client;
use SplitEvo\Api\Manifest;
use SplitEvo\Core\Options;

defined('ABSPATH') || exit;

class SettingsPage
{
    public function register(): void
    {
        add_action('admin_post_splitevo_save_settings', [$this, 'handle_save']);
        add_action('wp_ajax_splitevo_test_connection', [$this, 'ajax_test_connection']);
        add_action('wp_ajax_splitevo_cleanup_orphans', [$this, 'ajax_cleanup_orphans']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_settings_scripts']);
    }

    public function enqueue_settings_scripts(string $hook): void
    {
        if ($hook !== 'splitevo_page_splitpress-settings') {
            return;
        }

        wp_register_script('splitpress-settings', false, [], SPLITEVO_VERSION, true);
        wp_enqueue_script('splitpress-settings');

        wp_localize_script('splitpress-settings', 'splitpressSettingsCfg', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('splitevo_admin'),
            'i18n' => [
                'testing' => __('Testing…', 'splitevo'),
                'connected' => __('Connected', 'splitevo'),
                'connFailed' => __('Connection failed', 'splitevo'),
                'reqFailed' => __('Request failed — check browser console.', 'splitevo'),
                'cleaning' => __('Cleaning up…', 'splitevo'),
                'noOrphans' => __('No unused variants found.', 'splitevo'),
                'varDeleted' => __('variant(s) deleted.', 'splitevo'),
                'cleanFailed' => __('Cleanup failed.', 'splitevo'),
                'netFailed' => __('Request failed.', 'splitevo'),
                'confirmClean' => __('This will permanently delete all variant posts not linked to a test. Continue?', 'splitevo'),
            ],
        ]);

        if (Options::is_configured()) {
            wp_add_inline_script('splitpress-settings', $this->connection_test_script());
        }

        wp_add_inline_script('splitpress-settings', $this->cleanup_orphans_script());
    }

    private function connection_test_script(): string
    {
        return <<<'JS'
        (function () {
            var cfg   = splitpressSettingsCfg;
            var btn   = document.getElementById('sp-test-connection');
            var dot   = document.querySelector('.sp-connection-status__dot');
            var label = document.getElementById('sp-connection-text');

            if (!btn) return;

            btn.addEventListener('click', function () {
                btn.disabled = true;
                dot.className = 'sp-connection-status__dot sp-connection-status__dot--idle';
                label.textContent = cfg.i18n.testing;

                var body = new FormData();
                body.append('action', 'splitevo_test_connection');
                body.append('nonce', cfg.nonce);

                fetch(cfg.ajaxUrl, {
                    method: 'POST',
                    body: body,
                    credentials: 'same-origin',
                })
                .then(function (r) { return r.json(); })
                .then(function (json) {
                    if (json.success) {
                        dot.className = 'sp-connection-status__dot sp-connection-status__dot--ok';
                        label.textContent = cfg.i18n.connected;
                    } else {
                        dot.className = 'sp-connection-status__dot sp-connection-status__dot--error';
                        label.textContent = json.data && json.data.message
                            ? json.data.message
                            : cfg.i18n.connFailed;
                    }
                })
                .catch(function () {
                    dot.className = 'sp-connection-status__dot sp-connection-status__dot--error';
                    label.textContent = cfg.i18n.reqFailed;
                })
                .finally(function () {
                    btn.disabled = false;
                });
            });

            btn.click();
        }());
        JS;
    }

    private function cleanup_orphans_script(): string
    {
        return <<<'JS'
        (function () {
            var cfg           = splitpressSettingsCfg;
            var cleanupBtn    = document.getElementById('sp-cleanup-orphans');
            var cleanupResult = document.getElementById('sp-cleanup-result');

            if (!cleanupBtn) return;

            cleanupBtn.addEventListener('click', function () {
                if (!confirm(cfg.i18n.confirmClean)) {
                    return;
                }
                cleanupBtn.disabled = true;
                cleanupResult.textContent = cfg.i18n.cleaning;
                cleanupResult.style.color = '';

                var body = new FormData();
                body.append('action', 'splitevo_cleanup_orphans');
                body.append('nonce', cfg.nonce);

                fetch(cfg.ajaxUrl, {
                    method: 'POST',
                    body: body,
                    credentials: 'same-origin',
                })
                .then(function (r) { return r.json(); })
                .then(function (json) {
                    if (json.success) {
                        var n = json.data.deleted;
                        cleanupResult.textContent = n === 0
                            ? cfg.i18n.noOrphans
                            : n + ' ' + cfg.i18n.varDeleted;
                        cleanupResult.style.color = '#16a34a';
                    } else {
                        cleanupResult.textContent = (json.data && json.data.message) || cfg.i18n.cleanFailed;
                        cleanupResult.style.color = '#dc2626';
                    }
                })
                .catch(function () {
                    cleanupResult.textContent = cfg.i18n.netFailed;
                    cleanupResult.style.color = '#dc2626';
                })
                .finally(function () {
                    cleanupBtn.disabled = false;
                });
            });
        }());
        JS;
    }

    public function ajax_cleanup_orphans(): void
    {
        check_ajax_referer('splitevo_admin', 'nonce');

        if (! current_user_can('manage_options')) {
            wp_send_json_error(null, 403);
        }

        $all_tests = (new Client)->get_tests();

        if ($all_tests === null) {
            wp_send_json_error(['message' => 'Could not reach the SplitEvo API. Restore the connection before cleaning up.']);

            return;
        }

        // Build a lookup of every test ID currently known by the API.
        $known_ids = [];
        foreach ($all_tests['tests'] ?? [] as $test) {
            if (! empty($test['id'])) {
                $known_ids[(string) $test['id']] = true;
            }
        }

        // Use a direct DB query to bypass the pre_get_posts hook that hides variant
        // posts from WP_Query — combining NOT EXISTS + value = '1' returns nothing.
        global $wpdb;
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $variant_post_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT DISTINCT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value = %s",
                '_splitevo_variant',
                '1'
            )
        );

        $deleted = 0;
        foreach ($variant_post_ids as $raw_id) {
            $post_id = (int) $raw_id;
            $test_id = (string) get_post_meta($post_id, '_splitevo_test_id', true);

            if (! $test_id || ! isset($known_ids[$test_id])) {
                wp_delete_post($post_id, true);
                $deleted++;
            }
        }

        wp_send_json_success(['deleted' => $deleted]);
    }

    public function ajax_test_connection(): void
    {
        check_ajax_referer('splitevo_admin', 'nonce');

        if (! current_user_can('manage_options')) {
            wp_send_json_error(null, 403);
        }

        $result = (new Client)->test_connection();

        if ($result['ok']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function render(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Insufficient permissions.', 'splitevo'));
        }

        $api_key = Options::api_key();
        $api_endpoint = Options::api_endpoint();
        $enabled_types = Options::enabled_post_types();
        $dev_mode = Options::dev_mode();
        $permissions = Options::permissions();
        $post_types = $this->get_available_post_types();
        $roles = $this->get_available_roles();
        $is_configured = Options::is_configured();
        $cache_plugin = $this->detect_cache_plugin();

        include SPLITEVO_DIR.'src/Admin/views/settings.php';
    }

    public function handle_save(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Insufficient permissions.', 'splitevo'));
        }

        check_admin_referer('splitevo_settings_save');

        // phpcs:disable WordPress.Security.NonceVerification
        $api_key = sanitize_text_field(wp_unslash($_POST['api_key'] ?? ''));
        $dev_mode = isset($_POST['dev_mode']);

        $enabled_types = isset($_POST['enabled_post_types']) && is_array($_POST['enabled_post_types'])
            ? array_map('sanitize_key', wp_unslash($_POST['enabled_post_types']))
            : [];

        $permissions = [
            'view_roles' => $this->sanitize_roles(
                isset($_POST['permissions']['view_roles']) && is_array($_POST['permissions']['view_roles'])
                    ? array_map('sanitize_key', wp_unslash($_POST['permissions']['view_roles']))
                    : []
            ),
            'create_roles' => $this->sanitize_roles(
                isset($_POST['permissions']['create_roles']) && is_array($_POST['permissions']['create_roles'])
                    ? array_map('sanitize_key', wp_unslash($_POST['permissions']['create_roles']))
                    : []
            ),
            'edit_roles' => $this->sanitize_roles(
                isset($_POST['permissions']['edit_roles']) && is_array($_POST['permissions']['edit_roles'])
                    ? array_map('sanitize_key', wp_unslash($_POST['permissions']['edit_roles']))
                    : []
            ),
        ];
        // phpcs:enable WordPress.Security.NonceVerification

        $data = [
            'api_key' => $api_key,
            'enabled_post_types' => $enabled_types,
            'dev_mode' => $dev_mode,
            'permissions' => $permissions,
        ];

        // Only persist api_endpoint when the dev mode field is present in the form,
        // so a normal save never overwrites the default with an empty string.
        if (isset($_POST['api_endpoint'])) { // phpcs:ignore WordPress.Security.NonceVerification
            $submitted = esc_url_raw(wp_unslash($_POST['api_endpoint']));
            $data['api_endpoint'] = $submitted ?: Options::api_endpoint();
        }

        Options::update($data);

        // Sync WP role capabilities to match saved permissions.
        Options::sync_role_caps();

        // Flush manifest so next page load fetches fresh data.
        Manifest::flush();

        wp_safe_redirect(
            add_query_arg(
                [
                    'page' => 'splitpress-settings',
                    'updated' => '1',
                ],
                admin_url('admin.php')
            )
        );
        exit;
    }

    /**
     * @return array<string, string>
     */
    private function get_available_post_types(): array
    {
        $types = get_post_types(['public' => true], 'objects');
        $result = [];

        foreach ($types as $type) {
            if ($type->name === 'attachment') {
                continue;
            }
            $result[$type->name] = $type->labels->singular_name;
        }

        return $result;
    }

    /**
     * @return array<string, string> slug => display name
     */
    private function get_available_roles(): array
    {
        $roles = wp_roles()->get_names();
        $result = [];

        foreach ($roles as $slug => $name) {
            $result[$slug] = translate_user_role($name);
        }

        return $result;
    }

    /**
     * Returns the name of an active page-caching plugin, or null if none detected.
     * Page caches can interfere with backend A/B testing by serving cached HTML.
     */
    private function detect_cache_plugin(): ?string
    {
        if (defined('WP_ROCKET_VERSION')) {
            return 'WP Rocket';
        }

        if (defined('W3TC_VERSION')) {
            return 'W3 Total Cache';
        }

        if (function_exists('wpsc_clear_expired_cache')) {
            return 'WP Super Cache';
        }

        if (class_exists('LiteSpeed_Cache')) {
            return 'LiteSpeed Cache';
        }

        if (defined('WPFC_MAIN_PATH')) {
            return 'WP Fastest Cache';
        }

        if (function_exists('sg_cachepress_purge_cache')) {
            return 'SiteGround Optimizer';
        }

        return null;
    }

    /**
     * @param  mixed  $raw
     * @return string[]
     */
    private function sanitize_roles($raw): array
    {
        if (! is_array($raw)) {
            return ['administrator'];
        }

        $sanitized = array_values(array_filter(array_map('sanitize_key', $raw)));

        // Administrator always retains access.
        if (! in_array('administrator', $sanitized, true)) {
            $sanitized[] = 'administrator';
        }

        return $sanitized;
    }
}
