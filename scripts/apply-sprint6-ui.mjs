import{readFile,writeFile}from"node:fs/promises";
const path="src/app/page.tsx";let s=await readFile(path,"utf8");
const r=(a,b,n)=>{if(!s.includes(a))throw new Error(`missing ${n}`);s=s.replace(a,b)};
r('import WorldInboxView, { NewsFeedView } from "./world-view";','import WorldInboxView, { NewsFeedView } from "./world-view";\nimport MarketView from "./market-view";',"market import");
r('        active==="Notícias"?<NewsFeedView world={season.livingWorld} club={club}/>:','        active==="Notícias"?<NewsFeedView world={season.livingWorld} club={club}/>:active==="Mercado"?<MarketView season={season} onResult={({state:next,message})=>{persist(next);flash(message)}}/>:',"market route");
await writeFile(path,s);console.log("page sprint6 patched");
