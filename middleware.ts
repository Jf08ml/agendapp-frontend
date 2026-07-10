// Vercel Edge Middleware.
//
// El manifest de la PWA es dinámico por organización (lo genera el backend
// leyendo el dominio del tenant). Un simple "rewrite" en vercel.json hacia una
// URL absoluta externa no sirve para esto: Vercel reemplaza el header Host por
// el del destino (api.agenditapp.com), así que el backend nunca ve el dominio
// real del negocio (ej. soylashista.agenditapp.com) y no puede resolver la
// organización. Este middleware intercepta la petición, toma el Host original,
// y hace el fetch al backend pasándolo explícitamente en X-Tenant-Domain (el
// mismo header que ya usa el resto del frontend vía axios interceptors).
export const config = {
  matcher: "/manifest.webmanifest",
};

export default async function middleware(request: Request) {
  const host = request.headers.get("host") || "";
  const forwardedFor = request.headers.get("x-forwarded-for") || "";

  const upstream = await fetch("https://api.agenditapp.com/api/manifest.webmanifest", {
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
