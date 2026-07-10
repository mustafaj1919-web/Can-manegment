<?php

function api_request(string $method, string $path, array $query = [], ?array $body = null): ?array
{
    $url = API_BASE_URL . $path;
    if (!empty($query)) {
        $url .= '?' . http_build_query($query);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json', 'Content-Type: application/json']);
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        return null;
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        return null;
    }

    $decoded['_status'] = $status;
    return $decoded;
}

// يرجع قائمة السيارات المتوفرة، أو مصفوفة فارغة إذا تعذر الاتصال — لا بيانات وهمية أبداً
function fetch_vehicles(int $page = 1, int $perPage = 24, ?string $brand = null): array
{
    $query = ['page' => $page, 'perPage' => $perPage];
    if ($brand) {
        $query['brand'] = $brand;
    }
    $res = api_request('GET', '/api/public/vehicles', $query);
    if (!$res || empty($res['success']) || !isset($res['data']['items'])) {
        return [];
    }
    return $res['data']['items'];
}

// يرجع الماركات الحقيقية المتوفرة فعلياً بالمخزون (لتغذية تبويبات الفلترة) — فارغة لو تعذر الاتصال
function fetch_vehicle_brands(): array
{
    $res = api_request('GET', '/api/public/vehicles/filters');
    if (!$res || empty($res['success']) || !isset($res['data']['brands'])) {
        return [];
    }
    return $res['data']['brands'];
}

// يرجع بيانات سيارة واحدة أو null إذا غير متوفرة
function fetch_vehicle_by_id(string $id): ?array
{
    $res = api_request('GET', '/api/public/vehicles/' . rawurlencode($id));
    if (!$res || empty($res['success']) || !isset($res['data'])) {
        return null;
    }
    return $res['data'];
}

// يرسل طلب استفسار (Lead) — يرجع true/false حسب نجاح الاستلام من الـ API
function post_lead(string $name, string $phone, ?string $vehicleId, ?string $message): bool
{
    $res = api_request('POST', '/api/public/vehicles/leads', [], [
        'Name' => $name,
        'Phone' => $phone,
        'VehicleId' => $vehicleId,
        'Message' => $message,
    ]);
    return $res !== null && !empty($res['success']);
}
