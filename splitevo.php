<?php

use SplitEvo\Core\Autoloader;

/**
 * Plugin Name:       SplitEvo
 * Plugin URI:        https://splitevo.app
 * Description:       Backend A/B testing for WordPress. Server-side variant assignment — no redirect, no flash of wrong content.
 * Version:           0.9.1
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Linebloc
 * Author URI:        https://linebloc.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       splitpress
 * Domain Path:       /languages
 */
defined('ABSPATH') || exit;

define('SPLITEVO_VERSION', '0.9.1');
define('SPLITEVO_FILE', __FILE__);
define('SPLITEVO_DIR', plugin_dir_path(__FILE__));
define('SPLITEVO_URL', plugin_dir_url(__FILE__));
define('SPLITEVO_SLUG', 'splitevo');

require_once SPLITEVO_DIR.'src/Core/Autoloader.php';

Autoloader::register();

register_activation_hook(__FILE__, ['SplitEvo\Core\Activator', 'activate']);
register_deactivation_hook(__FILE__, ['SplitEvo\Core\Activator', 'deactivate']);
register_uninstall_hook(__FILE__, ['SplitEvo\Core\Activator', 'uninstall']);

add_action('plugins_loaded', ['SplitEvo\Core\Plugin', 'instance']);
