<?php
use SplitEvo\Api\Manifest;
use SplitEvo\Core\Options;

defined('ABSPATH') || exit; ?>

<?php if (! $is_configured) { ?>
<div class="sp-wrap">
	<div class="sp-header">
		<h1 class="sp-header__title"><?php esc_html_e('SplitEvo', 'splitevo'); ?></h1>
	</div>
	<div class="sp-empty-state">
		<div class="sp-empty-state__icon">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M24 4L4 16v16l20 12 20-12V16L24 4z"/>
				<path d="M24 4v40M4 16l20 12 20-12"/>
			</svg>
		</div>
		<h2 class="sp-empty-state__title"><?php esc_html_e('Connect your site to SplitEvo', 'splitevo'); ?></h2>
		<p class="sp-empty-state__body">
			<?php esc_html_e('Add your API key to start running backend A/B tests — no flicker, no front-end redirects.', 'splitevo'); ?>
		</p>
		<a href="<?php echo esc_url(admin_url('admin.php?page=splitpress-settings')); ?>" class="sp-btn sp-btn--primary">
			<?php esc_html_e('Go to Settings', 'splitevo'); ?>
		</a>
	</div>
</div>
<?php return; ?>
<?php } ?>

<div class="sp-wrap" id="splitpress-app">
	<?php /* React dashboard mounts here */ ?>
	<div class="sp-loading">
		<div class="sp-spinner"></div>
		<span><?php esc_html_e('Loading SplitEvo…', 'splitevo'); ?></span>
	</div>
</div>

<?php
wp_enqueue_script(
    'splitpress-dashboard',
    SPLITEVO_URL.'assets/js/dashboard.js',
    [],
    SPLITEVO_VERSION,
    true
);

$splitevo_post_types_raw = get_post_types(['public' => true, 'show_ui' => true], 'objects');
unset($splitevo_post_types_raw['attachment']);
$splitevo_post_types = [];
foreach ($splitevo_post_types_raw as $splitevo_slug => $splitevo_obj) {
    $splitevo_post_types[$splitevo_slug] = $splitevo_obj->labels->singular_name;
}

$splitevo_manifest = Manifest::get();
$splitevo_plan = is_array($splitevo_manifest) ? ($splitevo_manifest['plan'] ?? []) : [];
$splitevo_app_url = rtrim(preg_replace('#/api/v1/plugin$#', '', Options::api_endpoint()), '/');
$splitevo_bool = static fn (string $key): bool => ! empty($splitevo_plan[$key]);

wp_localize_script(
    'splitpress-dashboard',
    'SplitEvoAdmin',
    [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('splitevo_admin'),
        'settings_url' => admin_url('admin.php?page=splitpress-settings'),
        'billing_url' => $splitevo_app_url.'/billing',
        'admin_url' => admin_url(),
        'site_url' => home_url(),
        'version' => SPLITEVO_VERSION,
        'post_types' => $splitevo_post_types,
        'plan' => [
            'name' => $splitevo_plan['name'] ?? 'free',
            'scheduling' => $splitevo_bool('scheduling'),
            'goal_page_reached' => $splitevo_bool('goal_page_reached'),
            'goal_click' => $splitevo_bool('goal_click'),
            'goal_scroll_depth' => $splitevo_bool('goal_scroll_depth'),
            'goal_time_on_page' => $splitevo_bool('goal_time_on_page'),
            'goal_element_view' => $splitevo_bool('goal_element_view'),
            'goal_video_play' => $splitevo_bool('goal_video_play'),
            'goal_form_submission' => $splitevo_bool('goal_form_submission'),
            'goal_external_event' => $splitevo_bool('goal_external_event'),
            'goal_engagement' => $splitevo_bool('goal_engagement'),
            'feature_min_plans' => $splitevo_plan['feature_min_plans'] ?? [],
        ],
    ]
);
