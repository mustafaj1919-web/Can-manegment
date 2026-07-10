<?php

const FUEL_LABEL = ['Gasoline' => 'بنزين', 'Diesel' => 'ديزل', 'Hybrid' => 'هايبرد', 'Electric' => 'كهربائي'];
const TRANS_LABEL = ['Automatic' => 'أوتوماتيك', 'Manual' => 'يدوي', 'CVT' => 'CVT', 'DCT' => 'DCT'];
const CONDITION_LABEL = ['New' => 'جديدة', 'Used' => 'مستعملة', 'Damaged' => 'متضررة', 'Salvage' => 'سكراب'];

function fuel_label(?string $value): ?string
{
    if (!$value) return null;
    return FUEL_LABEL[$value] ?? $value;
}

function transmission_label(?string $value): ?string
{
    if (!$value) return null;
    return TRANS_LABEL[$value] ?? $value;
}

function condition_label(?string $value): ?string
{
    if (!$value) return null;
    return CONDITION_LABEL[$value] ?? $value;
}

function photo_url(?string $filename): ?string
{
    if (!$filename) return null;
    return API_BASE_URL . '/static/uploads/vehicles/' . rawurlencode($filename);
}

function first_photo_filename(array $vehicle): ?string
{
    $images = $vehicle['images'] ?? [];
    if (empty($images)) return null;
    return $images[0]['filename'] ?? null;
}

// نص وصفي حقيقي: يستخدم notes الفعلية إذا موجودة، وإلا جملة مبنية من المواصفات الحقيقية — بدون اختلاق محتوى
function car_description(array $vehicle): string
{
    $notes = trim($vehicle['notes'] ?? '');
    if ($notes !== '') {
        return $notes;
    }

    $title = trim(($vehicle['brand'] ?? '') . ' ' . ($vehicle['model'] ?? '') . ' ' . ($vehicle['year'] ?? ''));
    $bits = [];

    if (!empty($vehicle['condition'])) {
        $bits[] = condition_label($vehicle['condition']);
    }
    if (!empty($vehicle['transmission'])) {
        $bits[] = 'ناقل حركة ' . transmission_label($vehicle['transmission']);
    }
    if (!empty($vehicle['fuel_type'])) {
        $bits[] = 'وقود ' . fuel_label($vehicle['fuel_type']);
    }
    if (isset($vehicle['mileage']) && $vehicle['mileage'] !== null) {
        $bits[] = number_format((float)$vehicle['mileage']) . ' كم';
    }

    if (empty($bits)) {
        return $title . '.';
    }

    return $title . ' — ' . implode('، ', $bits) . '.';
}

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

const ICONS = [
    'gauge' => '<circle cx="12" cy="12" r="10"/><path d="M12 12 8 9"/><path d="M12 6v.01"/>',
    'settings' => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    'fuel' => '<line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="m19 8-2-2 2.5-2.5A2.12 2.12 0 0 1 21 3.5V13a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-3"/>',
    'arrow-left' => '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'arrow-right' => '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'shield-check' => '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'calendar-clock' => '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><circle cx="18" cy="18" r="4"/><path d="M18 16.5v1.5l1 1"/>',
    'file-check' => '<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m3 15 2 2 4-4"/>',
    'phone' => '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
    'map-pin' => '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'palette' => '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/>',
    'armchair' => '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
    'alert-circle' => '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    'x' => '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'chevron-down' => '<path d="m6 9 6 6 6-6"/>',
    'arrow-up-left' => '<path d="M17 17 7 7"/><path d="M7 17V7h10"/>',
];

function icon(string $name, string $class = ''): string
{
    $paths = ICONS[$name] ?? '';
    $classAttr = $class ? ' class="' . e($class) . '"' : '';
    return '<svg' . $classAttr . ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' . $paths . '</svg>';
}
