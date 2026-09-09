export type RealClubStaffRole="head_coach"|"assistant_coach"|"goalkeeping_coach"|"fitness_coach"|"sporting_director"|"technical_director"|"president"|"chairman"|"medical"|"other";
export type RealClubStaffMember={name:string;role:RealClubStaffRole;sourcePath:string};
export type RealClubStructure={transfermarktClubId:number;clubName:string;asOf:string;staff:RealClubStaffMember[]};
export const REAL_CLUB_STRUCTURES_2026:RealClubStructure[]=[];
