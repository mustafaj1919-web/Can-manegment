import { chromium } from 'playwright';
for (const channel of ['msedge','chrome']) {
  try {
    const browser = await chromium.launch({ channel, headless:true });
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto('http://127.0.0.1:3000/login', {waitUntil:'networkidle'});
    await page.waitForTimeout(3000);
    await page.screenshot({path:`D:/System/car_showroom_management/delivery/${channel}-login.png`});
    await browser.close();
    console.log(channel, 'ok');
  } catch (e) { console.log(channel, 'err', e.message); }
}
