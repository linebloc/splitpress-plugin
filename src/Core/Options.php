<?php

namespace SplitEvo\Core;

defined('ABSPATH') || exit;

/**
 * Typed accessors for plugin options. Single source of truth for stored settings.
 */
class Options
{
    private const OPTION_KEY = 'splitevo_settings';

    /** Custom capabilities registered by the plugin. */
    public const CAPS = ['splitevo_view', 'splitevo_create', 'splitevo_edit'];

    private static function all(): array
    {
        $defaults = [
            'api_key' => '',
            'api_endpoint' => 'https://splitevo.app/api/v1/plugin',
            'enabled_post_types' => ['post', 'page'],
            'dev_mode' => false,
            'permissions' => [
                'view_roles' => ['administrator'],
                'create_roles' => ['administrator'],
                'edit_roles' => ['administrator'],
            ],
        ];

        $stored = get_option(self::OPTION_KEY, []);

        return wp_parse_args(is_array($stored) ? $stored : [], $defaults);
    }

    public static function api_key(): string
    {
        return (string) self::all()['api_key'];
    }

    public static function api_endpoint(): string
    {
        $stored = rtrim((string) self::all()['api_endpoint'], '/');

        return $stored !== '' ? $stored : 'https://splitevo.app/api/v1/plugin';
    }

    public static function enabled_post_types(): array
    {
        return (array) self::all()['enabled_post_types'];
    }

    public static function dev_mode(): bool
    {
        return (bool) self::all()['dev_mode'];
    }

    public static function is_configured(): bool
    {
        return self::api_key() !== '';
    }

    /**
     * @return array{view_roles: string[], create_roles: string[], edit_roles: string[]}
     */
    public static function permissions(): array
    {
        $stored = self::all()['permissions'] ?? [];
        $defaults = [
            'view_roles' => ['administrator'],
            'create_roles' => ['administrator'],
            'edit_roles' => ['administrator'],
        ];

        return wp_parse_args(is_array($stored) ? $stored : [], $defaults);
    }

    /**
     * Check if the current user has the given SplitEvo permission.
     * Falls back to manage_options when capabilities haven't been synced yet.
     *
     * @param  string  $action  'view' | 'create' | 'edit'
     */
    public static function user_can(string $action): bool
    {
        if (current_user_can('manage_options')) {
            return true;
        }

        return current_user_can('splitevo_'.sanitize_key($action));
    }

    /**
     * Sync stored role permissions → WordPress role capabilities.
     * Call on plugin activation and whenever settings are saved.
     */
    public static function sync_role_caps(): void
    {
        $perms = self::permissions();

        $cap_map = [
            'splitevo_view' => $perms['view_roles'],
            'splitevo_create' => $perms['create_roles'],
            'splitevo_edit' => $perms['edit_roles'],
        ];

        foreach (wp_roles()->role_objects as $slug => $role) {
            foreach ($cap_map as $cap => $allowed_roles) {
                if (in_array($slug, $allowed_roles, true)) {
                    $role->add_cap($cap);
                } else {
                    $role->remove_cap($cap);
                }
            }
        }
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public static function update(array $values): bool
    {
        $current = self::all();
        $merged = array_merge($current, $values);

        return (bool) update_option(self::OPTION_KEY, $merged);
    }
}
