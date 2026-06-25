<?php

defined('ABSPATH') || exit;

/**
 * Variant posts listing page.
 *
 * @var array<string, WP_Post[]> $grouped Posts keyed by post_type.
 */
$splitevo_status_badge = static function (string $status): string {
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
        <h1 class="sp-header__title"><?php esc_html_e('Variant Posts', 'splitevo'); ?></h1>
        <span class="sp-muted" style="margin-left:12px;font-size:13px;">
            <?php esc_html_e('Posts created by SplitEvo as variant copies', 'splitevo'); ?>
        </span>
    </div>

    <?php if (empty($grouped)) { ?>
        <div class="sp-empty-state sp-empty-state--inline">
            <p><?php esc_html_e('No variant posts found. Variants are created when you clone a test.', 'splitevo'); ?></p>
        </div>
    <?php } else { ?>

        <?php foreach ($grouped as $type => $posts) { ?>
            <?php
            $splitevo_type_obj = get_post_type_object($type);
            $splitevo_type_label = $splitevo_type_obj ? $splitevo_type_obj->labels->name : $type;
            $splitevo_is_legacy = $type === 'splitevo_variant';
            ?>

            <div class="sp-section-header">
                <h2 class="sp-section-title">
                    <?php echo esc_html($splitevo_type_label); ?>
                    <?php if ($splitevo_is_legacy) { ?>
                        <span class="sp-badge sp-badge--gray" style="margin-left:8px;font-size:11px;">legacy CPT</span>
                    <?php } ?>
                </h2>
                <span class="sp-muted" style="font-size:13px;"><?php echo esc_html(count($posts)); ?> variant<?php echo count($posts) !== 1 ? 's' : ''; ?></span>
            </div>

            <div class="sp-table-wrapper" style="margin-bottom:24px;">
                <table class="sp-table">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Variant Title', 'splitevo'); ?></th>
                            <th><?php esc_html_e('Original Post', 'splitevo'); ?></th>
                            <th><?php esc_html_e('Test', 'splitevo'); ?></th>
                            <th><?php esc_html_e('Status', 'splitevo'); ?></th>
                            <th><?php esc_html_e('Created', 'splitevo'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($posts as $post) { ?>
                            <?php
                            $splitevo_original = $post->post_parent ? get_post($post->post_parent) : null;
                            $splitevo_test_id = (string) get_post_meta($post->ID, '_splitevo_test_id', true);
                            $splitevo_edit_url = (string) get_edit_post_link($post->ID);
                            ?>
                            <tr class="sp-table__row sp-table__row--clickable" onclick="window.location='<?php echo esc_url($splitevo_edit_url); ?>'">
                                <td>
                                    <span class="sp-test-name">
                                        <?php echo esc_html($post->post_title ?: __('(no title)', 'splitevo')); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if ($splitevo_original) { ?>
                                        <a href="<?php echo esc_url((string) get_edit_post_link($splitevo_original->ID)); ?>" onclick="event.stopPropagation()">
                                            <?php echo esc_html($splitevo_original->post_title ?: __('(no title)', 'splitevo')); ?>
                                        </a>
                                    <?php } else { ?>
                                        <span class="sp-muted">—</span>
                                    <?php } ?>
                                </td>
                                <td>
                                    <?php if ($splitevo_test_id) { ?>
                                        <a
                                            href="<?php echo esc_url(admin_url('admin.php?page=splitpress&test='.urlencode($splitevo_test_id))); ?>"
                                            onclick="event.stopPropagation()"
                                            class="sp-muted"
                                            style="font-family:monospace;font-size:12px;"
                                        >
                                            <?php echo esc_html(substr($splitevo_test_id, 0, 8)); ?>…
                                        </a>
                                    <?php } else { ?>
                                        <span class="sp-muted">—</span>
                                    <?php } ?>
                                </td>
                                <td><?php echo $splitevo_status_badge($post->post_status); // phpcs:ignore WordPress.Security.EscapeOutput?></td>
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
