from pathlib import Path

p=Path('src/app/match-2d-pitch.tsx')
s=p.read_text()
s=s.replace('const[now,setNow]=useState(0),sceneStart=useRef(0),raf=useRef<number|undefined>(undefined),lastPaint=useRef(0),event=', 'const[now,setNow]=useState(0),[sceneStart,setSceneStart]=useState(0),raf=useRef<number|undefined>(undefined),lastPaint=useRef(0),event=')
s=s.replace('useEffect(()=>{sceneStart.current=performance.now();const loop=(ts:number)=>{if(ts-lastPaint.current>45){lastPaint.current=ts;setNow(ts)}raf.current=requestAnimationFrame(loop)};', 'useEffect(()=>{let first=true;const loop=(ts:number)=>{if(first){first=false;setSceneStart(ts)}if(ts-lastPaint.current>45){lastPaint.current=ts;setNow(ts)}raf.current=requestAnimationFrame(loop)};')
s=s.replace('(now-sceneStart.current)/1000', '(now-sceneStart)/1000')
p.write_text(s)

p=Path('src/game-engine/national-team.ts')
s=p.read_text()
s=s.replace('const team=byId(career.teamId!),recent=new Set(', 'const recent=new Set(')
s=s.replace(';let hg=goals(rng,homeUser?', ';const hg=goals(rng,homeUser?')
s=s.replace('),ag=goals(rng,homeUser?', '),ag=goals(rng,homeUser?')
p.write_text(s)
