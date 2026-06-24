<?php
use SplitPress\Api\Manifest;
use SplitPress\Core\Options;

defined('ABSPATH') || exit; ?>

<?php if (! $is_configured) { ?>
<div class="sp-wrap">
	<div class="sp-header">
		<h1 class="sp-header__title"><?php esc_html_e('SplitPress', 'splitpress'); ?></h1>
	</div>
	<div class="sp-empty-state">
		<div class="sp-empty-state__icon">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M24 4L4 16v16l20 12 20-12V16L24 4z"/>
				<path d="M24 4v40M4 16l20 12 20-12"/>
			</svg>
		</div>
		<h2 class="sp-empty-state__title"><?php esc_html_e('Connect your site to SplitPress', 'splitpress'); ?></h2>
		<p class="sp-empty-state__body">
			<?php esc_html_e('Add your API key to start running backend A/B tests — no flicker, no front-end redirects.', 'splitpress'); ?>
		</p>
		<a href="<?php echo esc_url(admin_url('admin.php?page=splitpress-settings')); ?>" class="sp-btn sp-btn--primary">
			<?php esc_html_e('Go to Settings', 'splitpress'); ?>
		</a>
	</div>
</div>
<?php return; ?>
<?php } ?>

<div class="sp-wrap" id="splitpress-app">
	<?php /* React dashboard mounts here */ ?>
	<div class="sp-loading">
		<div class="sp-spinner"></div>
		<span><?php esc_html_e('Loading SplitPress…', 'splitpress'); ?></span>
	</div>
</div>

<?php
wp_enqueue_script(
    'splitpress-dashboard',
    SPLITPRESS_URL.'assets/js/dashboard.js',
    [],
    SPLITPRESS_VERSION,
    true
);

$splitpress_post_types_raw = get_post_types(['public' => true, 'show_ui' => true], 'objects');
unset($splitpress_post_types_raw['attachment']);
$splitpress_post_types = [];
foreach ($splitpress_post_types_raw as $splitpress_slug => $splitpress_obj) {
    $splitpress_post_types[$splitpress_slug] = $splitpress_obj->labels->singular_name;
}

$splitpress_manifest = Manifest::get();
$splitpress_plan = is_array($splitpress_manifest) ? ($splitpress_manifest['plan'] ?? []) : [];
$splitpress_app_url = rtrim(preg_replace('#/api/v1/plugin$#', '', Options::api_endpoint()), '/');
$splitpress_bool = static fn (string $key): bool => ! empty($splitpress_plan[$key]);

wp_localize_script(
    'splitpress-dashboard',
    'SplitPressAdmin',
    [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('splitpress_admin'),
        'settings_url' => admin_url('admin.php?page=splitpress-settings'),
        'billing_url' => $splitpress_app_url.'/billing',
        'admin_url' => admin_url(),
        'site_url' => home_url(),
        'version' => SPLITPRESS_VERSION,
        'post_types' => $splitpress_post_types,
        'plan' => [
            'name' => $splitpress_plan['name'] ?? 'free',
            'scheduling' => $splitpress_bool('scheduling'),
            'goal_page_reached' => $splitpress_bool('goal_page_reached'),
            'goal_click' => $splitpress_bool('goal_click'),
            'goal_scroll_depth' => $splitpress_bool('goal_scroll_depth'),
            'goal_time_on_page' => $splitpress_bool('goal_time_on_page'),
            'goal_element_view' => $splitpress_bool('goal_element_view'),
            'goal_video_play' => $splitpress_bool('goal_video_play'),
            'goal_form_submission' => $splitpress_bool('goal_form_submission'),
            'goal_external_event' => $splitpress_bool('goal_external_event'),
            'goal_engagement' => $splitpress_bool('goal_engagement'),
            'feature_min_plans' => $splitpress_plan['feature_min_plans'] ?? [],
        ],
    ]
);
