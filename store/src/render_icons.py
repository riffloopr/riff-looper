import asyncio, pathlib
from playwright.async_api import async_playwright
svg = pathlib.Path('icon.svg').read_text()
out = pathlib.Path('/home/claude/riff-looper/extension/icons')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for s in (16, 32, 48, 128, 512):
            pg = await b.new_page(viewport={'width': s, 'height': s}, device_scale_factor=1)
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width=\"{s}\" height=\"{s}\" ",1)}</body></html>')
            path = out / f'icon{s}.png' if s != 512 else pathlib.Path('/home/claude/riff-looper/docs/logo512.png')
            await pg.screenshot(path=str(path), omit_background=True)
            await pg.close()
        # Vorschau aller Größen
        pg = await b.new_page(viewport={'width': 420, 'height': 160})
        imgs = ''.join(f'<img src="file://{out}/icon{s}.png" style="margin:12px;vertical-align:middle">' for s in (16,32,48,128))
        await pg.goto('file:///dev/null'); await pg.set_content(f'<body style="margin:0;background:#fff">{imgs}<div style="background:#222;display:inline-block">{imgs}</div></body>')
        await b.close()
asyncio.run(main())
