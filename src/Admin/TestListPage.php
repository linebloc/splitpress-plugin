<?php

namespace SplitEvo\Admin;

use SplitEvo\Api\Client;
use SplitEvo\Api\Manifest;
use SplitEvo\Core\Options;

defined('ABSPATH') || exit;

class TestListPage
{
    public function register(): void
    {
        add_action('wp_ajax_splitevo_get_tests', [$this, 'ajax_get_tests']);
        add_action('wp_ajax_splitevo_flush_manifest', [$this, 'ajax_flush_manifest']);
    }

    public function ajax_flush_manifest(): void
    {
        check_ajax_referer('splitevo_admin', 'nonce');

        if (! Options::user_can('view')) {
            wp_send_json_error(null, 403);
        }

        Manifest::flush();
        wp_send_json_success();
    }

    public function render(): void
    {
        if (! Options::user_can('view')) {
            wp_die(esc_html__('Insufficient permissions.', 'splitevo'));
        }

        $is_configured = Options::is_configured();

        include SPLITEVO_DIR.'src/Admin/views/test-list.php';
    }

    public function ajax_get_tests(): void
    {
        check_ajax_referer('splitevo_admin', 'nonce');

        if (! Options::user_can('view')) {
            wp_send_json_error(null, 403);
        }

        $response = $this->fetch_tests();

        if ($response === null) {
            wp_send_json_error(['message' => __('Unable to reach SplitEvo API. Check your API key in Settings.', 'splitevo')], 502);

            return;
        }

        wp_send_json_success($response);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetch_tests(): ?array
    {
        $data = (new Client)->get_tests();

        if ($data === null || ! isset($data['tests'])) {
            return null;
        }

        return $data;
    }
}
