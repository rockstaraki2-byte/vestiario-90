"use client";

import { useState } from "react";

export default function TeamBadge({name,src,kind="club",size=28,className}:{name:string;src?:string;kind?:"club"|"nation";size?:number;className?:string}){
  const [failed,setFailed]=useState(false);
  const resolved=src||`/api/team-badge?kind=${kind}&name=${encodeURIComponent(name)}`;
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"V90";
  if(failed)return <span className={className} aria-label={name} title={name} style={{width:size,height:size,minWidth:size,borderRadius:kind==="nation"?"50%":"22%",display:"inline-grid",placeItems:"center",background:"#1d2b25",border:"1px solid #33453d",fontSize:Math.max(7,Math.round(size*.28)),fontWeight:900,color:"#a9bcb2",overflow:"hidden"}}>{initials}</span>;
  return <span className={className} aria-label={name} title={name} style={{width:size,height:size,minWidth:size,display:"inline-grid",placeItems:"center",overflow:"hidden"}}><img src={resolved} alt={name} width={size} height={size} loading="lazy" onError={()=>setFailed(true)} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/></span>;
}
