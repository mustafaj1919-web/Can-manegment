import { chromium } from 'playwright';
const browser = await chromium.launch({ headless:true });
const page=await browser.newPage({viewport:{width:800,height:600}});
await page.goto('https://example.com');
await page.screenshot({path:'D:/System/car_showroom_management/delivery/example.png'});
await browser.close();
