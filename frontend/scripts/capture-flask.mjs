import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const outDir='D:/System/car_showroom_management/delivery/system_screenshots_flask';
fs.mkdirSync(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}, locale:'ar-IQ'});
async function style(){ await page.addStyleTag({content:`body{background:#f8fafc!important;color:#111827!important} *{opacity:1!important;visibility:visible!important;text-shadow:none!important;filter:none!important;backdrop-filter:none!important} .card,.table,nav,.navbar,aside,form{background:#fff!important}`}).catch(()=>{}); }
await page.goto('http://127.0.0.1:5000/login',{waitUntil:'networkidle'});
await style();
await page.screenshot({path:path.join(outDir,'01-flask-login.png')});
await page.fill('input[name="username"]','owner').catch(async()=>{ await page.fill('input[type="text"]','owner'); });
await page.fill('input[name="password"]','Owner@12345').catch(async()=>{ await page.fill('input[type="password"]','Owner@12345'); });
await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}).catch(()=>{}), page.click('button[type="submit"], input[type="submit"') .catch(()=>{})]);
await page.waitForTimeout(1000);
const routes=[['02-dashboard','/'],['03-inventory','/cars'],['04-purchases','/purchases'],['05-sales','/sales'],['06-chart','/chart-of-accounts'],['07-trial','/trial-balance'],['08-cashbox','/cashbox'],['09-backup','/backup']];
for(const [name,route] of routes){ await page.goto('http://127.0.0.1:5000'+route,{waitUntil:'networkidle'}).catch(()=>{}); await page.waitForTimeout(800); await style(); await page.screenshot({path:path.join(outDir,name+'.png')}); }
await browser.close();
console.log(outDir);
