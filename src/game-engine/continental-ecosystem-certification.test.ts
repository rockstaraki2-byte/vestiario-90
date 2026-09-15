import { describe, expect, it } from "vitest";
import { assertContinentalEcosystemCertified, certifyContinentalEcosystem, CONTINENTAL_FIELD_SIZE } from "./continental-ecosystem-certification";
import type { AssociationCoefficientSeason, QualificationProvenance } from "./qualification-ecosystem";

type TestQualificationEntry={name:string;country:string;reason:string;provenance?:QualificationProvenance};
const provenance = (season:number, route:QualificationProvenance["route"]="league"):QualificationProvenance => ({ sourceSeason: season, route, phase: "main" });
function field(prefix:string,count:number,season=2026,country="Teste"):TestQualificationEntry[] {
  return Array.from({length:count},(_,index)=>({name:`${prefix} Club ${index+1}`,country,reason:"Classificação nacional",provenance:provenance(season)}));
}
function validFields(season=2026){
  return {
    LIB:field("LIB",CONTINENTAL_FIELD_SIZE.LIB,season,"Brasil"),
    SUD:field("SUD",CONTINENTAL_FIELD_SIZE.SUD,season,"Argentina"),
    UCL:field("UCL",CONTINENTAL_FIELD_SIZE.UCL,season,"Inglaterra"),
    UEL:field("UEL",CONTINENTAL_FIELD_SIZE.UEL,season,"Espanha"),
    UECL:field("UECL",CONTINENTAL_FIELD_SIZE.UECL,season,"Alemanha"),
  };
}
function historyFor(seasons:number[]):AssociationCoefficientSeason[]{return seasons.flatMap(season=>[
  {season,country:"Inglaterra",points:12,competitions:{UCL:8,UEL:4}},
  {season,country:"Espanha",points:10,competitions:{UCL:6,UECL:4}},
]);}

describe("continental ecosystem certification sprint 11",()=>{
  it("certifica campos completos, reais, exclusivos e com procedência",()=>{
    const certification=certifyContinentalEcosystem({fields:validFields(),associationHistory:historyFor([2026]),sourceSeason:2026});
    expect(certification.status).toBe("certified");
    expect(certification.actualParticipants).toBe(172);
    expect(certification.issues).toEqual([]);
  });

  it("bloqueia campos incompletos, duplicidades e participantes sintéticos",()=>{
    const fields=validFields();
    fields.LIB=fields.LIB.slice(0,31);
    fields.UEL[0]={...fields.UEL[0],name:fields.UCL[0].name};
    fields.UECL[0]={...fields.UECL[0],name:"Classificado UECL 1"};
    const certification=certifyContinentalEcosystem({fields,associationHistory:historyFor([2026]),sourceSeason:2026});
    expect(certification.status).toBe("blocked");
    expect(certification.issues.some(item=>item.code==="FIELD_SIZE")).toBe(true);
    expect(certification.issues.some(item=>item.code==="CROSS_COMPETITION_DUPLICATE")).toBe(true);
    expect(certification.issues.some(item=>item.code==="SYNTHETIC_CLUB")).toBe(true);
    expect(()=>assertContinentalEcosystemCertified(certification)).toThrow(/blocked/i);
  });

  it("avisa sobre procedência ausente sem invalidar um campo esportivamente íntegro",()=>{
    const fields=validFields();
    delete fields.UCL[0].provenance;
    const certification=certifyContinentalEcosystem({fields,associationHistory:historyFor([2026]),sourceSeason:2026});
    expect(certification.status).toBe("warning");
    expect(certification.issues.some(item=>item.code==="MISSING_PROVENANCE")).toBe(true);
  });

  it("bloqueia histórico de coeficientes fora da janela de cinco temporadas",()=>{
    const certification=certifyContinentalEcosystem({fields:validFields(2031),associationHistory:historyFor([2026,2027,2028,2029,2030,2031]),sourceSeason:2031});
    expect(certification.status).toBe("blocked");
    expect(certification.issues.some(item=>item.code==="COEFFICIENT_WINDOW")).toBe(true);
  });

  it("permanece certificado em cinco ciclos consecutivos com campos renovados",()=>{
    for(let season=2026;season<=2030;season++){
      const history=historyFor(Array.from({length:season-2025},(_,index)=>2026+index).slice(-5));
      const certification=certifyContinentalEcosystem({fields:validFields(season),associationHistory:history,sourceSeason:season});
      expect(certification.status,`season ${season}`).toBe("certified");
      expect(certification.associationSeasons.length).toBeLessThanOrEqual(5);
    }
  });
});
