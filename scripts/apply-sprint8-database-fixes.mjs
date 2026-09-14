import{readFile,writeFile}from"node:fs/promises";

const path="src/data/real-roster-overrides-2026.ts";
let source=await readFile(path,"utf8");
const sentinel='clubMatch: "jacuipense"';
const marker='\n];\n\nfunction normalized';
const override=`
  {
    competitionId: "BRA4",
    clubMatch: "jacuipense",
    add: [
      { transfermarktId: "real-20260914-david-santana", name: "David Santana", position: "MC", age: 25, marketValueEur: null },
      { transfermarktId: "real-20260914-jarles-baiano", name: "Jarles Baiano", position: "ATA", age: 30, marketValueEur: null },
    ],
  },`;

if(!source.includes(sentinel)){
 if(!source.includes(marker))throw new Error("REAL_ROSTER_OVERRIDES closing marker not found");
 source=source.replace(marker,`${override}${marker}`);
 await writeFile(path,source);
 console.log("Added verified Jacuipense 2026 roster additions");
}else console.log("Jacuipense roster override already present");
