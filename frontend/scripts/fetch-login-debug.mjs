import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
await page.goto('http://127.0.0.1:3000/login',{waitUntil:'networkidle'});
const res = await page.evaluate(async () => {
 const r = await fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:'owner',password:'Owner@12345'})});
 return {status:r.status, text:await r.text()};
});
console.log('fetch login', res.status, res.text.slice(0,100));
await page.goto('http://127.0.0.1:3000/',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(5000);
console.log('url', page.url());
console.log('text', (await page.locator('body').innerText()).slice(0,500));
await page.screenshot({path:'D:/System/car_showroom_management/delivery/fetch-dashboard.png'});
await browser.close();
