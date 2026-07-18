import { chromium } from "@playwright/test";
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=gl","--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport:{width:1400,height:720} });
const errors=[];
p.on("pageerror",e=>errors.push("PAGEERROR: "+e.message.split("\n")[0]));
p.on("console",m=>{ if(m.type()==="error") errors.push("CONSOLE.ERROR: "+m.text().split("\n")[0]); });
await p.goto("http://localhost:3000/game",{waitUntil:"networkidle",timeout:60000}).catch(e=>errors.push("goto "+e.message));
await p.waitForTimeout(6000);
await p.screenshot({path:"_test_start.png"});
// Move P1 right (d) + down (s); P2 left (ArrowLeft) + up (ArrowUp), 1.6s
await p.keyboard.down("d"); await p.keyboard.down("ArrowLeft");
await p.waitForTimeout(1600);
await p.keyboard.up("d"); await p.keyboard.up("ArrowLeft");
await p.waitForTimeout(800);
await p.screenshot({path:"_test_move.png"});
// sustained 3s error watch
await p.waitForTimeout(3000);
console.log("canvases:", await p.locator("canvas").count());
console.log("errors:", errors.length? errors.join(" | ") : "(none)");
await b.close();
