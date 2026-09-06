import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer, SquadRole } from "./league";

export type SocialRelationKind="Amizade"|"Rivalidade"|"Respeito";
export type SocialRelation={playerAId:string;playerBId:string;score:number;kind:SocialRelationKind};
export type SocialGroup={id:string;leaderId:string;memberIds:string[];cohesion:number;influence:number;archetype:string};
export type DressingRoomNetwork={groups:SocialGroup[];relations:SocialRelation[];unity:number;dominantGroupId?:string};
export type PlayerSocialContext={influence:number;group?:SocialGroup;friends:SocialRelation[];rivals:SocialRelation[]};

const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
const sign=(value:number)=>value===0?0:value>0?1:-1;

const ROLE_INFLUENCE:Record<SquadRole,number>={"Líder":79,"Titular":64,"Rotação":49,"Reserva":37,"Promessa":28};

export function playerInfluence(player:LeaguePlayer){
  let value=ROLE_INFLUENCE[player.squadRole]??42;
  value+=(player.overall-70)*.7;
  value+=player.age>=27&&player.age<=32?5:player.age>=33?3:player.age<=21?-3:0;
  value+=player.personality==="Competitivo"?5:player.personality==="Leal"?4:player.personality==="Profissional"?3:player.personality==="Temperamental"?2:0;
  value+=Math.min(5,(player.starts??0)*.35);
  value+=(player.managerTrust-60)*.08;
  return Math.max(20,Math.min(96,Math.round(value)));
}

function pairSeed(a:LeaguePlayer,b:LeaguePlayer){return [a.id,b.id].sort().join(":");}

export function relationBetween(a:LeaguePlayer,b:LeaguePlayer):SocialRelation{
  const rng=new SeededRng(`social:${pairSeed(a,b)}`);
  let score=rng.integer(-28,28);
  const ageGap=Math.abs(a.age-b.age);
  if(ageGap<=2)score+=10;else if(ageGap>=10)score-=4;
  if(a.position===b.position){
    score-=6;
    if((a.squadRole==="Titular"||a.squadRole==="Líder")&&(b.squadRole==="Titular"||b.squadRole==="Líder"))score-=5;
  }
  if(a.personality==="Leal"||b.personality==="Leal")score+=4;
  if(a.personality==="Reservado"&&b.personality==="Reservado")score+=3;
  if((a.personality==="Temperamental"||b.personality==="Temperamental")&&a.position===b.position)score-=8;
  if(a.squadRole==="Líder"&&b.age<=23||b.squadRole==="Líder"&&a.age<=23)score+=6;
  score=Math.max(-55,Math.min(55,score));
  return{playerAId:a.id,playerBId:b.id,score,kind:score>=24?"Amizade":score<=-20?"Rivalidade":"Respeito"};
}

function groupArchetype(members:LeaguePlayer[],leader:LeaguePlayer){
  if(!members.length)return "Grupo social";
  const young=members.filter(p=>p.age<=23).length/members.length;
  const competitive=members.filter(p=>p.personality==="Competitivo"||p.personality==="Ambicioso").length/members.length;
  const loyal=members.filter(p=>p.personality==="Leal"||p.personality==="Profissional").length/members.length;
  if(young>=.55)return "Jovens e promessas";
  if(leader.squadRole==="Líder")return "Núcleo de liderança";
  if(competitive>=.5)return "Competidores";
  if(loyal>=.55)return "Grupo de confiança";
  return "Grupo social";
}

export function buildDressingRoomNetwork(club:LeagueClub):DressingRoomNetwork{
  const players=club.players;
  if(!players.length)return{groups:[],relations:[],unity:50};
  const allRelations:SocialRelation[]=[];
  for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++)allRelations.push(relationBetween(players[i],players[j]));
  const groupCount=Math.min(4,Math.max(2,Math.round(players.length/10)));
  const leaders=[...players].sort((a,b)=>playerInfluence(b)-playerInfluence(a)||b.overall-a.overall).slice(0,groupCount);
  const buckets=new Map<string,LeaguePlayer[]>();leaders.forEach(leader=>buckets.set(leader.id,[leader]));
  for(const player of players){
    if(leaders.some(leader=>leader.id===player.id))continue;
    let best=leaders[0],bestScore=-Infinity;
    for(const leader of leaders){
      const relation=relationBetween(player,leader).score;
      const ageBonus=Math.max(0,7-Math.abs(player.age-leader.age));
      const roleBonus=leader.squadRole==="Líder"?4:0;
      const score=relation+ageBonus+roleBonus+playerInfluence(leader)*.08;
      if(score>bestScore){best=leader;bestScore=score;}
    }
    buckets.get(best.id)!.push(player);
  }
  const groups=leaders.map(leader=>{
    const members=buckets.get(leader.id)??[leader];
    let relationTotal=0,pairs=0;
    for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){relationTotal+=relationBetween(members[i],members[j]).score;pairs++;}
    const avgRelation=pairs?relationTotal/pairs:10;
    const avgMood=members.reduce((sum,p)=>sum+(p.happiness+p.managerTrust)/2,0)/members.length;
    const cohesion=clamp(48+avgRelation*.8+(avgMood-60)*.3);
    const influence=Math.round(members.reduce((sum,p)=>sum+playerInfluence(p),0)/members.length);
    return{id:`group-${leader.id}`,leaderId:leader.id,memberIds:members.map(p=>p.id),cohesion,influence,archetype:groupArchetype(members,leader)};
  });
  const friendships=allRelations.filter(r=>r.kind==="Amizade");
  const rivalries=allRelations.filter(r=>r.kind==="Rivalidade");
  const avgMood=players.reduce((sum,p)=>sum+(p.happiness+p.managerTrust)/2,0)/players.length;
  const avgCohesion=groups.reduce((sum,g)=>sum+g.cohesion,0)/groups.length;
  const unity=clamp(avgMood*.45+avgCohesion*.45+Math.min(10,friendships.length*.45)-Math.min(12,rivalries.length*.65));
  const dominant=[...groups].sort((a,b)=>b.influence-a.influence||b.memberIds.length-a.memberIds.length)[0];
  const relations=allRelations.filter(r=>r.kind!=="Respeito"||Math.abs(r.score)>=16).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score));
  return{groups,relations,unity,dominantGroupId:dominant?.id};
}

export function playerSocialContext(club:LeagueClub,playerId:string):PlayerSocialContext{
  const player=club.players.find(p=>p.id===playerId);
  if(!player)return{influence:0,friends:[],rivals:[]};
  const network=buildDressingRoomNetwork(club);
  const related=network.relations.filter(r=>r.playerAId===playerId||r.playerBId===playerId);
  return{
    influence:playerInfluence(player),
    group:network.groups.find(g=>g.memberIds.includes(playerId)),
    friends:related.filter(r=>r.kind==="Amizade").sort((a,b)=>b.score-a.score).slice(0,4),
    rivals:related.filter(r=>r.kind==="Rivalidade").sort((a,b)=>a.score-b.score).slice(0,3),
  };
}

function otherId(relation:SocialRelation,playerId:string){return relation.playerAId===playerId?relation.playerBId:relation.playerAId;}

export function applyConversationRipple(club:LeagueClub,targetId:string,sentiment:-2|-1|1|2){
  const target=club.players.find(p=>p.id===targetId);if(!target)return{affected:0,groupName:""};
  const context=playerSocialContext(club,targetId),affected=new Set<string>(),direction=sign(sentiment),strong=Math.abs(sentiment)===2;
  for(const relation of context.friends){
    const friend=club.players.find(p=>p.id===otherId(relation,targetId));if(!friend)continue;
    const weight=playerInfluence(target)>=75||relation.score>=38?2:1;
    friend.managerTrust=clamp(friend.managerTrust+direction*weight*(strong?1.5:1));
    friend.happiness=clamp(friend.happiness+direction*(strong?2:1));
    friend.morale=clamp(friend.morale+direction);
    affected.add(friend.id);
  }
  if(context.group&&(strong||playerInfluence(target)>=72))for(const memberId of context.group.memberIds){
    if(memberId===targetId||affected.has(memberId))continue;
    const member=club.players.find(p=>p.id===memberId);if(!member)continue;
    member.managerTrust=clamp(member.managerTrust+direction);
    if(strong)member.happiness=clamp(member.happiness+direction);
    affected.add(member.id);
  }
  for(const relation of context.rivals){
    if(Math.abs(relation.score)<30)continue;
    const rival=club.players.find(p=>p.id===otherId(relation,targetId));if(!rival)continue;
    rival.happiness=clamp(rival.happiness-direction);
    affected.add(rival.id);
  }
  const leader=context.group?club.players.find(p=>p.id===context.group!.leaderId):undefined;
  return{affected:affected.size,groupName:leader?`núcleo de ${leader.name.split(" ")[0]}`:"grupo"};
}

export function applyMatchSocialEffects(club:LeagueClub,participantIds:string[],starterIds:string[]){
  const participants=new Set(participantIds),starters=new Set(starterIds),network=buildDressingRoomNetwork(club);
  for(const group of network.groups){
    const leader=club.players.find(p=>p.id===group.leaderId);if(!leader||participants.has(leader.id)||leader.injuryDays>0||leader.suspensionMatches>0||playerInfluence(leader)<70)continue;
    for(const memberId of group.memberIds){
      if(memberId===leader.id)continue;
      const member=club.players.find(p=>p.id===memberId);if(!member)continue;
      member.managerTrust=clamp(member.managerTrust-(playerInfluence(leader)>=82?2:1));
      member.happiness=clamp(member.happiness-1);
    }
  }
  const rivalries=network.relations.filter(r=>r.kind==="Rivalidade").sort((a,b)=>a.score-b.score);
  const touched=new Set<string>();
  for(const relation of rivalries){
    const a=club.players.find(p=>p.id===relation.playerAId),b=club.players.find(p=>p.id===relation.playerBId);if(!a||!b||a.position!==b.position)continue;
    const benched=starters.has(a.id)&&!participants.has(b.id)?b:starters.has(b.id)&&!participants.has(a.id)?a:undefined;
    if(!benched||touched.has(benched.id)||benched.injuryDays>0||benched.suspensionMatches>0)continue;
    benched.happiness=clamp(benched.happiness-1);
    if(relation.score<=-32)benched.managerTrust=clamp(benched.managerTrust-1);
    touched.add(benched.id);
  }
}

export function applyDepartureImpact(club:LeagueClub,playerId:string){
  const departing=club.players.find(p=>p.id===playerId);if(!departing)return"";
  const context=playerSocialContext(club,playerId),affected=new Set<string>(),importance=playerInfluence(departing);
  for(const relation of context.friends){
    const friend=club.players.find(p=>p.id===otherId(relation,playerId));if(!friend)continue;
    friend.happiness=clamp(friend.happiness-(importance>=70?4:2));
    friend.managerTrust=clamp(friend.managerTrust-(importance>=78?2:1));
    affected.add(friend.id);
  }
  if(context.group&&importance>=65)for(const memberId of context.group.memberIds){
    if(memberId===playerId||affected.has(memberId))continue;
    const member=club.players.find(p=>p.id===memberId);if(!member)continue;
    member.happiness=clamp(member.happiness-2);member.morale=clamp(member.morale-1);affected.add(member.id);
  }
  if(!affected.size)return"A saída teve pouco impacto social no grupo.";
  const leader=context.group?club.players.find(p=>p.id===context.group!.leaderId):undefined;
  return`A saída repercutiu em ${affected.size} companheiro${affected.size===1?"":"s"}${leader?` do núcleo de ${leader.name.split(" ")[0]}`:""}.`;
}

export function applyArrivalImpact(club:LeagueClub,playerId:string){
  const arriving=club.players.find(p=>p.id===playerId);if(!arriving)return"";
  const context=playerSocialContext(club,playerId),bestFriend=context.friends[0],worstRival=context.rivals[0];
  if(bestFriend&&bestFriend.score>=34){
    const friend=club.players.find(p=>p.id===otherId(bestFriend,playerId));
    arriving.happiness=clamp(arriving.happiness+3);arriving.morale=clamp(arriving.morale+2);
    if(friend){friend.happiness=clamp(friend.happiness+1);return`${arriving.name} encontrou apoio imediato de ${friend.name} no vestiário.`;}
  }
  if(worstRival&&worstRival.score<=-32){
    const rival=club.players.find(p=>p.id===otherId(worstRival,playerId));
    arriving.happiness=clamp(arriving.happiness-2);
    if(rival){rival.happiness=clamp(rival.happiness-1);return`A chegada de ${arriving.name} já cria tensão competitiva com ${rival.name}.`;}
  }
  const group=context.group,leader=group?club.players.find(p=>p.id===group.leaderId):undefined;
  if(leader&&leader.id!==arriving.id){arriving.managerTrust=clamp(arriving.managerTrust+1);return`${arriving.name} foi acolhido pelo núcleo de ${leader.name.split(" ")[0]}.`;}
  return`${arriving.name} ainda busca espaço entre os grupos do vestiário.`;
}
