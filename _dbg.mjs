import { chromium } from "@playwright/test";
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=gl","--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport:{width:1400,height:720} });
p.on("console", m => { const t=m.text(); if(t.includes("[split]")) console.log(t); });
p.on("pageerror",e=>console.log("PAGEERROR:", e.message));
await p.goto("http://localhost:3000/game",{waitUntil:"networkidle",timeout:60000}).catch(e=>console.log("goto",e.message));
await p.waitForTimeout(5000);
await b.close();
