<?php

namespace SplitEvo\Core;

use SplitEvo\Admin\AdminMenu;
use SplitEvo\Admin\CreateTestPage;
use SplitEvo\Admin\SettingsPage;
use SplitEvo\Admin\TestDetailPage;
use SplitEvo\Admin\TestListPage;
use SplitEvo\Admin\VariantsPage;
use SplitEvo\Api\Manifest;
use SplitEvo\PostTypes\VariantPostType;
use SplitEvo\Tracking\Tracker;

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

        // REST endpoint for instant manifest invalidation from the SplitEvo app.
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
