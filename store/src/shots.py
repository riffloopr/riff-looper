import asyncio, pathlib
from playwright.async_api import async_playwright
EXT = pathlib.Path('/home/claude/riff-looper/extension')
OUT = pathlib.Path('/home/claude/riff-looper/store/screenshots')
VID = pathlib.Path('scene.mp4').read_bytes()
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"
def page(title, sub):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
html{{font-size:10px}} body{{margin:0;background:radial-gradient(circle at 20% 0%,#2a2f3d,#0e1016 60%);width:1280px;height:800px;overflow:hidden;font-family:{FONT};color:#fff}}
.cap{{position:absolute;left:80px;top:30px;right:80px}}
.cap h1{{margin:0;font-size:34px;font-weight:700;letter-spacing:-.5px}}
.cap h1 b{{color:#ffc83c}} .cap p{{margin:8px 0 0;font-size:18px;color:#b9bfcc}}
.logo{{position:absolute;right:80px;top:34px;display:flex;align-items:center;gap:10px;font-size:18px;font-weight:600;color:#ddd}}
#movie_player{{position:absolute;left:80px;top:140px;width:1120px;height:630px;background:#000;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6)}}
video{{width:100%;height:100%;display:block}}
</style></head><body>
<div class="cap"><h1>{title}</h1><p>{sub}</p></div>
<div class="logo"><img src="/icon48.png" width="40" height="40">Riff Looper</div>
<div id="movie_player"><video class="html5-main-video" src="/v.mp4" muted></video></div></body></html>"""
MOCK = """
window.__store={sync:{},local:{}};
window.chrome={storage:{sync:{get:(k,cb)=>cb({...__store.sync}),set:(o)=>Object.assign(__store.sync,o)},local:{get:(k,cb)=>cb({...__store.local}),set:(o)=>Object.assign(__store.local,o)}}};
window.__fakeInput={name:'FS-4 MIDI Footswitch',state:'connected',onmidimessage:null};
navigator.requestMIDIAccess=async()=>({inputs:new Map([['1',__fakeInput]]),onstatechange:null});
window.__midi=(...b)=>__fakeInput.onmidimessage({data:new Uint8Array(b)});
"""
SCENES = [
 ('01-loop', 'Schwierige Stellen <b>im Loop</b> üben', 'A und B setzen, Grenzen auf der Timeline ziehen, Loops pro Video speichern.'),
 ('02-midi', '<b>Hände frei</b> – mit dem MIDI-Fußschalter', 'Jede Funktion per „Lernen“ auf einen Schalter legen. Expression-Pedal steuert das Tempo.'),
 ('03-trainer', 'Langsam anfangen, <b>automatisch schneller</b>', 'Tempo 25–200 % ohne Tonhöhenänderung. Der Speed-Trainer erhöht nach jedem Durchgang.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        for key, title, sub in SCENES:
            pg = await b.new_page(viewport={'width':1280,'height':800}, device_scale_factor=1)
            html = page(title, sub)
            def make(html):
             async def handle(route):
                 u = route.request.url
                 if u.endswith('/v.mp4'):
                     rng = route.request.headers.get('range'); n = len(VID)
                     if rng:
                         a,_,bb = rng.split('=')[1].partition('-'); a=int(a); bb=int(bb) if bb else n-1
                         bb = min(bb, a+4_000_000, n-1)
                         await route.fulfill(status=206, body=VID[a:bb+1], headers={'content-type':'video/mp4','accept-ranges':'bytes','content-range':f'bytes {a}-{bb}/{n}'})
                     else:
                         await route.fulfill(body=VID, headers={'content-type':'video/mp4','accept-ranges':'bytes'})
                 elif u.endswith('/icon48.png'):
                     await route.fulfill(body=(EXT/'icons/icon128.png').read_bytes(), headers={'content-type':'image/png'})
                 else:
                     await route.fulfill(body=html, headers={"content-type":"text/html; charset=utf-8"})
             return handle
            await pg.route('https://www.youtube.com/**', make(html))
            await pg.add_init_script(MOCK)
            await pg.goto('https://www.youtube.com/watch?v=demo')
            await pg.add_style_tag(content=(EXT/'looper.css').read_text())
            await pg.evaluate((EXT/'content.js').read_text())
            await pg.wait_for_selector('.ygl-panel')
            ev = pg.evaluate
            V = "document.querySelector('video')"
            await ev(f"(async()=>{{const v={V}; await new Promise(r=>v.readyState>=1?r():v.addEventListener('loadedmetadata',r,{{once:true}}));}})()")
            async def seek(t):
                await ev(f"new Promise(r=>{{const v={V}; v.addEventListener('seeked',r,{{once:true}}); v.currentTime={t};}})")
            async def save(name):
                await pg.fill('.ygl-text', name); await pg.press('.ygl-text', 'Enter')
            # gespeicherte Loops anlegen
            for a_, b_, nm in [(42.0, 49.6, 'Intro-Lick'), (101.3, 108.9, 'Solo Takt 5–8'), (161.0, 166.4, 'Bending-Passage')]:
                await seek(a_); await pg.click('.ygl-a'); await seek(b_); await pg.click('.ygl-b'); await save(nm)
            await ev(f"{V}.pause()")
            if key == '01-loop':
                await pg.click('.ygl-savedname >> nth=1')
                await ev(f"{V}.playbackRate=0.75")
                await seek(104.2)
                await pg.click('.ygl-btn.ygl-mini:has-text("Zoom")')
            elif key == '02-midi':
                await pg.click('.ygl-fold >> nth=1')
                await pg.click('button:has-text("MIDI verbinden")'); await pg.wait_for_timeout(100)
                for act, msg in [('cycle',(0xB0,80,127)),('jumpA',(0xB0,81,127)),('speedDown',(0xB0,82,127)),('speedUp',(0xB0,83,127)),('speedPedal',(0xB0,11,90))]:
                    await pg.click(f'.ygl-learn[data-act="{act}"]'); await ev(f"__midi({msg[0]},{msg[1]},{msg[2]})"); await ev(f"__midi({msg[0]},{msg[1]},0)") if act!='speedPedal' else None
                await pg.click('.ygl-savedname >> nth=0'); await ev(f"{V}.pause()")
                await ev("__midi(0xB0,11,102)")
                await seek(45.1)
                await ev("document.querySelector('.ygl-panel').scrollTop=9999")
            elif key == '03-trainer':
                await pg.click('.ygl-fold >> nth=0')
                await pg.click('.ygl-savedname >> nth=2'); await ev(f"{V}.pause()")
                await pg.check('.ygl-panel input[type=checkbox]')
                await pg.select_option('.ygl-sel >> nth=0', '1')
                await ev(f"{V}.playbackRate=0.7")
                await seek(163.5)
            await ev("document.querySelectorAll('.ygl-btn').forEach(b=>b.blur()); document.activeElement && document.activeElement.blur()")
            await pg.mouse.move(1150, 700)
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=str(OUT/f'{key}.png'))
            await pg.close()
        await b.close()
asyncio.run(main())
