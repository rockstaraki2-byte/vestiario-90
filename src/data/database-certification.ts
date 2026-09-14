import { DATABASE_ENGINE_SUPPORTED_IDS, DATABASE_STATUS_ROWS, type DatabaseStatusRow } from "./database-status";
import { DOMESTIC_CUP_FIELD_CONFIGS } from "./world-2026/domestic-cup-fields";
import { INTERNATIONAL_CUP_FIELD_CONFIGS } from "./world-2026/international-cup-fields";

export type DatabaseCertificationLevel="certified"|"warning"|"blocked";
export type DatabaseCertificationIssue={competitionId:string;code:string;message:string;blocking:boolean};
export type DatabaseCertificationReport={level:DatabaseCertificationLevel;certifiedAt:string;releaseRows:number;issues:DatabaseCertificationIssue[];blockingIssues:DatabaseCertificationIssue[];warnings:DatabaseCertificationIssue[]};

const expectedById=new Map<string,number>([
 ...DOMESTIC_CUP_FIELD_CONFIGS.map(config=>[config.id,config.fieldSize] as const),
 ...INTERNATIONAL_CUP_FIELD_CONFIGS.map(config=>[config.id,config.expectedParticipants] as const),
]);

function issue(row:DatabaseStatusRow|undefined,competitionId:string,code:string,message:string,blocking:boolean):DatabaseCertificationIssue{
 return{competitionId:row?.id??competitionId,code,message,blocking};
}

export function certifyDatabase(snapshotDate=new Date().toISOString().slice(0,10)):DatabaseCertificationReport{
 const issues:DatabaseCertificationIssue[]=[];
 for(const competitionId of DATABASE_ENGINE_SUPPORTED_IDS){
  const row=DATABASE_STATUS_ROWS.find(item=>item.id===competitionId);
  if(!row){issues.push(issue(undefined,competitionId,"missing-row","Competição jogável sem linha no painel de saúde",true));continue;}
  const expected=expectedById.get(competitionId)??row.expectedClubs;
  if(row.status==="error")issues.push(issue(row,competitionId,"status-error","Competição jogável está em estado de erro",true));
  if(row.engineStatus!=="updated")issues.push(issue(row,competitionId,"engine-not-ready","Motor da competição não está marcado como atualizado",true));
  if(expected!==undefined&&row.clubs!==expected)issues.push(issue(row,competitionId,"participant-count",`Participantes reais ${row.clubs}/${expected}`,true));
  if(row.virtualClubs>0)issues.push(issue(row,competitionId,"virtual-club",`${row.virtualClubs} clube(s) virtual(is) em competição jogável`,true));
  if(row.suspiciousPlayers>0)issues.push(issue(row,competitionId,"suspicious-player",`${row.suspiciousPlayers} jogador(es) suspeito(s)`,true));
  if(row.shortRosterClubs>0)issues.push(issue(row,competitionId,"short-roster",`${row.shortRosterClubs} clube(s) com elenco abaixo do mínimo`,true));
  if(row.missingCrestClubs>0)issues.push(issue(row,competitionId,"missing-crest",`${row.missingCrestClubs} clube(s) sem escudo válido`,false));
 }
 for(const row of DATABASE_STATUS_ROWS){
  if(DATABASE_ENGINE_SUPPORTED_IDS.has(row.id))continue;
  for(const alert of row.alerts.filter(alert=>alert.severity==="error"))issues.push(issue(row,row.id,alert.code,alert.message,false));
 }
 const blockingIssues=issues.filter(item=>item.blocking),warnings=issues.filter(item=>!item.blocking);
 return{level:blockingIssues.length?"blocked":warnings.length?"warning":"certified",certifiedAt:snapshotDate,releaseRows:DATABASE_ENGINE_SUPPORTED_IDS.size,issues,blockingIssues,warnings};
}

export const DATABASE_CERTIFICATION_REPORT=certifyDatabase();
