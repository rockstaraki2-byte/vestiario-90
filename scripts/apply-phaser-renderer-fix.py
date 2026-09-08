from pathlib import Path
p=Path('src/app/match-2d-pitch.tsx')
t=p.read_text().replace('import { useCallback, useState } from "react";','import { useState } from "react";').replace(' const [fallback,setFallback]=useState(false),fail=useCallback(()=>setFallback(true),[]);',' const [fallback,setFallback]=useState(false);\n const fail=()=>setFallback(true);')
p.write_text(t)
p=Path('src/app/match-2d-phaser.tsx')
t=p.read_text().replace(', type ScenePoint','').replace('let{x,y}=a.base,hasBall=a.side===snap.plan.attackingSide,dir=a.side==="home"?-1:1;','let{x,y}=a.base;const hasBall=a.side===snap.plan.attackingSide,dir=a.side==="home"?-1:1;')
p.write_text(t)
