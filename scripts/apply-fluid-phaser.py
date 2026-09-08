from pathlib import Path

p=Path('src/game-engine/live-match.ts')
s=p.read_text()
s=s.replace('export type MatchSpeed="normal"|"fast"|"very_fast";','export type MatchSpeed="slow"|"normal"|"fast"|"very_fast";')
p.write_text(s)

p=Path('src/game-engine/game-preferences.ts')
s=p.read_text().replace('export type MatchSpeedPreference="normal"|"fast"|"very_fast";','export type MatchSpeedPreference="slow"|"normal"|"fast"|"very_fast";')
p.write_text(s)

p=Path('src/app/game-settings-view.tsx')
s=p.read_text()
s=s.replace('const speedLabels:Record<MatchSpeedPreference,string>={normal:"Normal",fast:"Rápido",very_fast:"Muito rápido"};','const speedLabels:Record<MatchSpeedPreference,string>={slow:"Lento",normal:"Normal",fast:"Rápido",very_fast:"Muito rápido"};')
s=s.replace('(["normal","fast","very_fast"] as MatchSpeedPreference[])','(["slow","normal","fast","very_fast"] as MatchSpeedPreference[])')
s=s.replace('speed==="normal"?"Leitura detalhada":speed==="fast"?"Ritmo rápido":"Simulação acelerada"','speed==="slow"?"Mais fluidez no campo 2D":speed==="normal"?"Leitura detalhada":speed==="fast"?"Ritmo rápido":"Simulação acelerada"')
p.write_text(s)

p=Path('src/app/live-match-view.tsx')
s=p.read_text()
s=s.replace('const SPEED_MS:Record<MatchSpeed,number>={normal:900,fast:300,very_fast:90};','const SPEED_MS:Record<MatchSpeed,number>={slow:1650,normal:1050,fast:420,very_fast:150};')
s=s.replace('const SPEED_LABEL:Record<MatchSpeed,string>={normal:"NORMAL",fast:"RÁPIDO",very_fast:"MUITO RÁPIDO"};','const SPEED_LABEL:Record<MatchSpeed,string>={slow:"LENTO",normal:"NORMAL",fast:"RÁPIDO",very_fast:"MUITO RÁPIDO"};')
s=s.replace('(["normal","fast","very_fast"] as MatchSpeed[])','(["slow","normal","fast","very_fast"] as MatchSpeed[])')
p.write_text(s)

p=Path('src/app/match-2d-phaser.tsx')
s=p.read_text()
s=s.replace('playerObjects=new Map<string,{dot:Phaser.GameObjects.Arc;label:Phaser.GameObjects.Text}>();ball?:Phaser.GameObjects.Arc;trail?:Phaser.GameObjects.Graphics;actionText?:Phaser.GameObjects.Text;lastSize="";', 'playerObjects=new Map<string,{dot:Phaser.GameObjects.Arc;label:Phaser.GameObjects.Text}>();visualPositions=new Map<string,{x:number;y:number}>();ballVisual?:{x:number;y:number};ball?:Phaser.GameObjects.Arc;trail?:Phaser.GameObjects.Graphics;actionText?:Phaser.GameObjects.Text;lastSize="";')
s=s.replace('const X=px(x,w),Y=px(y,h);o.dot.setPosition(X,Y);o.label.setPosition(X,Y+14);', 'const target={x,y},visual=this.visualPositions.get(a.id)??target;const frame=Math.min(1,Math.max(.035,(this.game.loop.delta||16)/1000));const ease=1-Math.pow(.001,frame);visual.x=mix(visual.x,target.x,ease);visual.y=mix(visual.y,target.y,ease);this.visualPositions.set(a.id,visual);const X=px(visual.x,w),Y=px(visual.y,h);o.dot.setPosition(X,Y);o.label.setPosition(X,Y+14);')
s=s.replace('this.ball?.setPosition(px(p.x,w),px(p.y,h));this.trail?.clear();', 'const ballTarget={x:p.x,y:p.y},ballVisual=this.ballVisual??ballTarget;const ballFrame=Math.min(1,Math.max(.035,(this.game.loop.delta||16)/1000)),ballEase=1-Math.pow(.00008,ballFrame);ballVisual.x=mix(ballVisual.x,ballTarget.x,ballEase);ballVisual.y=mix(ballVisual.y,ballTarget.y,ballEase);this.ballVisual=ballVisual;this.ball?.setPosition(px(ballVisual.x,w),px(ballVisual.y,h));this.trail?.clear();')
s=s.replace('this.trail?.lineBetween(px(current.action.from.x,w),px(current.action.from.y,h),px(current.action.to.x,w),px(current.action.to.y,h));', 'this.trail?.lineBetween(px(ballVisual.x,w),px(ballVisual.y,h),px(mix(ballVisual.x,current.action.to.x,.45),w),px(mix(ballVisual.y,current.action.to.y,.45),h));')
p.write_text(s)
