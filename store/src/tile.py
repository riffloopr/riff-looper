import asyncio, pathlib, base64
from playwright.async_api import async_playwright
icon = base64.b64encode(pathlib.Path('/home/claude/riff-looper/extension/icons/icon128.png').read_bytes()).decode()
frame = base64.b64encode(pathlib.Path('frame.png').read_bytes()).decode()
F="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"
def html(w,h,big):
    s = 1 if not big else 2.2
    return f"""<html><head><meta charset="utf-8"></head><body style="margin:0;width:{w}px;height:{h}px;overflow:hidden;font-family:{F};
background:linear-gradient(90deg,rgba(14,16,22,.97) 0%,rgba(14,16,22,.85) 55%,rgba(14,16,22,.35) 100%),url(data:image/png;base64,{frame}) center/cover">
<div style="position:absolute;left:{28*s}px;top:{30*s}px;right:{24*s}px;color:#fff">
<img src="data:image/png;base64,{icon}" width="{64*s}" height="{64*s}">
<div style="font-size:{34*s}px;font-weight:800;letter-spacing:-.5px;margin-top:{10*s}px">Riff Looper</div>
<div style="font-size:{15*s}px;color:#ffc83c;font-weight:600;margin-top:{4*s}px">Gitarren-Loops für YouTube</div>
<div style="font-size:{13*s}px;color:#c5cad5;margin-top:{14*s}px;line-height:1.5">A/B-Loop · Tempo · Speed-Trainer<br>MIDI-Fußschalter – Hände frei</div>
</div></body></html>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for (w,h,big,name) in [(440,280,False,'promo-small-440x280.png'),(1400,560,True,'promo-marquee-1400x560.png')]:
            pg = await b.new_page(viewport={'width':w,'height':h})
            await pg.set_content(html(w,h,big)); await pg.wait_for_timeout(200)
            await pg.screenshot(path=f'/home/claude/riff-looper/store/{name}'); await pg.close()
        await b.close()
asyncio.run(main())
