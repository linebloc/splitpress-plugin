<?php

namespace SplitEvo\Core;

defined('ABSPATH') || exit;

class Activator
{
    public static function activate(): void
    {
        flush_rewrite_rules();

        // Set default options if not already present.
        if (! get_option('splitevo_settings')) {
            update_option(
                'splitevo_settings',
                [
                    'api_key' => '',
                    'api_endpoint' => 'https://splitevo.app/api/v1/plugin',
                    'enabled_post_types' => ['post', 'page'],
                    'dev_mode' => false,
                    'permissions' => [
                        'view_roles' => ['administrator'],
                        'create_roles' => ['administrator'],
                        'edit_roles' => ['administrator'],
                    ],
                ]
            );
        }

        // Grant initial WP role capabilities.
        Options::sync_role_caps();
    }

    public static function deactivate(): void
    {
        flush_rewrite_rules();
    }

    public static function uninstall(): void
    {
        delete_option('splitevo_settings');
        delete_transient('splitevo_manifest');

        // Revoke all SplitEvo capabilities from all roles.
        foreach (wp_roles()->get_names() as $slug => $name) {
            $role = get_role($slug);
            if ($role) {
                $role->remove_cap('splitevo_view');
                $role->remove_cap('splitevo_create');
                $role->remove_cap('splitevo_edit');
            }
        }
    }
}
