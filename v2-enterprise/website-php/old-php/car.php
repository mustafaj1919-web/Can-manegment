<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/helpers.php';
require __DIR__ . '/includes/api.php';

$id = $_GET['id'] ?? '';
$car = $id !== '' ? fetch_vehicle_by_id($id) : null;

$pageTitle = $car ? trim(($car['brand'] ?? '') . ' ' . ($car['model'] ?? '')) . ' — ' . SITE_NAME : SITE_NAME;
require __DIR__ . '/includes/header.php';

if (!$car): ?>
  <div class="state-container">
    <?= icon('alert-circle') ?>
    <p>عذراً، تعذر تحميل بيانات السيارة أو أنها غير متوفرة حالياً</p>
    <a href="/index.php#cars" class="btn-outline-sm">العودة للكتالوج</a>
  </div>
<?php else:
  $photos = $car['images'] ?? [];
  $coverUrl = !empty($photos) ? photo_url($photos[0]['filename']) : null;

  $title = trim(($car['brand'] ?? '') . ' ' . ($car['model'] ?? ''));
  $subtitle = trim((!empty($car['trim']) ? $car['trim'] . ' ' : '') . ($car['year'] ?? ''));
  $condLabel = !empty($car['condition']) ? condition_label($car['condition']) : 'متوفرة';
  $transLabel = transmission_label($car['transmission'] ?? null);
  $fuelLbl = fuel_label($car['fuel_type'] ?? null);
  $story = car_description($car);
?>
  <div class="detail-back-bar">
    <a href="/index.php#cars" class="back-link"><?= icon('arrow-right') ?> العودة للكتالوج</a>
  </div>

  <section class="detail-hero">
    <?php if ($coverUrl): ?>
      <img src="<?= e($coverUrl) ?>" alt="<?= e($title) ?>" class="detail-hero-img" onerror="this.onerror=null;this.src='/assets/images/fallback_car.png';this.className='detail-hero-fallback';">
    <?php else: ?>
      <img src="/assets/images/fallback_car.png" alt="" class="detail-hero-fallback">
    <?php endif; ?>
    <div class="detail-hero-scrim"></div>
    <div class="detail-hero-copy">
      <span class="car-condition-badge"><?= e($condLabel) ?></span>
      <h1 class="car-title"><?= e($title) ?></h1>
      <p class="car-subtitle"><?= e($subtitle) ?></p>
    </div>
  </section>

  <?php if (count($photos) > 1): ?>
    <div class="gallery-thumbs-row">
      <?php foreach (array_slice($photos, 0, 6) as $photo): ?>
        <div class="thumb-btn"><img src="<?= e(photo_url($photo['filename'])) ?>" alt="صورة مصغرة للسيارة" onerror="this.parentElement.style.display='none';"></div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <main class="detail-content">
    <section class="detail-story-col">
      <h2 class="section-label" data-reveal>عن هذه السيارة</h2>
      <p class="car-story-text" data-reveal><?= e($story) ?></p>

      <div class="detail-specs-grid" data-reveal>
        <div class="spec-card">
          <?= icon('gauge') ?>
          <div><span>المسافة المقطوعة</span><strong><?= isset($car['mileage']) && $car['mileage'] !== null ? e(number_format((float)$car['mileage'])) . ' كم' : '—' ?></strong></div>
        </div>
        <div class="spec-card">
          <?= icon('settings') ?>
          <div><span>حجم المحرك</span><strong><?= e($car['engine'] ?? '—') ?></strong></div>
        </div>
        <div class="spec-card">
          <?= icon('fuel') ?>
          <div><span>نوع الوقود</span><strong><?= e($fuelLbl ?? '—') ?></strong></div>
        </div>
        <div class="spec-card">
          <?= icon('palette') ?>
          <div><span>اللون الخارجي</span><strong><?= e($car['color'] ?? '—') ?></strong></div>
        </div>
        <div class="spec-card">
          <?= icon('armchair') ?>
          <div><span>عدد المقاعد</span><strong><?= e((string)($car['seat_count'] ?? '—')) ?></strong></div>
        </div>
        <div class="spec-card">
          <?= icon('shield-check') ?>
          <div><span>ناقل الحركة</span><strong><?= e($transLabel ?? '—') ?></strong></div>
        </div>
      </div>
    </section>

    <aside class="detail-side-col">
      <div class="installment-note" data-reveal>
        <?= icon('shield-check') ?>
        <div>
          <strong>مهتم بهذه السيارة؟</strong>
          <span>تواصل معنا لمعرفة السعر وخيارات التقسيط — دفعة أولى وأقساط شهرية حتى 10 أشهر.</span>
        </div>
      </div>

      <div class="lead-box" id="contact-form">
        <h3>استفسار عن <?= e($title) ?></h3>
        <p>اترك رقمك وراح يتواصل معك فريق المبيعات لتزويدك بالسعر وتنسيق موعد معاينة.</p>
        <form method="post" action="/submit-lead.php">
          <input type="hidden" name="vehicle_id" value="<?= e($car['id']) ?>">
          <input type="hidden" name="return_to" value="/car.php?id=<?= urlencode($car['id']) ?>">
          <div class="lead-field">
            <label>الاسم</label>
            <input type="text" name="name" required placeholder="اسمك الكامل">
          </div>
          <div class="lead-field">
            <label>رقم الهاتف</label>
            <input type="tel" name="phone" required placeholder="07xxxxxxxxx" dir="ltr" style="text-align:right">
          </div>
          <button class="lead-submit" type="submit">إرسال الطلب</button>
        </form>
      </div>

      <div class="contact-box" data-reveal>
        <h3>للاستفسار المباشر والشراء</h3>
        <?php foreach (CONTACT_LINES as $line): ?>
          <div class="phone-line">
            <?= icon('phone') ?>
            <span class="phone-name"><?= e($line['name']) ?>:</span>
            <bdi class="phone-num"><?= e($line['phone']) ?></bdi>
          </div>
        <?php endforeach; ?>
        <p class="showroom-address"><?= icon('map-pin') ?> <span><?= e(SHOWROOM_ADDRESS) ?></span></p>
        <a href="<?= e(WHATSAPP_LINK) ?>" target="_blank" rel="noopener" class="btn-whatsapp">
          تواصل عبر واتساب
        </a>
      </div>
    </aside>
  </main>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
