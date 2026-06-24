<?php

namespace SplitPress\Core;

defined('ABSPATH') || exit;

/**
 * Creates variant post clones for A/B tests.
 *
 * Clones keep the original post type (post, page, CPT) so they inherit the
 * correct theme template, comments support, and post-type capabilities.
 * The _splitpress_variant meta flag is used to hide them everywhere.
 */
class VariantCloner
{
    /**
     * Clone a published post.
     *
     * Copies title, content, excerpt, and all non-internal meta.
     * Adds the _splitpress_variant flag so the post is hidden from
     * archives, search, RSS, and admin post lists.
     *
     * @return int|\WP_Error New post ID on success.
     */
    public static function clone(int $post_id)
    {
        $original = get_post($post_id);

        if (! $original) {
            return new \WP_Error('not_found', 'Original post not found.');
        }

        $clone_id = wp_insert_post(
            [
                'post_title' => $original->post_title,
                'post_content' => $original->post_content,
                'post_excerpt' => $original->post_excerpt,
                'post_status' => 'draft',
                'post_type' => $original->post_type,
                'post_author' => get_current_user_id(),
                'post_parent' => $original->ID,
                'menu_order' => $original->menu_order,
                'post_date' => $original->post_date,
                'post_date_gmt' => $original->post_date_gmt,
            ],
            true
        );

        if (is_wp_error($clone_id)) {
            return $clone_id;
        }

        // Flag as a variant — hides from archives, search, RSS, and admin lists.
        update_post_meta($clone_id, '_splitpress_variant', '1');
        // Explicit reference to the original so handle_apply() doesn't rely on post_parent.
        update_post_meta($clone_id, '_splitpress_control_post_id', $post_id);

        // Copy post meta, skipping WP internals and SplitPress-managed keys.
        $meta = get_post_meta($original->ID);

        foreach ($meta as $key => $values) {
            if (
                strpos($key, '_edit_') === 0 ||
                strpos($key, '_wp_') === 0 ||
                strpos($key, '_splitpress_') === 0
            ) {
                continue;
            }

            foreach ($values as $value) {
                add_post_meta($clone_id, $key, maybe_unserialize($value));
            }
        }

        return $clone_id;
    }
}
