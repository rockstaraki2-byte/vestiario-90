import { BadgeCheck, Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import { buildSocialFeed } from "@/game-engine/social-feed";
import type { SeasonState } from "@/game-engine/season";
import styles from "./social-feed-panel.module.css";

export default function SocialFeedPanel({season}:{season:SeasonState}){
 const posts=buildSocialFeed(season);
 return <section className={styles.feed}>
  <header><div><span>FEED DO FUTEBOL</span><b>O que estão falando no mundo do save</b><small>Clubes, torcida, mercado, jornalistas e premiações aparecem como posts simulados.</small></div><em>SIMULAÇÃO</em></header>
  <div className={styles.posts}>{posts.map(post=><article key={post.id} className={styles[post.tone]}><div className={styles.avatar}>{initials(post.displayName)}</div><div className={styles.body}><header><div><b>{post.displayName}</b>{post.verified&&<BadgeCheck/>}<span>{post.handle}</span></div><small>{post.platform} • {post.kind}</small></header><p>{post.body}</p>{post.context&&<blockquote>{post.context}</blockquote>}<footer><span><MessageCircle/>{compact(post.replies)}</span><span><Repeat2/>{compact(post.reposts)}</span><span><Heart/>{compact(post.likes)}</span><span><Share2/></span></footer></div></article>)}</div>
 </section>;
}
function initials(value:string){return value.split(/\s+/).filter(Boolean).slice(0,2).map(item=>item[0]).join("").toUpperCase()||"V90"}
function compact(value:number){return new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(value)}
