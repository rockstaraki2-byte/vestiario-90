import type { NextConfig } from "next";

const nextConfig:NextConfig={
  images:{
    remotePatterns:[{protocol:"https",hostname:"cdn.soccerwiki.org",pathname:"/images/**"}],
  },
};

export default nextConfig;
