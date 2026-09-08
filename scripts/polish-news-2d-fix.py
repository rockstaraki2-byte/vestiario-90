import runpy
from pathlib import Path
runpy.run_path('scripts/polish-news-2d.py', run_name='__main__')
p=Path('src/app/match-2d-pitch.tsx')
s=p.read_text()
s=s.replace('useEffect(()=>{setFrame(0);if(session.phase==="pre_match"||session.phase==="fulltime")return;', 'useEffect(()=>{if(session.phase==="pre_match"||session.phase==="fulltime")return;')
p.write_text(s)
