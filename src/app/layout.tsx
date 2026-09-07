import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaClient from "./pwa-client";
import "./globals.css";

const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
export const viewport:Viewport={themeColor:"#07110f"};
export const metadata:Metadata={title:"Vestiário 90 — Manager de Futebol",description:"Suas decisões. O mundo reage.",manifest:"/manifest.webmanifest",icons:{icon:[{url:"/icon-192.png",sizes:"192x192",type:"image/png"},{url:"/icon-512.png",sizes:"512x512",type:"image/png"}],apple:"/icon-192.png"},appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"Vestiário 90"}};
export default function RootLayout({children}:LayoutProps<"/">){return <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}><body>{children}<PwaClient/></body></html>}
