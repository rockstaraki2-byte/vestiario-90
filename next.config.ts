import type { NextConfig } from "next";

const nextConfig:NextConfig={
  images:{remotePatterns:[{protocol:"https",hostname:"cdn.soccerwiki.org",pathname:"/images/**"},{protocol:"https",hostname:"tmssl.akamaized.net",pathname:"/images/**"}]},
  async headers(){return[
    {source:"/sw.js",headers:[{key:"Cache-Control",value:"public, max-age=0, must-revalidate"},{key:"Service-Worker-Allowed",value:"/"}]},
    {source:"/manifest.webmanifest",headers:[{key:"Cache-Control",value:"public, max-age=0, must-revalidate"}]},
  ];},
};
export default nextConfig;
