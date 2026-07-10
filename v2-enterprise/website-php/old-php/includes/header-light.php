<?php
$pageTitle = $pageTitle ?? SITE_NAME;
$leadSent = isset($_GET['sent']) && $_GET['sent'] === '1';
$leadError = isset($_GET['error']) && $_GET['error'] === '1';
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($pageTitle) ?></title>
<meta name="description" content="شركة الأصدقاء لتجارة السيارات — سيارات مفحوصة فنياً وخيارات تقسيط مرنة">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style-light.css?v=<?= @filemtime(__DIR__ . '/../assets/style-light.css') ?>">
</head>
<body class="lt-body">

<header class="lt-header">
  <div class="lt-brand">
    <img src="/assets/images/logo.png" alt="<?= e(SITE_NAME) ?>" class="lt-logo">
  </div>
  <nav class="lt-nav">
    <a href="#top">الرئيسية</a>
    <a href="#cars">سياراتنا</a>
    <a href="#about">من نحن</a>
    <a href="#visit">تواصل معنا</a>
  </nav>
  <a href="#visit" class="lt-btn lt-btn-solid lt-btn-sm">احجز موعد</a>
</header>

<?php if ($leadSent): ?>
  <div class="lt-flash lt-flash-success">تم استلام طلبك بنجاح، سيتواصل معك فريق المبيعات قريباً.</div>
<?php elseif ($leadError): ?>
  <div class="lt-flash lt-flash-error">تعذر إرسال الطلب، يرجى المحاولة عبر واتساب مباشرة.</div>
<?php endif; ?>
