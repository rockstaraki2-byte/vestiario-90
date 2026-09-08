import type { LucideIcon as RealLucideIcon } from "lucide-react";

declare module "react" {
  export type LucideIcon = RealLucideIcon;
}

export {};
