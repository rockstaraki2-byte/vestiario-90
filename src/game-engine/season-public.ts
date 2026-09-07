import { DEFAULT_TACTIC, type MatchResult, type MatchTactic } from "./match";
import { playCurrentRound as playCurrentRoundBase, type SeasonState } from "./season";

export * from "./season";

function pendingUserLeagueFixture(state:SeasonState){
  return state.league.fixtures.find(fixture=>
    fixture.round===state.currentRound&&
    !fixture.played&&
    (fixture.homeClubId===state.selectedClubId||fixture.awayClubId===state.selectedClubId)
  );
}

export function playCurrentRound(
  state:SeasonState,
  userTactic:MatchTactic=DEFAULT_TACTIC,
  userMatchOverride?:MatchResult,
  userParticipantIds?:string[],
):SeasonState{
  if(userMatchOverride&&userParticipantIds?.length){
    const fixture=pendingUserLeagueFixture(state);
    if(!fixture)return state;
    if(fixture.date&&state.currentDate&&fixture.date!==state.currentDate)return state;
  }
  return playCurrentRoundBase(state,userTactic,userMatchOverride,userParticipantIds);
}
