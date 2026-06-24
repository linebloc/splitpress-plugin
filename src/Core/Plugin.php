<?php

namespace SplitPress\Core;

use SplitPress\Admin\AdminMenu;
use SplitPress\Admin\CreateTestPage;
use SplitPress\Admin\SettingsPage;
use SplitPress\Admin\TestDetailPage;
use SplitPress\Admin\TestListPage;
use SplitPress\Admin\VariantsPage;
use SplitPress\Api\Manifest;
use SplitPress\PostTypes\VariantPostType;
use SplitPress\Tracking\Tracker;

defined('ABSPATH') || exit;

/**
 * Main plugin bootstrap. Initialises all subsystems on plugins_loaded.
 */
final class Plugin
{
    private static ?self $instance = null;

    private function __construct()
    {
        $this->init_subsystems();
    }

    public static function instance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self;
        }

        return self::$instance;
    }

    private function init_subsystems(): void
    {
        // Custom post types (must run early for rewrite rules).
        (new VariantPostType)->register();

        // REST endpoint for instant manifest invalidation from the SplitPress app.
        Manifest::register_flush_endpoint();

        // Admin UI.
        if (is_admin()) {
            (new AdminMenu)->register();
            (new SettingsPage)->register();
            (new TestListPage)->register();
            (new TestDetailPage)->register();
            (new CreateTestPage)->register();
            (new VariantsPage)->register();
        }

        // Front-end assignment — must run before template_redirect.
        (new Assignor)->register();

        // Tracker script injection.
        (new Tracker)->register();
    }
}
