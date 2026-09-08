const TM_API = "https://tmapi-alpha.transfermarkt.technology";
const IMAGE_HOSTS = new Set(["img.a.transfermarkt.technology", "tmssl.akamaized.net"]);
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const API_HEADERS = {
  Accept: "application/json",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
  "User-Agent": "Mozilla/5.0 (compatible; Vestiario90/1.0)",
};

type PhotoCandidate = { url: string; score: number };

function scorePhotoUrl(url: string, path: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return -1000;
  }
  if (parsed.protocol !== "https:" || !IMAGE_HOSTS.has(parsed.hostname)) return -1000;

  const target = `${path} ${parsed.pathname}`.toLowerCase();
  if (/wappen|club|logo|flag|flagge|icon/.test(target)) return -1000;

  let score = 0;
  if (/portrait|profile|player|person|image|photo|picture/.test(target)) score += 35;
  if (/header|medium|big|large|original/.test(target)) score += 8;
  if (parsed.hostname === "img.a.transfermarkt.technology") score += 10;
  if (/\.avif$|\.webp$|\.jpe?g$|\.png$/i.test(parsed.pathname)) score += 5;
  return score;
}

function collectPhotoCandidates(value: unknown, path = "root", output: PhotoCandidate[] = [], state = { visited: 0 }) {
  if (state.visited++ > 5000) return output;
  if (typeof value === "string" && value.startsWith("https://")) {
    const score = scorePhotoUrl(value, path);
    if (score > -1000) output.push({ url: value, score });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPhotoCandidates(item, `${path}[${index}]`, output, state));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) =>
      collectPhotoCandidates(item, `${path}.${key}`, output, state),
    );
  }
  return output;
}

async function fetchJson(path: string) {
  const response = await fetch(`${TM_API}/${path}`, {
    headers: API_HEADERS,
    next: { revalidate: 604800 },
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

async function resolvePlayerPhoto(transfermarktId: string) {
  const profile = await fetchJson(`player/${transfermarktId}`);
  let candidates = profile ? collectPhotoCandidates(profile) : [];

  if (!candidates.length) {
    const gallery = await fetchJson(`player/${transfermarktId}/gallery`);
    candidates = gallery ? collectPhotoCandidates(gallery) : [];
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transfermarktId: string }> },
) {
  const { transfermarktId } = await params;
  if (!/^\d{1,10}$/.test(transfermarktId)) {
    return new Response("Invalid player id", { status: 400, headers: { "Cache-Control": CACHE_CONTROL } });
  }

  try {
    const photoUrl = await resolvePlayerPhoto(transfermarktId);
    if (!photoUrl) {
      return new Response("Player photo not found", { status: 404, headers: { "Cache-Control": CACHE_CONTROL } });
    }

    const photo = await fetch(photoUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://www.transfermarkt.com/",
        "User-Agent": API_HEADERS["User-Agent"],
      },
      next: { revalidate: 604800 },
    });
    const contentType = photo.headers.get("content-type") ?? "";
    if (!photo.ok || !contentType.startsWith("image/")) {
      return new Response("Player photo unavailable", { status: 502, headers: { "Cache-Control": CACHE_CONTROL } });
    }

    return new Response(await photo.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        "X-Player-Photo-Source": "Transfermarkt",
      },
    });
  } catch {
    return new Response("Player photo unavailable", {
      status: 502,
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }
}
