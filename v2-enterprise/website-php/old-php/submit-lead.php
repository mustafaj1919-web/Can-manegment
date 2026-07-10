<?php
require __DIR__ . '/config.php';
require __DIR__ . '/includes/api.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /index.php');
    exit;
}

$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$message = trim($_POST['message'] ?? '');
$vehicleId = trim($_POST['vehicle_id'] ?? '');
$returnTo = $_POST['return_to'] ?? '/index.php';

// اسمح فقط بمسارات داخلية للرجوع، لمنع open-redirect
if (!is_string($returnTo) || $returnTo === '' || $returnTo[0] !== '/' || strpos($returnTo, '//') === 0) {
    $returnTo = '/index.php';
}
$separator = strpos($returnTo, '?') !== false ? '&' : '?';

if ($name === '' || $phone === '') {
    header('Location: ' . $returnTo . $separator . 'error=1');
    exit;
}

$ok = post_lead($name, $phone, $vehicleId !== '' ? $vehicleId : null, $message !== '' ? $message : null);

header('Location: ' . $returnTo . $separator . ($ok ? 'sent=1' : 'error=1'));
exit;
