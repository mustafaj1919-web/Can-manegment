import base64
import io
import json
import os
import tempfile

from PIL import Image


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False))


def prepare_scanned_jpeg(path):
    from PIL import ImageOps

    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        max_side = 1800
        if max(img.size) > max_side:
            img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

        quality = 82
        while quality >= 55:
            out = io.BytesIO()
            img.save(out, format='JPEG', quality=quality, optimize=True, progressive=True)
            data = out.getvalue()
            if len(data) <= 1_800_000:
                return data
            quality -= 12

        out = io.BytesIO()
        img.thumbnail((900, 900), Image.Resampling.LANCZOS)
        img.save(out, format='JPEG', quality=50, optimize=True, progressive=True)
        return out.getvalue()


def crop_to_card(img):
    card_ratio = 85.60 / 53.98
    gray = img.convert('L')
    threshold = 244
    mask = gray.point(lambda px: 255 if px < threshold else 0)
    box = mask.getbbox()

    if not box:
        box = center_ratio_box(img.size, card_ratio)
    else:
        box = add_margin(box, img.size, margin_ratio=0.04)
        detected_ratio = (box[2] - box[0]) / max(1, (box[3] - box[1]))
        target_ratio = card_ratio if detected_ratio >= 1 else 1 / card_ratio
        box = expand_box_to_ratio(box, img.size, target_ratio)

    cropped = img.crop(box)
    target_ratio = card_ratio if cropped.width >= cropped.height else 1 / card_ratio
    target_size = (1280, round(1280 / target_ratio)) if target_ratio > 1 else (round(1280 * target_ratio), 1280)
    return cropped.resize(target_size, Image.Resampling.LANCZOS)


def add_margin(box, size, margin_ratio):
    left, top, right, bottom = box
    width, height = right - left, bottom - top
    margin = int(max(width, height) * margin_ratio)
    return (
        max(0, left - margin),
        max(0, top - margin),
        min(size[0], right + margin),
        min(size[1], bottom + margin),
    )


def expand_box_to_ratio(box, size, target_ratio):
    left, top, right, bottom = box
    cx = (left + right) / 2
    cy = (top + bottom) / 2
    width = right - left
    height = bottom - top

    if width / max(1, height) < target_ratio:
        width = height * target_ratio
    else:
        height = width / target_ratio

    return clamp_center_box(cx, cy, width, height, size)


def center_ratio_box(size, target_ratio):
    width, height = size
    if width / max(1, height) > target_ratio:
        crop_h = height
        crop_w = crop_h * target_ratio
    else:
        crop_w = width
        crop_h = crop_w / target_ratio
    return clamp_center_box(width / 2, height / 2, crop_w, crop_h, size)


def clamp_center_box(cx, cy, width, height, size):
    img_w, img_h = size
    width = min(width, img_w)
    height = min(height, img_h)
    left = max(0, min(img_w - width, cx - width / 2))
    top = max(0, min(img_h - height, cy - height / 2))
    return (
        int(round(left)),
        int(round(top)),
        int(round(left + width)),
        int(round(top + height)),
    )


def main():
    tmp_path = None
    pythoncom = None

    try:
        import pythoncom
        import win32com.client as wcom

        pythoncom.CoInitialize()
        dialog = wcom.Dispatch('WIA.CommonDialog')
        scanned = dialog.ShowAcquireImage(
            1,
            1,
            64,
            '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}',
            False,
            True,
            True,
        )

        if scanned is None:
            emit({'error': 'scan_cancelled'})
            return

        tmp_path = tempfile.mktemp(suffix='.jpg')
        scanned.SaveFile(tmp_path)

        try:
            raw = prepare_scanned_jpeg(tmp_path)
        except Exception:
            with open(tmp_path, 'rb') as fh:
                raw = fh.read()

        if len(raw) > 4_000_000:
            emit({
                'error': 'scan_too_large',
                'message': 'حجم الصورة الممسوحة كبير جداً. اختَر دقة أقل من نافذة الماسح ثم أعد المحاولة.',
                'size': len(raw),
            })
            return

        emit({
            'success': True,
            'data': base64.b64encode(raw).decode('ascii'),
            'mime_type': 'image/jpeg',
            'filename': 'scan.jpg',
            'size': len(raw),
        })

    except Exception as exc:
        msg = str(exc)
        if '80210007' in msg or 'cancel' in msg.lower():
            emit({'error': 'scan_cancelled'})
        else:
            emit({'error': 'scan_failed', 'message': f'فشل المسح: {msg}'})

    finally:
        if tmp_path:
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        try:
            if pythoncom:
                pythoncom.CoUninitialize()
        except Exception:
            pass


if __name__ == '__main__':
    main()
