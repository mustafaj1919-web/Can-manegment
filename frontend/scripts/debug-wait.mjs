import { chromium } from 'playwright';
const browser = await chromium.launch({ headless:true });
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:3000/login', {waitUntil:'networkidle'});
await page.waitForTimeout(3000);
const data = await page.evaluate(() => {
 const h=document.querySelector('h2'); const card=h?.closest('div');
 const hs=h?getComputedStyle(h):null; const cs=card?getComputedStyle(card):null;
 return {hRect:h?.getBoundingClientRect(), hOpacity:hs?.opacity, cardOpacity:cs?.opacity, bodyText:document.body.innerText.slice(0,100)};
});
console.log(JSON.stringify(data,null,2));
await page.screenshot({path:'D:/System/car_showroom_management/delivery/login-debug-wait.png'});
await browser.close();
