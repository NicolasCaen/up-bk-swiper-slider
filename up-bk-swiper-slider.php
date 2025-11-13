<?php
/**
 * Plugin Name: UP BK Swiper Slider
 * Description: Drop-in replacement for UP BK Slick Slider, using Swiper under the hood with compatible block attributes.
 * Author: UP
 * Version: 0.2.2
 * License: GPL-2.0-or-later
 * Text Domain: up-bk-swiper-slider
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function up_bk_swiper_slider_register_block() {
    register_block_type( __DIR__, array(
        'render_callback' => function( $attributes, $content, $block ) {
            ob_start();
            include __DIR__ . '/build/render.php';
            return ob_get_clean();
        }
    ) );
}
add_action( 'init', 'up_bk_swiper_slider_register_block' );
