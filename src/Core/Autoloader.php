<?php

namespace SplitPress\Core;

defined( 'ABSPATH' ) || exit;

class Autoloader {

	public static function register(): void {
		spl_autoload_register( array( static::class, 'load' ) );
	}

	public static function load( string $class ): void {
		if ( strpos( $class, 'SplitPress\\' ) !== 0 ) {
			return;
		}

		$relative = substr( $class, strlen( 'SplitPress\\' ) );
		$path     = SPLITPRESS_DIR . 'src/' . str_replace( '\\', '/', $relative ) . '.php';

		if ( file_exists( $path ) ) {
			require_once $path;
		}
	}
}
