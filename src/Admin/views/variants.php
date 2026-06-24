<?php

defined('ABSPATH') || exit;

/**
 * Variant posts listing page.
 *
 * @var array<string, WP_Post[]> $grouped Posts keyed by post_type.
 */
$splitpress_status_badge = static function (string $status): string {
    $map = [
        'publish' => 'green',
        'draft' => 'gray',
        'pending' => 'yellow',
        'future' => 'blue',
        'private' => 'purple',
        'trash' => 'gray',
    ];
    $color = $map[$status] ?? 'gray';

    return '<span class="sp-badge sp-badge--'.esc_attr($color).'">'.esc_html($status).'</span>';
};
?>

<div class="sp-wrap">
    <div class="sp-header">
        <h1 class="sp-header__title"><?php esc_html_e('Variant Posts', 'splitpress'); ?></h1>
        <span class="sp-muted" style="margin-left:12px;font-size:13px;">
            <?php esc_html_e('Posts created by SplitPress as variant copies', 'splitpress'); ?>
        </span>
    </div>

    <?php if (empty($grouped)) { ?>
        <div class="sp-empty-state sp-empty-state--inline">
            <p><?php esc_html_e('No variant posts found. Variants are created when you clone a test.', 'splitpress'); ?></p>
        </div>
    <?php } else { ?>

        <?php foreach ($grouped as $type => $posts) { ?>
            <?php
            $splitpress_type_obj = get_post_type_object($type);
            $splitpress_type_label = $splitpress_type_obj ? $splitpress_type_obj->labels->name : $type;
            $splitpress_is_legacy = $type === 'splitpress_variant';
            ?>

            <div class="sp-section-header">
                <h2 class="sp-section-title">
                    <?php echo esc_html($splitpress_type_label); ?>
                    <?php if ($splitpress_is_legacy) { ?>
                        <span class="sp-badge sp-badge--gray" style="margin-left:8px;font-size:11px;">legacy CPT</span>
                    <?php } ?>
                </h2>
                <span class="sp-muted" style="font-size:13px;"><?php echo esc_html(count($posts)); ?> variant<?php echo count($posts) !== 1 ? 's' : ''; ?></span>
            </div>

            <div class="sp-table-wrapper" style="margin-bottom:24px;">
                <table class="sp-table">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Variant Title', 'splitpress'); ?></th>
                            <th><?php esc_html_e('Original Post', 'splitpress'); ?></th>
                            <th><?php esc_html_e('Test', 'splitpress'); ?></th>
                            <th><?php esc_html_e('Status', 'splitpress'); ?></th>
                            <th><?php esc_html_e('Created', 'splitpress'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($posts as $post) { ?>
                            <?php
                            $splitpress_original = $post->post_parent ? get_post($post->post_parent) : null;
                            $splitpress_test_id = (string) get_post_meta($post->ID, '_splitpress_test_id', true);
                            $splitpress_edit_url = (string) get_edit_post_link($post->ID);
                            ?>
                            <tr class="sp-table__row sp-table__row--clickable" onclick="window.location='<?php echo esc_url($splitpress_edit_url); ?>'">
                                <td>
                                    <span class="sp-test-name">
                                        <?php echo esc_html($post->post_title ?: __('(no title)', 'splitpress')); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if ($splitpress_original) { ?>
                                        <a href="<?php echo esc_url((string) get_edit_post_link($splitpress_original->ID)); ?>" onclick="event.stopPropagation()">
                                            <?php echo esc_html($splitpress_original->post_title ?: __('(no title)', 'splitpress')); ?>
                                        </a>
                                    <?php } else { ?>
                                        <span class="sp-muted">—</span>
                                    <?php } ?>
                                </td>
                                <td>
                                    <?php if ($splitpress_test_id) { ?>
                                        <a
                                            href="<?php echo esc_url(admin_url('admin.php?page=splitpress&test='.urlencode($splitpress_test_id))); ?>"
                                            onclick="event.stopPropagation()"
                                            class="sp-muted"
                                            style="font-family:monospace;font-size:12px;"
                                        >
                                            <?php echo esc_html(substr($splitpress_test_id, 0, 8)); ?>…
                                        </a>
                                    <?php } else { ?>
                                        <span class="sp-muted">—</span>
                                    <?php } ?>
                                </td>
                                <td><?php echo $splitpress_status_badge($post->post_status); // phpcs:ignore WordPress.Security.EscapeOutput?></td>
                                <td class="sp-muted" style="font-size:12px;">
                                    <?php echo esc_html(date_i18n(get_option('date_format'), strtotime($post->post_date))); ?>
                                </td>
                            </tr>
                        <?php } ?>
                    </tbody>
                </table>
            </div>

        <?php } ?>

    <?php } ?>
</div>
