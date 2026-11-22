import {test,expect} from '@playwright/test';
for(const width of [390,768,1440]) test(`landing responsive ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/');
 await expect(page.locator('.hero-art img')).toBeVisible();
 expect(await page.locator('.hero').evaluate(el=>getComputedStyle(el).display)).toBe('grid');
 const overflow=await page.evaluate(()=>[...document.querySelectorAll('.public-site *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1 && getComputedStyle(e).position!=='absolute').map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,12));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(overflow)).toBe(true);
 const box=await page.locator('.hero-art img').boundingBox(); expect(box.width).toBeLessThan(width);
 const people=await page.locator('.tree-person').evaluateAll(nodes=>nodes.map(node=>{const image=node.querySelector('img').getBoundingClientRect();const text=node.querySelector('strong').getBoundingClientRect();return {imageWidth:image.width,imageHeight:image.height,textWidth:text.width};}));
 for(const person of people){expect(person.imageWidth).toBe(45);expect(person.imageHeight).toBe(45);expect(person.textWidth).toBeGreaterThan(55);}
 await page.locator('.photo-tile').first().click();await expect(page.locator('.viewer')).toBeVisible();
 await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Login',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Admin sign in'})).toBeVisible();
});
