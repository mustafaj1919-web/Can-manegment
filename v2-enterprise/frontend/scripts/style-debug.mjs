import { chromium } from 'playwright';
const browser = await chromium.launch({ headless:true });
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:3000/login', {waitUntil:'networkidle'});
const styles = await page.evaluate(() => {
 const b=getComputedStyle(document.body);
 const h=document.querySelector('h2');
 const hs=h?getComputedStyle(h):null;
 return {bodyBg:b.background, bodyColor:b.color, htmlClass:document.documentElement.className, h2:h?.textContent, h2Color:hs?.color, h2Display:hs?.display};
});
console.log(JSON.stringify(styles,null,2));
await browser.close();
