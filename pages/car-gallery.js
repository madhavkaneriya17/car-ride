/**
 * Professional Tata Curvv EV Multi-Angle Image Gallery Controller
 * Seamless angle switching, preloading, touch swipe, keyboard navigation & lightbox inspection
 */

export const CURVV_ANGLES = [
  {
    index: 0,
    id: 'side',
    title: 'Side View',
    label: 'Side',
    src: '../public/assets/images/tata-curvv-ev-side.png',
    fallbackSrc: '../public/images/cars/tata-curvv-ev-side.png',
    alt: 'Tata Curvv EV - Side view',
    caption: 'Side view: Streamlined coupe-SUV silhouette with flush door handles and aerodynamic alloy design.'
  },
  {
    index: 1,
    id: 'front-three-quarter',
    title: 'Front Three-Quarter',
    label: 'Front 3/4',
    src: '../public/assets/images/tata-curvv-ev-front-three-quarter.png',
    fallbackSrc: '../public/images/cars/tata-curvv-ev-front-three-quarter.png',
    alt: 'Tata Curvv EV - Front three-quarter view',
    caption: 'Front 3/4 view: Muscular raised bonnet, sculpted wheel arches, and bold SUV front presence.'
  },
  {
    index: 2,
    id: 'front',
    title: 'Front View',
    label: 'Front',
    src: '../public/assets/images/tata-curvv-ev-front.png',
    fallbackSrc: '../public/images/cars/tata-curvv-ev-front.png',
    alt: 'Tata Curvv EV - Front view',
    caption: 'Front view: Full-width horizon LED light bar, closed-off EV aero grille, and sleek lower air dam.'
  },
  {
    index: 3,
    id: 'rear',
    title: 'Rear View',
    label: 'Rear',
    src: '../public/assets/images/tata-curvv-ev-rear.png',
    fallbackSrc: '../public/images/cars/tata-curvv-ev-rear.png',
    alt: 'Tata Curvv EV - Rear view',
    caption: 'Rear view: Continuous end-to-end LED taillamp strip, dual spoiler styling, and upright boot stance.'
  },
  {
    index: 4,
    id: 'rear-three-quarter',
    title: 'Rear Three-Quarter',
    label: 'Rear 3/4',
    src: '../public/assets/images/tata-curvv-ev-rear-three-quarter.png',
    fallbackSrc: '../public/images/cars/tata-curvv-ev-rear-three-quarter.png',
    alt: 'Tata Curvv EV - Rear three-quarter view',
    caption: 'Rear 3/4 view: Dramatic fastback roofline descending gracefully into an athletic rear deck.'
  }
];

export function initCarGallery(options = {}) {
  const container = options.container || document.getElementById('curvv-showcase');
  if (!container) return;

  const mainImg = container.querySelector('#main-car-img');
  const angleTagText = container.querySelector('#angle-tag-text');
  const viewIndicator = container.querySelector('#view-indicator');
  const prevBtn = container.querySelector('#car-prev-btn');
  const nextBtn = container.querySelector('#car-next-btn');
  const thumbBtns = container.querySelectorAll('.thumb-btn');
  const stageEl = container.querySelector('.car-stage');
  const lightboxModal = document.getElementById('car-lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-car-img');
  const lightboxAngleTitle = document.getElementById('lightbox-angle-title');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCloseBtn = document.getElementById('close-lightbox-btn');
  const openLightboxBtn = container.querySelector('#open-lightbox-btn');
  const stageZoomHint = container.querySelector('#stage-zoom-hint');

  let currentIndex = 0;

  // Preload all 5 angles for instantaneous switching with zero flicker
  CURVV_ANGLES.forEach(angle => {
    const imgObj = new Image();
    imgObj.src = angle.src;
    imgObj.onerror = () => { imgObj.src = angle.fallbackSrc; };
  });

  function setAngle(newIndex, withTransition = true) {
    if (newIndex < 0) newIndex = CURVV_ANGLES.length - 1;
    if (newIndex >= CURVV_ANGLES.length) newIndex = 0;
    currentIndex = newIndex;

    const angleData = CURVV_ANGLES[currentIndex];

    // Update Indicators
    if (viewIndicator) {
      viewIndicator.textContent = `Angle ${currentIndex + 1} of 5`;
    }
    if (angleTagText) {
      angleTagText.textContent = angleData.title;
    }

    // Update Thumbnails
    thumbBtns.forEach((btn, idx) => {
      const isActive = idx === currentIndex;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update Main Image with smooth transition
    if (mainImg) {
      if (withTransition) {
        mainImg.classList.add('switching');
        setTimeout(() => {
          mainImg.src = angleData.src;
          mainImg.alt = angleData.alt;
          mainImg.onerror = () => { mainImg.src = angleData.fallbackSrc; };
          mainImg.classList.remove('switching');
        }, 120);
      } else {
        mainImg.src = angleData.src;
        mainImg.alt = angleData.alt;
      }
    }

    // Update Lightbox if open
    if (lightboxModal && lightboxModal.classList.contains('active')) {
      if (lightboxImg) {
        lightboxImg.src = angleData.src;
        lightboxImg.alt = angleData.alt;
      }
      if (lightboxAngleTitle) {
        lightboxAngleTitle.textContent = `${angleData.title} (${currentIndex + 1}/5)`;
      }
      if (lightboxCaption) {
        lightboxCaption.textContent = angleData.caption;
      }
    }

    // Update active state in spec list if present (car-details page)
    const specItems = document.querySelectorAll('.angle-spec-item');
    specItems.forEach((item, idx) => {
      item.classList.toggle('active', idx === currentIndex);
    });
  }

  // Prev / Next Buttons
  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setAngle(currentIndex - 1);
  });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setAngle(currentIndex + 1);
  });

  // Thumbnail Click Handlers
  thumbBtns.forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setAngle(idx);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setAngle(idx);
      }
    });
  });

  // Spec List Items (in car-details.html)
  const specItems = document.querySelectorAll('.angle-spec-item');
  specItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
      setAngle(idx);
    });
  });

  // Touch Swipe Gesture for Mobile Viewports
  let touchStartX = 0;
  let touchEndX = 0;

  stageEl?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  stageEl?.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 40;
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swiped Left -> Next
      setAngle(currentIndex + 1);
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      // Swiped Right -> Prev
      setAngle(currentIndex - 1);
    }
  }

  // Lightbox Open & Close Logic
  function openLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.add('active');
    setAngle(currentIndex, false);
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  openLightboxBtn?.addEventListener('click', openLightbox);
  stageZoomHint?.addEventListener('click', (e) => {
    e.stopPropagation();
    openLightbox();
  });
  stageEl?.addEventListener('click', (e) => {
    if (e.target.closest('.gallery-nav-btn') || e.target.closest('.stage-zoom-hint')) return;
    openLightbox();
  });

  lightboxCloseBtn?.addEventListener('click', closeLightbox);
  lightboxModal?.addEventListener('click', (e) => {
    if (e.target === lightboxModal || e.target.classList.contains('lightbox-body')) {
      closeLightbox();
    }
  });

  // Keyboard Navigation: Left & Right Arrows, Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      setAngle(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      setAngle(currentIndex + 1);
    } else if (e.key === 'Escape') {
      closeLightbox();
    }
  });

  // Lightbox prev/next buttons
  document.getElementById('lightbox-prev-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setAngle(currentIndex - 1);
  });
  document.getElementById('lightbox-next-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setAngle(currentIndex + 1);
  });

  // Initial render
  setAngle(0, false);
}
