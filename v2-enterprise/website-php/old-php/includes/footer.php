<footer class="story-footer">
  <div class="footer-top">
    <div class="footer-contact">
      <h3>تواصل معنا</h3>
      <?php foreach (CONTACT_LINES as $line): ?>
        <div class="visit-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span><?= e($line['name']) ?>: <bdi class="ltr-nums"><?= e($line['phone']) ?></bdi></span>
        </div>
      <?php endforeach; ?>
      <div class="visit-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <span><?= e(SHOWROOM_ADDRESS) ?></span>
      </div>
      <div class="visit-row">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span>يوميًا 9 صباحًا – 8 مساءً</span>
      </div>
    </div>
    <div class="footer-links">
      <h3>روابط سريعة</h3>
      <a href="/index.php#top">الرئيسية</a>
      <a href="/index.php#cars">سياراتنا</a>
      <a href="/index.php#vision">رؤيتنا</a>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2026 <?= e(SITE_NAME) ?> — جميع الحقوق محفوظة</span>
  </div>
</footer>

<a href="<?= e(WHATSAPP_LINK) ?>" target="_blank" rel="noopener" class="whatsapp-float" aria-label="تواصل عبر واتساب">
  <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2Zm0 18.14h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.26-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.24-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.16 1.73 2.65 4.2 3.71.59.25 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.16-.48-.28Z"/></svg>
</a>

<script>
(function () {
  var flash = document.querySelector('.flash-banner');
  if (flash) {
    setTimeout(function () { flash.style.display = 'none'; }, 6000);
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // حركات الظهور عند التمرير
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (!reduceMotion && 'IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // فيديوهات يوتيوب: بناء رابط embed موحّد لكل فيديو
  function youtubeEmbedSrc(id, extra) {
    return 'https://www.youtube.com/embed/' + id + '?' + extra;
  }

  // دورة فيديوهات الهيرو (كاروسيل تلقائي + نقاط تنقّل) — كل فيديو يحمّل iframe يوتيوب فقط وقت ظهوره
  var heroSlides = document.querySelectorAll('.hero-carousel-slide');
  var heroDots = document.querySelectorAll('.hero-dot');
  if (heroSlides.length) {
    var heroCurrent = 0;
    var heroTimer = null;

    function heroLoad(index) {
      var slide = heroSlides[index];
      if (slide.querySelector('iframe')) return;
      var id = slide.getAttribute('data-youtube-id');
      var iframe = document.createElement('iframe');
      iframe.src = youtubeEmbedSrc(id, 'autoplay=1&mute=1&loop=1&playlist=' + id +
        '&controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1');
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      iframe.setAttribute('title', slide.getAttribute('data-youtube-id'));
      slide.appendChild(iframe);
    }

    function heroUnload(index) {
      var iframe = heroSlides[index].querySelector('iframe');
      if (iframe) iframe.remove();
    }

    function heroGoTo(index) {
      if (index === heroCurrent) return;
      heroSlides[heroCurrent].classList.remove('active');
      heroUnload(heroCurrent);
      if (heroDots[heroCurrent]) heroDots[heroCurrent].classList.remove('active');

      heroCurrent = index;
      heroSlides[heroCurrent].classList.add('active');
      if (heroDots[heroCurrent]) heroDots[heroCurrent].classList.add('active');
      if (!reduceMotion) heroLoad(heroCurrent);
    }

    function heroNext() { heroGoTo((heroCurrent + 1) % heroSlides.length); }

    if (!reduceMotion) {
      heroLoad(0);
      if (heroSlides.length > 1) {
        heroTimer = setInterval(heroNext, 6000);
      }
    }

    heroDots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        heroGoTo(i);
        if (heroTimer) {
          clearInterval(heroTimer);
          heroTimer = setInterval(heroNext, 6000);
        }
      });
    });
  }

  // معرض الفيديو: فتح/إغلاق نافذة العرض (lightbox) بفيديو يوتيوب
  var lightbox = document.getElementById('video-lightbox');
  var lightboxPlayer = document.getElementById('video-lightbox-player');
  var lightboxClose = document.getElementById('video-lightbox-close');

  function openLightbox(youtubeId) {
    if (!lightbox || !lightboxPlayer) return;
    var iframe = document.createElement('iframe');
    iframe.src = youtubeEmbedSrc(youtubeId, 'autoplay=1&rel=0&modestbranding=1');
    iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('title', youtubeId);
    lightboxPlayer.innerHTML = '';
    lightboxPlayer.appendChild(iframe);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox || !lightboxPlayer) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lightboxPlayer.innerHTML = '';
  }

  document.querySelectorAll('.video-card').forEach(function (card) {
    card.addEventListener('click', function () {
      openLightbox(card.getAttribute('data-youtube-id'));
    });
  });
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('open')) closeLightbox();
  });
})();
</script>
</body>
</html>
