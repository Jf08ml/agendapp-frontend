// Vercel Edge Middleware.
//
// 1) Manifest de la PWA: es dinámico por organización (lo genera el backend
//    leyendo el dominio del tenant). Un simple "rewrite" en vercel.json hacia una
//    URL absoluta externa no sirve para esto: Vercel reemplaza el header Host por
//    el del destino (api.agenditapp.com), así que el backend nunca ve el dominio
//    real del negocio (ej. soylashista.agenditapp.com) y no puede resolver la
//    organización. Este middleware intercepta la petición, toma el Host original,
//    y hace el fetch al backend pasándolo explícitamente en X-Tenant-Domain (el
//    mismo header que ya usa el resto del frontend vía axios interceptors).
//
// 2) Vista previa del enlace (Open Graph): WhatsApp, Facebook, Telegram, etc.
//    no ejecutan JS, así que la SPA solo les mostraba "Mi agenda" sin imagen.
//    A esos bots (y solo a ellos) se les responde un HTML mínimo con el nombre,
//    la descripción y el logo del negocio. Las personas siguen recibiendo la
//    app normal, sin costo extra.
export const config = {
  matcher: ["/manifest.webmanifest", "/((?!assets/|api/).*)"],
};

const API_BASE = "https://api.agenditapp.com/api";

// Bots de vista previa de enlaces. Googlebot no: renderiza JS y debe indexar la app.
const PREVIEW_BOT_RE =
  /whatsapp|facebookexternalhit|facebot|meta-externalagent|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|skypeuripreview|pinterest|redditbot|applebot|embedly|vkshare|viber/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function manifest(request: Request, host: string, forwardedFor: string) {
  // Reenviar el query string (?start=/mi-tarjeta/<token> desde la tarjeta de fidelidad).
  const search = new URL(request.url).search;
  const upstream = await fetch(`${API_BASE}/manifest.webmanifest${search}`, {
    headers: {
      "X-Tenant-Domain": host,
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
  });

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/manifest+json",
      "Cache-Control": upstream.headers.get("cache-control") || "no-store",
    },
  });
}

type OgMeta = { title: string; siteName: string; description: string; image: string | null };

async function previewPage(request: Request, host: string): Promise<Response | undefined> {
  let meta: OgMeta;
  try {
    const upstream = await fetch(`${API_BASE}/og-meta`, { headers: { "X-Tenant-Domain": host } });
    if (!upstream.ok) return undefined; // dominio sin organización (p. ej. el sitio principal)
    meta = (await upstream.json()) as OgMeta;
  } catch {
    return undefined; // si el backend falla, el bot recibe la app normal
  }

  const url = request.url;
  const title = escapeHtml(meta.title || meta.siteName || "");
  const siteName = escapeHtml(meta.siteName || meta.title || "");
  const description = escapeHtml(meta.description || "");
  const image = meta.image ? escapeHtml(meta.image) : "";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:site_name" content="${siteName}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
${image ? `<meta property="og:image" content="${image}" />\n<meta property="og:image:alt" content="${siteName}" />` : ""}
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
${image ? `<meta name="twitter:image" content="${image}" />` : ""}
</head>
<body><a href="${escapeHtml(url)}">${title}</a></body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export default async function middleware(request: Request) {
  const host = request.headers.get("host") || "";
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const { pathname } = new URL(request.url);

  if (pathname === "/manifest.webmanifest") return manifest(request, host, forwardedFor);

  // Solo páginas (sin extensión de archivo) y solo bots de vista previa.
  // Devolver undefined deja pasar la petición a la app normal.
  if (/\.[a-z0-9]+$/i.test(pathname)) return undefined;
  const userAgent = request.headers.get("user-agent") || "";
  if (!PREVIEW_BOT_RE.test(userAgent)) return undefined;

  return previewPage(request, host);
}
