<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/api.php';

$selectedBrand = isset($_GET['brand']) ? trim((string)$_GET['brand']) : '';
$brands = fetch_vehicle_brands();
$vehicles = fetch_vehicles(1, 12, $selectedBrand !== '' ? $selectedBrand : null);

$heroVehicle = $vehicles[0] ?? null;
$heroPhoto = $heroVehicle ? photo_url(first_photo_filename($heroVehicle)) : null;
$heroTransLabel = $heroVehicle ? transmission_label($heroVehicle['transmission'] ?? null) : null;
$heroFuelLabel = $heroVehicle ? fuel_label($heroVehicle['fuel_type'] ?? null) : null;

$aboutVehicle = $vehicles[1] ?? $heroVehicle;
$aboutPhoto = $aboutVehicle ? photo_url(first_photo_filename($aboutVehicle)) : null;

$pageTitle = SITE_NAME . ' — سيارات مفحوصة فنياً وتقسيط مرن';
require __DIR__ . '/includes/header-light.php';
?>

<section class="lt-hero" id="top">
  <?php if ($heroPhoto): ?>
    <img class="lt-hero-photo" src="<?= e($heroPhoto) ?>" alt="" onerror="this.style.display='none';">
  <?php endif; ?>
  <div class="lt-hero-scrim"></div>
  <h1 class="lt-hero-word">ثقة</h1>
  <div class="lt-hero-specs">
    <div class="lt-hero-spec">
      <span>المسافة المقطوعة</span>
      <strong><?= ($heroVehicle && isset($heroVehicle['mileage']) && $heroVehicle['mileage'] !== null) ? e(number_format((float)$heroVehicle['mileage'])) . ' كم' : '—' ?></strong>
    </div>
    <div class="lt-hero-spec">
      <span>ناقل الحركة</span>
      <strong><?= e($heroTransLabel ?? '—') ?></strong>
    </div>
    <div class="lt-hero-spec">
      <span>نوع الوقود</span>
      <strong><?= e($heroFuelLabel ?? '—') ?></strong>
    </div>
    <div class="lt-hero-spec">
      <span>اللون</span>
      <strong><?= e($heroVehicle['color'] ?? '—') ?></strong>
    </div>
  </div>
  <a href="#about" class="lt-hero-scroll" aria-label="انزل للأسفل"><?= icon('chevron-down') ?></a>
</section>

<section class="lt-about" id="about">
  <div class="lt-about-copy" data-reveal>
    <h2>عن الأصدقاء</h2>
    <p>
      نستورد كل سيارة ونفحصها فنيًا بعناية قبل عرضها بصالتنا، ونوثّق كل عملية بيع بعقد رسمي —
      مع خيار تقسيط مريح حتى عشرة أشهر يرفع تجربتك لمستوى جديد من الثقة والاطمئنان.
    </p>
    <div class="lt-about-stats">
      <div class="lt-about-stat">
        <?= icon('file-check') ?>
        <strong>فحص وتوثيق</strong>
      </div>
      <div class="lt-about-stat">
        <?= icon('calendar-clock') ?>
        <strong>تقسيط مرن</strong>
      </div>
      <div class="lt-about-stat">
        <?= icon('shield-check') ?>
        <strong>عقد رسمي</strong>
      </div>
    </div>
    <a href="#cars" class="lt-btn lt-btn-outline lt-btn-sm" style="border-color:#111;color:#111;">تصفّح سياراتنا ←</a>
  </div>
  <div class="lt-about-photo" data-reveal>
    <?php if ($aboutPhoto): ?>
      <img src="<?= e($aboutPhoto) ?>" alt="" onerror="this.onerror=null;this.src='/assets/images/fallback_car.png';this.className='lt-about-fallback';">
    <?php else: ?>
      <img src="/assets/images/fallback_car.png" alt="" class="lt-about-fallback">
    <?php endif; ?>
  </div>
</section>

<section class="lt-cars" id="cars">
  <div class="lt-cars-head">
    <div>
      <h2>سيارات مختارة لك</h2>
      <p>كل سيارة بمخزوننا مفحوصة فنيًا وجاهزة للمعاينة</p>
    </div>
  </div>

  <?php if (!empty($brands)): ?>
    <div class="lt-filter-tabs">
      <a href="/index-light.php#cars" class="lt-filter-tab<?= $selectedBrand === '' ? ' active' : '' ?>">الكل</a>
      <?php foreach ($brands as $b): ?>
        <a href="?brand=<?= urlencode($b) ?>#cars" class="lt-filter-tab<?= $selectedBrand === $b ? ' active' : '' ?>"><?= e($b) ?></a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <?php if (empty($vehicles)): ?>
    <div class="lt-cars-empty"><p><?= $selectedBrand !== '' ? 'ما فيه سيارات متوفرة حاليًا لهذي الماركة' : 'لا توجد سيارات معروضة حاليًا، تابعونا قريبًا لأحدث الوصولات' ?></p></div>
  <?php else: ?>
    <div class="lt-car-grid" data-reveal-group>
      <?php foreach ($vehicles as $car):
        $photo = photo_url(first_photo_filename($car));
        $title = trim(($car['brand'] ?? '') . ' ' . ($car['model'] ?? ''));
        $condLabel = !empty($car['condition']) ? condition_label($car['condition']) : 'متوفرة';
      ?>
        <a href="/car.php?id=<?= urlencode($car['id']) ?>" class="lt-car-card" data-reveal>
          <div class="lt-car-photo">
            <?php if ($photo): ?>
              <img src="<?= e($photo) ?>" alt="<?= e($title) ?>" onerror="this.onerror=null;this.src='/assets/images/fallback_car.png';this.className='lt-car-fallback';">
            <?php else: ?>
              <img src="/assets/images/fallback_car.png" alt="" class="lt-car-fallback">
            <?php endif; ?>
            <span class="lt-car-badge"><?= e($condLabel) ?></span>
          </div>
          <div class="lt-car-body">
            <h3><?= e($title) ?></h3>
            <p><?= e(car_description($car)) ?></p>
            <div class="lt-car-specs">
              <?php if (isset($car['mileage']) && $car['mileage'] !== null): ?>
                <span class="lt-spec-pill"><?= icon('gauge') ?> <?= e(number_format((float)$car['mileage'])) ?> كم</span>
              <?php endif; ?>
              <?php if (!empty($car['transmission'])): ?>
                <span class="lt-spec-pill"><?= icon('settings') ?> <?= e(transmission_label($car['transmission'])) ?></span>
              <?php endif; ?>
            </div>
            <span class="lt-car-link">التفاصيل الكاملة <?= icon('arrow-up-left') ?></span>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<section class="lt-cta-band" data-reveal>
  <h2>سيارتك المناسبة بانتظارك بمعرض الأصدقاء</h2>
  <a href="#visit" class="lt-btn lt-btn-solid lt-btn-lg">تواصل معنا الآن</a>
</section>

<section class="lt-visit" id="visit">
  <div class="lt-lead-box" data-reveal>
    <h3>تواصل معنا</h3>
    <p>اترك رقمك وراح يتواصل معك فريق المبيعات لمساعدتك باختيار السيارة المناسبة.</p>
    <form method="post" action="/submit-lead.php">
      <input type="hidden" name="return_to" value="/index-light.php">
      <div class="lt-field">
        <label>الاسم</label>
        <input type="text" name="name" required placeholder="اسمك الكامل">
      </div>
      <div class="lt-field">
        <label>رقم الهاتف</label>
        <input type="tel" name="phone" required placeholder="07xxxxxxxxx" dir="ltr" style="text-align:right">
      </div>
      <div class="lt-field">
        <label>ملاحظة (اختياري)</label>
        <textarea name="message" rows="2" placeholder="أي تفاصيل إضافية..."></textarea>
      </div>
      <button class="lt-submit" type="submit">إرسال الطلب</button>
    </form>
  </div>
</section>

<?php require __DIR__ . '/includes/footer-light.php'; ?>
