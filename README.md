# UP BK Swiper Slider (drop-in)

Drop-in replacement for UP BK Slick Slider using Swiper v11. Keeps the same block name `up-bk/slick-slider` for compatibility.

## Installation
- Place the plugin in `wp-content/plugins/up-bk-swiper-slider`
- `npm install`
- `npm run build`
- Activate the plugin in WordPress

## Block registration
- Block name: `up-bk/slick-slider`
- Assets loaded from `build/index.js` and `build/index.css`
- Server-side rendering file copied to `build/render.php` on build

## Usage
Insert the block "UP Swiper Slider (drop-in)" and configure:

### Images source
- Custom Gallery (media picker)
- Post Images (auto from current post attachments)
- Meta (IDs CSV)

### Core settings
- Slides to show/scroll, gap, speed, loop, fade, center, adaptive height
- Autoplay + delay
- Dots (pagination)
- Fixed height (CSS var `--slide-height`)

### Navigation
- `arrows` (on/off)
- `arrowType`: `type1`, `type2`, or `custom`
- `insertArrows` (default true):
  - If true and `arrowType` ≠ `custom`: renders Swiper default buttons `.swiper-button-prev/.swiper-button-next`
  - If true and `arrowType` = `custom`: renders helper elements with your classes
  - If false: you must provide your own elements in the DOM
- `customPrevClass` / `customNextClass`: when `arrowType = custom`, provide classes or selectors (e.g. `.my-prev`, `.my-next`). These are used as `prevEl` / `nextEl` for Swiper.

### Responsive
- Toggle responsive and tune Tablet/Mobile breakpoint options (slides to show/scroll, autoplay, dots, arrows, speed, fade, gap, fixed height, object-fit).

## Styling (CSS variables)
Navigation styles use CSS variables applied on the wrapper:
- `--nav-icon-size` (default 24px)
- `--nav-radius` (default 50%)
- `--nav-padding` (default 0.5em)
- `--nav-gap` (default 1em)

These apply to:
- Swiper default buttons: `.swiper-button-prev/.swiper-button-next`
- Custom helpers: `.swiper-arrow.is-prev/.swiper-arrow.is-next` (and your custom classes)

Example theme CSS:
```css
.gros-btn-right, .gros-btn-left {
  display: inline-flex;
  width: 3rem; height: 3rem;
  background: #2B231F; color: #fff;
  align-items: center; justify-content: center;
}
```

## Build
- `npm run build` builds assets and copies `src/render.php` to `build/`

## Notes
- Do not activate the original `up-bk-slick-slider` at the same time (same block name).
- Swiper modules: Navigation, Pagination, EffectFade, Autoplay imported from `swiper/modules`.
