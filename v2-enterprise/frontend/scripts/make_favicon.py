from PIL import Image
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = root / 'public' / 'logo.png'
output = root / 'public' / 'favicon.ico'

if not source.exists():
    raise FileNotFoundError(f'Missing source logo: {source}')

img = Image.open(source).convert('RGBA')
img.save(output, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)])
print(f'Generated {output}')
