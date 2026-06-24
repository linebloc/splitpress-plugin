<?php

namespace SplitPress\Admin;

use SplitPress\Api\Client;
use SplitPress\Api\Manifest;
use SplitPress\Core\Options;

defined('ABSPATH') || exit;

class TestListPage
{
    public function register(): void
    {
        add_action('wp_ajax_splitpress_get_tests', [$this, 'ajax_get_tests']);
        add_action('wp_ajax_splitpress_flush_manifest', [$this, 'ajax_flush_manifest']);
    }

    public function ajax_flush_manifest(): void
    {
        check_ajax_referer('splitpress_admin', 'nonce');

        if (! Options::user_can('view')) {
            wp_send_json_error(null, 403);
        }

        Manifest::flush();
        wp_send_json_success();
    }

    public function render(): void
    {
        if (! Options::user_can('view')) {
            wp_die(esc_html__('Insufficient permissions.', 'splitpress'));
        }

        $is_configured = Options::is_configured();

        include SPLITPRESS_DIR.'src/Admin/views/test-list.php';
    }

    public function ajax_get_tests(): void
    {
        check_ajax_referer('splitpress_admin', 'nonce');

        if (! Options::user_can('view')) {
            wp_send_json_error(null, 403);
        }

        $response = $this->fetch_tests();

        if ($response === null) {
            wp_send_json_error(['message' => __('Unable to reach SplitPress API. Check your API key in Settings.', 'splitpress')], 502);

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
