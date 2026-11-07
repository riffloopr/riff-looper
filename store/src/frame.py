import asyncio, pathlib
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await b.new_page(viewport={'width':1280,'height':720})
        await pg.set_content('<body style="margin:0">'+pathlib.Path('fretboard.svg').read_text()+'</body>')
        await pg.screenshot(path='frame.png'); await b.close()
asyncio.run(main())
