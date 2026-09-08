import runpy
from pathlib import Path
runpy.run_path('scripts/apply-sprint-f-2d-offline.py', run_name='__main__')
p=Path('src/app/use-career-autosave.ts')
s=p.read_text()
s=s.replace('const latest=useRef(season),latestId=useRef(saveId),last=useRef("");latest.current=season;latestId.current=saveId;useEffect(()=>{if(!season.preferences?.general?.autoSave)return;', 'const latest=useRef(season),latestId=useRef(saveId),last=useRef("");useEffect(()=>{latest.current=season;latestId.current=saveId},[season,saveId]);useEffect(()=>{if(!season.preferences?.general?.autoSave)return;')
p.write_text(s)
