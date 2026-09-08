from pathlib import Path
p=Path('src/app/match-2d-pitch.tsx')
s=p.read_text()
s=s.replace('import{useEffect,useMemo,useRef,useState}from"react";','import{useEffect,useRef,useState}from"react";')
s=s.replace('const byId=useMemo(()=>new Map([...home.players,...away.players].map(p=>[p.id,p])),[home,away]),layouts=', 'const byId=new Map([...home.players,...away.players].map(p=>[p.id,p])),layouts=')
p.write_text(s)
p=Path('src/game-engine/match-2d-scene.ts')
s=p.read_text().replace(' const possessionSide=defensiveEvent?eventTeam:attackingSide;\n','')
p.write_text(s)
