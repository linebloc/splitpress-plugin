<?php

namespace SplitEvo\Admin;

use SplitEvo\Core\Options;

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
            __('SplitEvo', 'splitevo'),
            __('SplitEvo', 'splitevo'),
            'splitevo_view',
            'splitevo',
            [new TestListPage, 'render'],
            'data:image/svg+xml;base64,'.base64_encode($this->logo_svg()),
            76
        );

        add_submenu_page(
            'splitevo',
            __('A/B Tests', 'splitevo'),
            __('A/B Tests', 'splitevo'),
            'splitevo_view',
            'splitevo'
        );

        // Only show the variant posts debug page in dev mode.
        if (Options::dev_mode()) {
            add_submenu_page(
                'splitevo',
                __('Variant Posts', 'splitevo'),
                __('Variant Posts', 'splitevo'),
                'splitevo_view',
                'splitpress-variants',
                [new VariantsPage, 'render']
            );
        }

        add_submenu_page(
            'splitevo',
            __('Settings', 'splitevo'),
            __('Settings', 'splitevo'),
            'manage_options',
            'splitpress-settings',
            [new SettingsPage, 'render']
        );
    }

    public function enqueue_assets(string $hook): void
    {
        if (strpos($hook, 'splitevo') === false) {
            return;
        }

        wp_register_style(
            'splitpress-fonts',
            SPLITEVO_URL.'assets/css/fonts.css',
            [],
            SPLITEVO_VERSION
        );

        wp_enqueue_style(
            'splitpress-admin',
            SPLITEVO_URL.'assets/css/admin.css',
            ['splitpress-fonts'],
            SPLITEVO_VERSION
        );

        if (strpos($hook, 'toplevel_page_splitpress') !== false || strpos($hook, 'splitpress-variants') !== false) {
            wp_enqueue_style(
                'splitpress-dashboard',
                SPLITEVO_URL.'assets/css/dashboard.css',
                ['splitpress-fonts'],
                SPLITEVO_VERSION
            );
        }
    }

    private function logo_svg(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5M2 10l8 5 8-5"/></svg>';
    }
}
