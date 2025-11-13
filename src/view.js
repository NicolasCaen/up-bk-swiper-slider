import Swiper from 'swiper';
import { Navigation, Pagination, EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

function initSwiper(el){
  const confAttr = el.getAttribute('data-swiper');
  let opts = {};
  try { opts = confAttr ? JSON.parse(confAttr) : {}; } catch(e) {}

  // Ensure modules
  Swiper.use([Navigation, Pagination, EffectFade, Autoplay]);

  // Scope navigation selectors to this slider when possible to avoid cross-binding
  if (opts && opts.navigation) {
    const nav = opts.navigation === true ? {} : { ...opts.navigation };
    if (nav.prevEl && typeof nav.prevEl === 'string') {
      const localPrev = el.querySelector(nav.prevEl);
      nav.prevEl = localPrev || document.querySelector(nav.prevEl);
    }
    if (nav.nextEl && typeof nav.nextEl === 'string') {
      const localNext = el.querySelector(nav.nextEl);
      nav.nextEl = localNext || document.querySelector(nav.nextEl);
    }
    opts.navigation = nav;
  }

  // Pause on hover support
  if (opts.autoplay && el.dataset.pauseOnHover === 'true') {
    opts.on = opts.on || {};
    const prevInit = opts.on.init;
    opts.on.init = function(sw){
      if (typeof prevInit === 'function') prevInit(sw);
      el.addEventListener('mouseenter', () => sw.autoplay?.stop?.());
      el.addEventListener('mouseleave', () => sw.autoplay?.start?.());
    };
  }

  new Swiper(el, opts);
}

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.wp-block-up-bk-swiper-slider .swiper').forEach(initSwiper);
});
