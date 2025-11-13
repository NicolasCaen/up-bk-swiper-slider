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
  document.querySelectorAll('.wp-block-up-bk-slick-slider .swiper').forEach(initSwiper);
});
