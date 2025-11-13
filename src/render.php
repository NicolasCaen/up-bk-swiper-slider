<?php
/**
 * Server-side render for UP BK Swiper Slider (drop-in for Slick block attributes)
 */

// Attributes
$attrs = $attributes ?? [];

// Current post ID (needed for meta source)
$post_id = 0;
if (!empty($block) && isset($block->context['postId'])) {
    $post_id = intval($block->context['postId']);
} elseif (function_exists('get_the_ID')) {
    $post_id = intval(get_the_ID());
}

// Read common options (same names as Slick block)
$autoplay       = filter_var($attrs['autoplay'] ?? true, FILTER_VALIDATE_BOOLEAN);
$autoplaySpeed  = intval($attrs['autoplaySpeed'] ?? 3000);
$arrows         = filter_var($attrs['arrows'] ?? true, FILTER_VALIDATE_BOOLEAN);
$dots           = filter_var($attrs['dots'] ?? true, FILTER_VALIDATE_BOOLEAN);
$infinite       = filter_var($attrs['infinite'] ?? true, FILTER_VALIDATE_BOOLEAN);
$speed          = intval($attrs['speed'] ?? 500);
$slidesToShow   = intval($attrs['slidesToShow'] ?? 1);
$slidesToScroll = intval($attrs['slidesToScroll'] ?? 1);
$fade           = filter_var($attrs['fade'] ?? false, FILTER_VALIDATE_BOOLEAN);
$centerMode     = filter_var($attrs['centerMode'] ?? false, FILTER_VALIDATE_BOOLEAN);
$adaptiveHeight = filter_var($attrs['adaptiveHeight'] ?? false, FILTER_VALIDATE_BOOLEAN);
$pauseOnHover   = filter_var($attrs['pauseOnHover'] ?? true, FILTER_VALIDATE_BOOLEAN);
$swipe          = filter_var($attrs['swipe'] ?? true, FILTER_VALIDATE_BOOLEAN);
$responsive     = filter_var($attrs['responsive'] ?? true, FILTER_VALIDATE_BOOLEAN);
$fixedHeight    = filter_var($attrs['fixedHeight'] ?? false, FILTER_VALIDATE_BOOLEAN);
$slideHeight    = $attrs['slideHeight'] ?? '';
$objectFit      = $attrs['objectFit'] ?? 'cover';
$imageSize      = $attrs['imageSize'] ?? 'full';
$gap            = intval($attrs['gap'] ?? 0);
$autoHideArrows = filter_var($attrs['autoHideArrows'] ?? false, FILTER_VALIDATE_BOOLEAN);
$aspectRatio    = $attrs['aspectRatio'] ?? 'auto';
$showFigcaption = filter_var($attrs['showFigcaption'] ?? false, FILTER_VALIDATE_BOOLEAN);

// Slides source
$slides = !empty($attrs['slides']) ? $attrs['slides'] : [];
if (($attrs['imageSource'] ?? '') === 'meta') {
    $meta_key = isset($attrs['metaKey']) ? trim((string) $attrs['metaKey']) : '';
    if ($meta_key !== '' && $post_id) {
        $raw = get_post_meta($post_id, $meta_key, true);
        if (is_string($raw) && $raw !== '') {
            $ids = array_filter(array_map('intval', array_map('trim', explode(',', $raw))));
            if (!empty($ids)) {
                $built = [];
                foreach ($ids as $aid) {
                    $url = wp_get_attachment_url($aid);
                    if (!$url) { continue; }
                    $alt = get_post_meta($aid, '_wp_attachment_image_alt', true);
                    $built[] = [ 'id' => $aid, 'url' => $url, 'alt' => is_string($alt) ? $alt : '' ];
                }
                if (!empty($built)) { $slides = $built; }
            }
        }
    }
}

// Aspect ratio style
$aspect_ratio_style = '';
if (!empty($aspectRatio) && $aspectRatio !== 'auto') {
    $parts = explode('/', $aspectRatio);
    if (count($parts) === 2 && is_numeric($parts[0]) && is_numeric($parts[1])) {
        $aspect_ratio_style = sprintf('aspect-ratio: %d / %d;', intval($parts[0]), intval($parts[1]));
    }
}

// Inline vars
$initial_styles = [];
if ($fixedHeight && $slideHeight !== '') {
    $initial_styles[] = sprintf('--slide-height: %s', esc_attr($slideHeight));
}
$initial_styles[] = sprintf('--desktop-gap: %dpx', $gap);
$initial_styles[] = sprintf('--desktop-object-fit: %s', esc_attr($objectFit));
$style_string = implode('; ', $initial_styles);

// Arrows assets (reuse existing arrow types if provided in this plugin later)
// Basic styles as CSS variables if needed
$nav_style_pairs = [
    sprintf('--nav-icon-size: %s', esc_attr($attributes['navIconSize'] ?? '24px')),
    sprintf('--nav-gap: %sem', esc_attr($attributes['navGap'] ?? 1)),
    sprintf('--nav-radius: %s', esc_attr($attributes['navRadius'] ?? '50%')),
    sprintf('--nav-padding: %sem', esc_attr($attributes['navPadding'] ?? 0.5)),
];
if (!empty($attributes['navBg'])) { $nav_style_pairs[] = sprintf('--nav-bg: %s', esc_attr($attributes['navBg'])); }
if (!empty($attributes['navColor'])) { $nav_style_pairs[] = sprintf('--nav-color: %s', esc_attr($attributes['navColor'])); }
if (!empty($attributes['navBgHover'])) { $nav_style_pairs[] = sprintf('--nav-bg-hover: %s', esc_attr($attributes['navBgHover'])); }
if (!empty($attributes['navColorHover'])) { $nav_style_pairs[] = sprintf('--nav-color-hover: %s', esc_attr($attributes['navColorHover'])); }
$nav_styles = 'style="' . implode('; ', $nav_style_pairs) . '"';

// Wrapper attributes
$arrow_position = $attributes['arrowPosition'] ?? 'center';
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'wp-block-up-bk-swiper-slider',
    'data-arrow-position' => $arrow_position,
]);

// Navigation config (support custom selectors)
$arrowType = $attributes['arrowType'] ?? 'type1';
$insertArrows = !empty($attributes['insertArrows']);
$customPrevClass = trim($attributes['customPrevClass'] ?? '');
$customNextClass = trim($attributes['customNextClass'] ?? '');
$render_default_nav = false;

// Build options to pass to Swiper via data attribute (mapped from Slick)
$opts = [
    'loop' => $infinite,
    'speed' => $speed,
    'autoplay' => $autoplay ? [ 'delay' => max(0, $autoplaySpeed) ] : false,
    'slidesPerView' => max(1, $slidesToShow),
    'slidesPerGroup' => max(1, $slidesToScroll),
    'centeredSlides' => $centerMode,
    'effect' => $fade ? 'fade' : 'slide',
    'autoHeight' => $adaptiveHeight,
    'spaceBetween' => $gap,
    'pagination' => $dots ? [ 'el' => '.swiper-pagination', 'clickable' => true ] : false,
];

if ($arrows) {
    if ($arrowType === 'custom' && $customPrevClass !== '' && $customNextClass !== '') {
        $opts['navigation'] = [
            'prevEl' => (strpos($customPrevClass, '.') === 0 ? $customPrevClass : '.' . $customPrevClass),
            'nextEl' => (strpos($customNextClass, '.') === 0 ? $customNextClass : '.' . $customNextClass),
        ];
        $render_default_nav = false;
    } else {
        $opts['navigation'] = [ 'nextEl' => '.swiper-button-next', 'prevEl' => '.swiper-button-prev' ];
        $render_default_nav = true;
    }
} else {
    $opts['navigation'] = false;
}

// Breakpoints mapping
if ($responsive && !empty($attrs['breakpoints'])) {
    $bp = [];
    if (!empty($attrs['breakpoints']['tablet']['breakpoint'])) {
        $bp[$attrs['breakpoints']['tablet']['breakpoint']] = [
            'slidesPerView' => intval($attrs['breakpoints']['tablet']['settings']['slidesToShow'] ?? $slidesToShow),
            'slidesPerGroup' => intval($attrs['breakpoints']['tablet']['settings']['slidesToScroll'] ?? $slidesToScroll),
        ];
    }
    if (!empty($attrs['breakpoints']['mobile']['breakpoint'])) {
        $bp[$attrs['breakpoints']['mobile']['breakpoint']] = [
            'slidesPerView' => intval($attrs['breakpoints']['mobile']['settings']['slidesToShow'] ?? $slidesToShow),
            'slidesPerGroup' => intval($attrs['breakpoints']['mobile']['settings']['slidesToScroll'] ?? $slidesToScroll),
        ];
    }
    if (!empty($bp)) { $opts['breakpoints'] = $bp; }
}
// Unique instance id
$instance_id = 'swiper_' . wp_generate_password(8, false, false);
?>
<div <?php echo $wrapper_attributes; ?> <?php echo $nav_styles; ?>>
    <div id="<?php echo esc_attr($instance_id); ?>" class="swiper<?php echo $fixedHeight ? ' is-fixed-height' : ''; ?>" role="region" aria-label="<?php echo esc_attr__('Image Slider', 'up-bk-swiper-slider'); ?>" data-swiper='<?php echo wp_json_encode($opts); ?>' data-pause-on-hover="<?php echo $pauseOnHover ? 'true' : 'false'; ?>" style="<?php echo esc_attr($style_string); ?>">
        <div class="swiper-wrapper">
            <?php foreach ($slides as $slide) : ?>
                <?php
                    $img_id = isset($slide['id']) ? intval($slide['id']) : 0;
                    $img_url = isset($slide['url']) ? $slide['url'] : '';
                    $img_alt = isset($slide['alt']) ? $slide['alt'] : '';
                    if ($img_id) {
                        $sized = wp_get_attachment_image_url($img_id, $imageSize);
                        if ($sized) { $img_url = $sized; }
                    }
                    $caption = '';
                    if ($showFigcaption && $img_id) {
                        $caption = wp_get_attachment_caption($img_id);
                        if (!$caption) {
                            $attachment = get_post($img_id);
                            if ($attachment) {
                                $caption = $attachment->post_excerpt ?: $attachment->post_title;
                            }
                        }
                    }
                    $img_style = trim($aspect_ratio_style . ' object-fit: ' . esc_attr($objectFit) . ';');
                ?>
                <div class="swiper-slide" tabindex="-1">
                    <figure style="<?php echo esc_attr($aspect_ratio_style); ?>">
                        <img src="<?php echo esc_url($img_url); ?>" alt="<?php echo esc_attr($img_alt); ?>" decoding="async" style="<?php echo esc_attr($img_style); ?>" />
                        <?php if ($showFigcaption && !empty($caption)) : ?>
                            <figcaption class="swiper-slide-caption"><?php echo esc_html($caption); ?></figcaption>
                        <?php endif; ?>
                    </figure>
                </div>
            <?php endforeach; ?>
        </div>
        <?php if ($dots): ?>
            <div class="swiper-pagination"></div>
        <?php endif; ?>
        <?php if ($arrows && $insertArrows): ?>
            <?php if ($render_default_nav): ?>
                <div class="swiper-button-prev" aria-label="<?php echo esc_attr__('Previous slide', 'up-bk-swiper-slider'); ?>"></div>
                <div class="swiper-button-next" aria-label="<?php echo esc_attr__('Next slide', 'up-bk-swiper-slider'); ?>"></div>
            <?php elseif ($arrowType === 'custom' && $customPrevClass !== '' && $customNextClass !== ''): ?>
                <?php
                    $prev_class_attr = strpos($customPrevClass, '.') === 0 ? substr($customPrevClass, 1) : $customPrevClass;
                    $next_class_attr = strpos($customNextClass, '.') === 0 ? substr($customNextClass, 1) : $customNextClass;
                ?>
                <div class="swiper-arrow is-prev <?php echo esc_attr($prev_class_attr); ?>" aria-label="<?php echo esc_attr__('Previous slide', 'up-bk-swiper-slider'); ?>"></div>
                <div class="swiper-arrow is-next <?php echo esc_attr($next_class_attr); ?>" aria-label="<?php echo esc_attr__('Next slide', 'up-bk-swiper-slider'); ?>"></div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>
<?php /* Initialization handled by build/index.js */ ?>
