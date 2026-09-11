import { describe, expect, it } from "vitest";
import { parseWorldCupSquadHtml, worldCupSquadTeamKey } from "./national-squad-source";

describe("national squad source",()=>{
 it("parses only the requested national team's table",()=>{
  const rows=Array.from({length:11},(_,index)=>`<tr><td>${index+1}</td><td>${index===0?"GK":index<5?"DF":index<8?"MF":"FW"}</td><td>France Player ${index+1}</td><td>age</td><td>0</td><td>0</td><td>Club ${index+1}</td></tr>`).join("");
  const html=`<h3 id="Brazil">Brazil</h3><table><tr><td>1</td><td>GK</td><td>Brazil Player</td><td>age</td><td>0</td><td>0</td><td>Brazil Club</td></tr></table><h3 id="France">France</h3><table><tr><th>No.</th><th>Pos.</th><th>Player</th><th>DOB</th><th>Caps</th><th>Goals</th><th>Club</th></tr>${rows}</table><h3 id="Senegal">Senegal</h3>`;
  const squad=parseWorldCupSquadHtml(html,"França");
  expect(squad?.players).toHaveLength(11);
  expect(squad?.players[0]).toMatchObject({name:"France Player 1",club:"Club 1",position:"GOL"});
  expect(squad?.players.some(player=>player.name.includes("Brazil"))).toBe(false);
 });

 it("does not pretend unsupported teams have a verified World Cup snapshot",()=>{
  expect(worldCupSquadTeamKey("Itália")).toBeUndefined();
 });
});
