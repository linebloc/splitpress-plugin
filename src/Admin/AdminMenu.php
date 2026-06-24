<?php

namespace SplitPress\Admin;

use SplitPress\Core\Options;

defined('ABSPATH') || exit;

class AdminMenu
{
    public function register(): void
    {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function add_menu(): void
    {
        add_menu_page(
            __('SplitPress', 'splitpress'),
            __('SplitPress', 'splitpress'),
            'splitpress_view',
            'splitpress',
            [new TestListPage, 'render'],
            'data:image/svg+xml;base64,'.base64_encode($this->logo_svg()),
            76
        );

        add_submenu_page(
            'splitpress',
            __('A/B Tests', 'splitpress'),
            __('A/B Tests', 'splitpress'),
            'splitpress_view',
            'splitpress'
        );

        // Only show the variant posts debug page in dev mode.
        if (Options::dev_mode()) {
            add_submenu_page(
                'splitpress',
                __('Variant Posts', 'splitpress'),
                __('Variant Posts', 'splitpress'),
                'splitpress_view',
                'splitpress-variants',
                [new VariantsPage, 'render']
            );
        }

        add_submenu_page(
            'splitpress',
            __('Settings', 'splitpress'),
            __('Settings', 'splitpress'),
            'manage_options',
            'splitpress-settings',
            [new SettingsPage, 'render']
        );
    }

    public function enqueue_assets(string $hook): void
    {
        if (strpos($hook, 'splitpress') === false) {
            return;
        }

        wp_register_style(
            'splitpress-fonts',
            SPLITPRESS_URL.'assets/css/fonts.css',
            [],
            SPLITPRESS_VERSION
        );

        wp_enqueue_style(
            'splitpress-admin',
            SPLITPRESS_URL.'assets/css/admin.css',
            ['splitpress-fonts'],
            SPLITPRESS_VERSION
        );

        if (strpos($hook, 'toplevel_page_splitpress') !== false || strpos($hook, 'splitpress-variants') !== false) {
            wp_enqueue_style(
                'splitpress-dashboard',
                SPLITPRESS_URL.'assets/css/dashboard.css',
                ['splitpress-fonts'],
                SPLITPRESS_VERSION
            );
        }
    }

    private function logo_svg(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5M2 10l8 5 8-5"/></svg>';
    }
}
