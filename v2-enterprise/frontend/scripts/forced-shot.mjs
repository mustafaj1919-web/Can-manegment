import { chromium } from 'playwright';
const browser = await chromium.launch({ headless:true });
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:3000/login', {waitUntil:'networkidle'});
await page.addStyleTag({content:`
*{color:#111!important; opacity:1!important; visibility:visible!important; text-shadow:none!important; filter:none!important; backdrop-filter:none!important; transform:none!important; animation:none!important; transition:none!important;}
html,body,#__next,main,div{background:#f8fafc!important;}
.glass, form, input, button{background:#fff!important; border:1px solid #ccc!important;}
`});
await page.waitForTimeout(500);
await page.screenshot({path:'D:/System/car_showroom_management/delivery/forced-login.png'});
await browser.close();
