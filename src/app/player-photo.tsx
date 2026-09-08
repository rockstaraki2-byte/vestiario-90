"use client";

import { useEffect, useState, type CSSProperties } from "react";

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
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

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
      <span className={className} style={style} role="img" aria-label={`Avatar de ${player.name}`}>
        {initials(player.name)}
      </span>
    );
  }

  return (
    <img
      className={className}
      style={style}
      src={src}
      alt={`Foto de ${player.name}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
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
