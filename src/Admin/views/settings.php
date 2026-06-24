<?php defined('ABSPATH') || exit; ?>

<div class="sp-wrap">
	<div class="sp-header">
		<div class="sp-logo">
			<svg class="sp-logo__icon" width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect x="4" y="4" width="40" height="40" rx="11" fill="#2C5A65"/>
				<rect x="13" y="22" width="7" height="16" rx="2.5" fill="#ffffff" fill-opacity="0.75"/>
				<rect x="27" y="12" width="7" height="26" rx="2.5" fill="#ffffff"/>
			</svg>
			<span class="sp-logo__name">Split<span style="color:var(--sp-primary);">Press</span></span>
		</div>
		<span class="sp-conn-badge <?php echo $is_configured ? 'sp-conn-badge--connected' : 'sp-conn-badge--disconnected'; ?>">
			<span class="sp-conn-badge__dot"></span>
			<?php echo $is_configured ? esc_html__('Connected', 'splitpress') : esc_html__('Not connected', 'splitpress'); ?>
		</span>
		<h1 class="sp-header__title" style="margin-left: auto; font-size: 16px; font-weight: 600; color: var(--sp-text-muted);">
			<?php esc_html_e('Settings', 'splitpress'); ?>
		</h1>
	</div>

	<?php if (isset($_GET['updated']) && $_GET['updated'] === '1') { // phpcs:ignore WordPress.Security?>
		<div class="sp-notice sp-notice--success">
			<?php esc_html_e('Settings saved.', 'splitpress'); ?>
		</div>
	<?php } ?>

	<?php if (! $is_configured) { ?>
		<div class="sp-notice sp-notice--info">
			<strong><?php esc_html_e('Connect SplitPress', 'splitpress'); ?></strong> —
			<?php esc_html_e('Enter your API key to connect this site to your SplitPress account.', 'splitpress'); ?>
		</div>
	<?php } ?>

	<?php if ($cache_plugin) { ?>
		<div class="sp-notice sp-notice--warning">
			<strong><?php echo esc_html($cache_plugin); ?> detected</strong> —
			<?php esc_html_e('Page caching can interfere with A/B testing by serving the same cached version to all visitors. Exclude your test pages from cache, or enable "Cache-busting" in your cache plugin settings.', 'splitpress'); ?>
		</div>
	<?php } ?>

	<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
		<input type="hidden" name="action" value="splitpress_save_settings" />
		<?php wp_nonce_field('splitpress_settings_save'); ?>

		<!-- Connection -->
		<div class="sp-card">
			<h2 class="sp-card__title"><?php esc_html_e('Connection', 'splitpress'); ?></h2>

			<?php if ($is_configured) { ?>
				<div class="sp-connection-status" id="sp-connection-status">
					<span class="sp-connection-status__dot sp-connection-status__dot--idle"></span>
					<span class="sp-connection-status__text" id="sp-connection-text">
						<?php esc_html_e('Not tested yet', 'splitpress'); ?>
					</span>
					<button type="button" class="sp-btn sp-btn--ghost" id="sp-test-connection">
						<?php esc_html_e('Test connection', 'splitpress'); ?>
					</button>
				</div>
			<?php } ?>

			<div class="sp-field">
				<label class="sp-field__label" for="sp-api-key">
					<?php esc_html_e('API Key', 'splitpress'); ?>
				</label>
				<input
					id="sp-api-key"
					class="sp-field__input sp-field__input--full"
					type="password"
					name="api_key"
					value="<?php echo esc_attr($api_key); ?>"
					autocomplete="off"
					placeholder="sp_live_..."
				/>
				<p class="sp-field__help">
					<?php esc_html_e('Find your site API key in SplitPress → Settings → Sites.', 'splitpress'); ?>
				</p>
			</div>

			<?php if ($dev_mode) { ?>
			<div class="sp-field">
				<label class="sp-field__label" for="sp-api-endpoint">
					<?php esc_html_e('API Endpoint', 'splitpress'); ?>
				</label>
				<input
					id="sp-api-endpoint"
					class="sp-field__input sp-field__input--full"
					type="url"
					name="api_endpoint"
					value="<?php echo esc_attr($api_endpoint); ?>"
				/>
				<p class="sp-field__help">
					<?php esc_html_e('Only change this if you are self-hosting SplitPress.', 'splitpress'); ?>
				</p>
			</div>
			<?php } ?>
		</div>

		<!-- Post Types + Permissions (side by side) -->
		<div class="sp-cards-row">

			<div class="sp-card">
				<h2 class="sp-card__title"><?php esc_html_e('Post Types', 'splitpress'); ?></h2>
				<p class="sp-card__description">
					<?php esc_html_e('Select which post types can be used in A/B tests.', 'splitpress'); ?>
				</p>

				<div class="sp-checkbox-group sp-checkbox-group--grid">
					<?php foreach ($post_types as $splitpress_type_key => $splitpress_type_label) { ?>
						<label class="sp-checkbox">
							<input
								type="checkbox"
								name="enabled_post_types[]"
								value="<?php echo esc_attr($splitpress_type_key); ?>"
								<?php checked(in_array($splitpress_type_key, $enabled_types, true)); ?>
							/>
							<span class="sp-checkbox__label"><?php echo esc_html($splitpress_type_label); ?></span>
							<span class="sp-checkbox__slug">(<?php echo esc_html($splitpress_type_key); ?>)</span>
						</label>
					<?php } ?>
				</div>
			</div>

			<div class="sp-card">
				<h2 class="sp-card__title"><?php esc_html_e('Permissions', 'splitpress'); ?></h2>
				<p class="sp-card__description">
					<?php esc_html_e('Control which roles can access SplitPress features.', 'splitpress'); ?>
				</p>

				<div class="sp-perm-table">
					<div class="sp-perm-row sp-perm-row--header">
						<span class="sp-perm-row__role"></span>
						<span class="sp-perm-row__caps">
							<span><?php esc_html_e('View', 'splitpress'); ?></span>
							<span><?php esc_html_e('Create', 'splitpress'); ?></span>
							<span><?php esc_html_e('Edit', 'splitpress'); ?></span>
						</span>
					</div>
					<?php foreach ($roles as $splitpress_role_slug => $splitpress_role_label) { ?>
						<?php $splitpress_is_admin = $splitpress_role_slug === 'administrator'; ?>
						<div class="sp-perm-row <?php echo $splitpress_is_admin ? 'sp-perm-row--admin' : ''; ?>">
							<span class="sp-perm-row__role"><?php echo esc_html($splitpress_role_label); ?></span>
							<span class="sp-perm-row__caps">
								<label class="sp-perm-cap">
									<input
										type="checkbox"
										name="permissions[view_roles][]"
										value="<?php echo esc_attr($splitpress_role_slug); ?>"
										<?php checked($splitpress_is_admin || in_array($splitpress_role_slug, $permissions['view_roles'], true)); ?>
										<?php disabled($splitpress_is_admin); ?>
									/>
								</label>
								<label class="sp-perm-cap">
									<input
										type="checkbox"
										name="permissions[create_roles][]"
										value="<?php echo esc_attr($splitpress_role_slug); ?>"
										<?php checked($splitpress_is_admin || in_array($splitpress_role_slug, $permissions['create_roles'], true)); ?>
										<?php disabled($splitpress_is_admin); ?>
									/>
								</label>
								<label class="sp-perm-cap">
									<input
										type="checkbox"
										name="permissions[edit_roles][]"
										value="<?php echo esc_attr($splitpress_role_slug); ?>"
										<?php checked($splitpress_is_admin || in_array($splitpress_role_slug, $permissions['edit_roles'], true)); ?>
										<?php disabled($splitpress_is_admin); ?>
									/>
								</label>
							</span>
						</div>
					<?php } ?>
				</div>
			</div>

		</div><!-- .sp-cards-row -->


		<div class="sp-actions">
			<button type="submit" class="sp-btn sp-btn--primary">
				<?php esc_html_e('Save Settings', 'splitpress'); ?>
			</button>
		</div>
	</form>
</div>

