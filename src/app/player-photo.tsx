"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

export type PlayerPhotoIdentity = {
  name: string;
  transfermarktId?: string;
};

type Props = {
  player: PlayerPhotoIdentity;
  size?: number;
  className?: string;
  eager?: boolean;
};

export function playerPhotoUrl(player: PlayerPhotoIdentity) {
  const id = player.transfermarktId?.trim();
  return id && /^\d+$/.test(id) ? `/api/player-photo/${id}` : null;
}

export default function PlayerPhoto({ player, size = 38, className, eager = false }: Props) {
  const src = playerPhotoUrl(player);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);

  const style: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: Math.max(10, Math.round(size * 0.28)),
    objectFit: "cover",
    objectPosition: "center top",
    overflow: "hidden",
  };

  if (!src || failed) {
    return (
      <span
        className={className}
        style={{
          ...style,
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(145deg,var(--accent-strong),#0c5130)",
          color: "#fff",
          fontWeight: 900,
          fontSize: Math.max(11, Math.round(size * 0.31)),
        }}
        role="img"
        aria-label={`Avatar de ${player.name}`}
      >
        {initials(player.name)}
      </span>
    );
  }

  return (
    <Image
      className={className}
      style={{ ...style, display: "block" }}
      src={src}
      width={size}
      height={size}
      unoptimized
      alt={`Foto de ${player.name}`}
      priority={eager}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
