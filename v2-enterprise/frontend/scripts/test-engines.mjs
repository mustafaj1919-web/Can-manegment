import { firefox, webkit } from 'playwright';
for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]]) {
  try {
    const browser = await engine.launch({ headless:true });
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto('http://127.0.0.1:3000/login', {waitUntil:'networkidle'});
    await page.waitForTimeout(3000);
    await page.screenshot({path:`D:/System/car_showroom_management/delivery/${name}-login.png`});
    await browser.close();
    console.log(name, 'ok');
  } catch (e) { console.log(name, 'err', e.message); }
}
