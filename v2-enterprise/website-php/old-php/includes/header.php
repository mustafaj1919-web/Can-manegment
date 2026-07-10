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
<link rel="stylesheet" href="/assets/style.css?v=<?= @filemtime(__DIR__ . '/../assets/style.css') ?>">
</head>
<body>

<header class="story-header">
  <div class="story-brand">
    <img src="/assets/images/logo.png" alt="<?= e(SITE_NAME) ?>" class="story-logo">
    <div><h1><?= e(SITE_NAME) ?></h1></div>
  </div>
  <nav class="header-links">
    <a href="/index.php#top">الرئيسية</a>
    <a href="/index.php#cars">سياراتنا</a>
    <a href="/index.php#vision">من نحن</a>
    <a href="/index.php#visit">تواصل معنا</a>
  </nav>
</header>

<?php if ($leadSent): ?>
  <div class="flash-banner flash-success">تم استلام طلبك بنجاح، سيتواصل معك فريق المبيعات قريباً.</div>
<?php elseif ($leadError): ?>
  <div class="flash-banner flash-error">تعذر إرسال الطلب، يرجى المحاولة عبر واتساب مباشرة.</div>
<?php endif; ?>
