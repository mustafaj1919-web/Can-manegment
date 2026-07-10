<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/api.php';

$vehicles = fetch_vehicles(1, 24);

// أحدث سيارة لعرضها بخلفية الهيرو
$heroVehicle = null;
foreach ($vehicles as $v) {
    $heroVehicle = $v;
    break;
}
$heroPhoto = $heroVehicle ? photo_url(first_photo_filename($heroVehicle)) : null;

// فيديوهات الهيرو: تُعرض مباشرة من يوتيوب (embed) بدل تخزينها محلياً على السيرفر
// كل فيديو مربوط باسم الشركة المصنّعة المالكة للمحتوى — يظهر كملاحظة توضيحية تحت الفيديو
$videoDir = __DIR__ . '/assets/videos/';
$videoCandidates = [
    ['title' => 'BYD Seal', 'youtube' => '50PU-cQx7j0', 'poster' => 'hero.jpg', 'owner' => 'BYD'],
    ['title' => 'Chevrolet Tahoe 2025', 'youtube' => 'aBnWZo0Zez4', 'poster' => 'chevrolet-tahoe.jpg', 'owner' => 'Chevrolet'],
    ['title' => 'Kia Sorento', 'youtube' => 'KcfQdjZplng', 'poster' => 'kia-sorento.jpg', 'owner' => 'Kia'],
    ['title' => 'Kia Sportage', 'youtube' => 'V3K2CTIriFA', 'poster' => 'kia-sportage.jpg', 'owner' => 'Kia'],
];
$videoGallery = VIDEOS_ENABLED
    ? array_values(array_filter($videoCandidates, function ($v) use ($videoDir) {
        return file_exists($videoDir . 'posters/' . $v['poster']);
    }))
    : [];

$pageTitle = SITE_NAME . ' — سيارات مفحوصة فنياً وتقسيط مرن';
require __DIR__ . '/includes/header.php';
?>

<section class="hero-cinematic" id="top">
  <?php if (!empty($videoGallery)): ?>
    <div class="hero-carousel">
      <?php foreach ($videoGallery as $i => $v): ?>
        <div class="hero-carousel-slide<?= $i === 0 ? ' active' : '' ?>"
             data-youtube-id="<?= e($v['youtube']) ?>"
             style="background-image:url('/assets/videos/posters/<?= e($v['poster']) ?>')"></div>
      <?php endforeach; ?>
    </div>
  <?php elseif ($heroPhoto): ?>
    <img class="hero-bg-photo" src="<?= e($heroPhoto) ?>" alt="" onerror="this.style.display='none';">
  <?php endif; ?>
  <div class="hero-scrim"></div>
  <div class="hero-inner">
    <h1>تجربة شراء سيارة<br>بمستوى جديد</h1>
    <p class="hero-lead">
      نستورد كل سيارة ونفحصها فنيًا بعناية قبل وصولها لصالة العرض، ونمنحك خيار التقسيط
      المريح حتى عشرة أشهر بثقة الأصدقاء.
    </p>
    <div class="hero-ctas">
      <a href="#cars" class="btn-outline">تصفّح سياراتنا</a>
      <a href="#visit" class="btn-solid">تواصل معنا</a>
    </div>
  </div>
  <?php if (count($videoGallery) > 1): ?>
    <div class="hero-carousel-dots">
      <?php foreach ($videoGallery as $i => $v): ?>
        <button type="button" class="hero-dot<?= $i === 0 ? ' active' : '' ?>" data-index="<?= $i ?>" aria-label="<?= e($v['title']) ?>"></button>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<section class="vision-section" id="vision">
  <h2 data-reveal>رؤيتنا</h2>
  <p data-reveal>
    أن نكون الوجهة الرائدة في العراق لبيع السيارات وخدمات ما بعد البيع، عبر توفير أحدث
    الطرازات العالمية بأسعار منافسة وحلول تقسيط شاملة ترفع تجربة العميل إلى مستويات جديدة
    من الراحة والاطمئنان.
  </p>
  <p data-reveal>
    نفحص كل سيارة فنيًا قبل عرضها، ونوثّق كل عملية بيع بعقد رسمي — مع الحفاظ على أعلى درجات
    الشفافية والاحترافية في كل تعامل.
  </p>
</section>

<section class="cars-story" id="cars">
  <div class="story-heading"><span class="dash-title">سياراتنا المختارة</span></div>

  <?php if (empty($vehicles)): ?>
    <div class="story-empty"><p>لا توجد سيارات معروضة حاليًا، تابعونا قريبًا لأحدث الوصولات</p></div>
  <?php else: ?>
    <?php foreach ($vehicles as $index => $car):
      $photo = photo_url(first_photo_filename($car));
      $title = trim(($car['brand'] ?? '') . ' ' . ($car['model'] ?? ''));
      $reversed = $index % 2 === 1;
      $condLabel = !empty($car['condition']) ? condition_label($car['condition']) : 'متوفرة';
    ?>
      <article class="car-story-block<?= $reversed ? ' reversed' : '' ?>" data-reveal>
        <div class="car-story-photo">
          <?php if ($photo): ?>
            <img src="<?= e($photo) ?>" alt="<?= e($title) ?>" onerror="this.onerror=null;this.src='/assets/images/fallback_car.png';this.className='car-story-fallback';">
          <?php else: ?>
            <img src="/assets/images/fallback_car.png" alt="" class="car-story-fallback">
          <?php endif; ?>
        </div>
        <div class="car-story-copy">
          <h3><?= e($title) ?></h3>
          <span class="car-story-tag"><?= e($condLabel) ?></span>
          <p><?= e(car_description($car)) ?></p>
          <div class="car-story-specs">
            <?php if (isset($car['mileage']) && $car['mileage'] !== null): ?>
              <span class="spec-pill"><?= icon('gauge') ?> <?= e(number_format((float)$car['mileage'])) ?> كم</span>
            <?php endif; ?>
            <?php if (!empty($car['transmission'])): ?>
              <span class="spec-pill"><?= icon('settings') ?> <?= e(transmission_label($car['transmission'])) ?></span>
            <?php endif; ?>
            <?php if (!empty($car['fuel_type'])): ?>
              <span class="spec-pill"><?= icon('fuel') ?> <?= e(fuel_label($car['fuel_type'])) ?></span>
            <?php endif; ?>
          </div>
          <div class="car-story-actions">
            <a href="/car.php?id=<?= urlencode($car['id']) ?>#contact-form" class="btn-outline-sm">تواصل للاستفسار</a>
            <a href="/car.php?id=<?= urlencode($car['id']) ?>" class="btn-link-sm">
              التفاصيل الكاملة <?= icon('arrow-left') ?>
            </a>
          </div>
        </div>
      </article>
    <?php endforeach; ?>
  <?php endif; ?>
</section>

<?php if (!empty($videoGallery)): ?>
<section class="video-gallery" id="videos">
  <div class="story-heading"><span class="dash-title">شاهد بالفيديو</span></div>
  <p class="video-gallery-note">فيديوهات تعريفية من إنتاج الشركات المصنّعة، نعرضها لأغراض توضيحية فقط</p>
  <div class="video-grid" data-reveal-group>
    <?php foreach ($videoGallery as $i => $v): ?>
      <div class="video-card-wrap" data-reveal>
        <button type="button" class="video-card"
                data-youtube-id="<?= e($v['youtube']) ?>"
                data-video-title="<?= e($v['title']) ?>">
          <img src="/assets/videos/posters/<?= e($v['poster']) ?>" alt="<?= e($v['title']) ?>">
          <span class="video-card-scrim"></span>
          <span class="video-card-play">
            <span><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg></span>
          </span>
          <span class="video-card-title"><?= e($v['title']) ?></span>
        </button>
        <?php if (!empty($v['owner'])): ?>
          <span class="video-card-owner">المحتوى ملك <?= e($v['owner']) ?></span>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<div class="video-lightbox" id="video-lightbox">
  <div class="video-lightbox-inner">
    <button type="button" class="video-lightbox-close" id="video-lightbox-close" aria-label="إغلاق">
      <?= icon('x') ?>
    </button>
    <div class="video-lightbox-frame" id="video-lightbox-player"></div>
  </div>
</div>
<?php endif; ?>

<section class="trust-section" id="why-us">
  <span class="tag-pill">لماذا الأصدقاء</span>
  <h2>ثقة تُبنى بالتفاصيل، لا بالوعود</h2>
  <div class="trust-grid" data-reveal-group>
    <div class="trust-card" data-reveal>
      <?= icon('file-check') ?>
      <strong>فحص وتوثيق</strong>
      <span>كل سيارة تُفحص فنيًا وتُوثّق بالكامل قبل عرضها للبيع</span>
    </div>
    <div class="trust-card" data-reveal>
      <?= icon('shield-check') ?>
      <strong>عقد رسمي</strong>
      <span>عقد بيع موثّق يحفظ حقوق الطرفين في كل صفقة</span>
    </div>
  </div>
</section>

<section class="cars-story" id="visit" style="padding-top:0;padding-bottom:100px;max-width:520px;">
  <div class="lead-box" data-reveal>
    <h3>تواصل معنا</h3>
    <p>اترك رقمك وراح يتواصل معك فريق المبيعات لمساعدتك باختيار السيارة المناسبة.</p>
    <form method="post" action="/submit-lead.php">
      <input type="hidden" name="return_to" value="/index.php">
      <div class="lead-field">
        <label>الاسم</label>
        <input type="text" name="name" required placeholder="اسمك الكامل">
      </div>
      <div class="lead-field">
        <label>رقم الهاتف</label>
        <input type="tel" name="phone" required placeholder="07xxxxxxxxx" dir="ltr" style="text-align:right">
      </div>
      <div class="lead-field">
        <label>ملاحظة (اختياري)</label>
        <textarea name="message" rows="2" placeholder="أي تفاصيل إضافية..."></textarea>
      </div>
      <button class="lead-submit" type="submit">إرسال الطلب</button>
    </form>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
