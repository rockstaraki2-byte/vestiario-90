import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist_Mono, Inter } from "next/font/google";
import PwaClient from "./pwa-client";
import "./globals.css";

const inter=Inter({variable:"--font-sans",subsets:["latin"],display:"swap"});
const display=Barlow_Condensed({variable:"--font-display",subsets:["latin"],weight:["600","700","800","900"],display:"swap"});
const mono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"],display:"swap"});
export const viewport:Viewport={themeColor:"#0c1110"};
export const metadata:Metadata={title:"Vestiário 90 — Manager de Futebol",description:"Suas decisões. O mundo reage.",manifest:"/manifest.webmanifest",icons:{icon:[{url:"/icon-192.png",sizes:"192x192",type:"image/png"},{url:"/icon-512.png",sizes:"512x512",type:"image/png"}],apple:"/icon-192.png"},appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"Vestiário 90"}};
export default function RootLayout({children}:LayoutProps<"/">){return <html lang="pt-BR" className={`${inter.variable} ${display.variable} ${mono.variable}`}><body>{children}<PwaClient/></body></html>}
