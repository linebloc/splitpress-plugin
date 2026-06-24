<?php

namespace SplitPress\Core;

defined('ABSPATH') || exit;

class Activator
{
    public static function activate(): void
    {
        flush_rewrite_rules();

        // Set default options if not already present.
        if (! get_option('splitpress_settings')) {
            update_option(
                'splitpress_settings',
                [
                    'api_key' => '',
                    'api_endpoint' => 'https://splitpress.app/api/v1/plugin',
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
        delete_option('splitpress_settings');
        delete_transient('splitpress_manifest');

        // Revoke all SplitPress capabilities from all roles.
        foreach (wp_roles()->get_names() as $slug => $name) {
            $role = get_role($slug);
            if ($role) {
                $role->remove_cap('splitpress_view');
                $role->remove_cap('splitpress_create');
                $role->remove_cap('splitpress_edit');
            }
        }
    }
}
