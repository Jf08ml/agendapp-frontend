// Píxeles de Meta y TikTok del negocio (design system, AjustesWeb · Fase 3).
// Se cargan solo en las páginas que ve el cliente (no en el panel) y registran
// la visita y la reserva completada, como ya se hace con Google
// (orgGoogleTags.ts). Los scripts son los oficiales de cada red.

// `window.fbq` ya está declarado en metaPixel.ts (píxel propio de AgenditApp,
// solo en el registro de negocios; aquí no se cruzan: ese no carga en tenants).
declare global {
  interface Window {
    ttq?:{ load: (id: string) => void; page: () => void; track: (event: string, data?: Record<string, unknown>) => void } & Record<string, unknown>;
    TiktokAnalyticsObject?: string;
  }
}

export interface PixelConfig {
  metaPixelId?: string;
  tiktokPixelId?: string;
}

/** ID de píxel de Meta: solo dígitos (15–16 normalmente). */
export const isMetaPixelId = (id?: string) => !!id && /^\d{10,20}$/.test(id.trim());
/** ID de píxel de TikTok: letras mayúsculas y números (≈20). */
export const isTikTokPixelId = (id?: string) => !!id && /^[A-Z0-9]{15,30}$/.test(id.trim());

let loadedMeta: string | null = null;
let loadedTikTok: string | null = null;

function loadMeta(id: string) {
  if (loadedMeta === id) return;
  if (!window.fbq) {
    // Snippet oficial de Meta Pixel (fbevents.js), sin el <noscript>
    /* eslint-disable */
    (function (f: any, b: Document, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function (...args: unknown[]) {
        n.callMethod ? n.callMethod(...args) : n.queue.push(args);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode!.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
  }
  window.fbq!("init", id);
  window.fbq!("track", "PageView");
  loadedMeta = id;
}

function loadTikTok(id: string) {
  if (loadedTikTok === id) return;
  if (!window.ttq) {
    // Snippet oficial de TikTok Pixel (events.js)
    /* eslint-disable */
    (function (w: any, d: Document, t: string) {
      w.TiktokAnalyticsObject = t;
      const ttq: any = (w[t] = w[t] || []);
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
      ttq.setAndDefer = function (obj: any, m: string) {
        obj[m] = function (...args: unknown[]) {
          obj.push([m, ...args]);
        };
      };
      for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (n: string) {
        const e = ttq._i[n] || [];
        for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(e, ttq.methods[i]);
        return e;
      };
      ttq.load = function (e: string, n?: unknown) {
        const u = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = u;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        const s = d.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        s.src = `${u}?sdkid=${e}&lib=${t}`;
        const a = d.getElementsByTagName("script")[0];
        a.parentNode!.insertBefore(s, a);
      };
    })(window, document, "ttq");
    /* eslint-enable */
  }
  window.ttq!.load(id);
  window.ttq!.page();
  loadedTikTok = id;
}

/** Carga los píxeles configurados y registra la visita. Idempotente por ID. */
export function registerOrgPixels(config?: PixelConfig): void {
  if (typeof window === "undefined") return;
  const meta = config?.metaPixelId?.trim();
  const tiktok = config?.tiktokPixelId?.trim();
  try {
    if (isMetaPixelId(meta)) loadMeta(meta!);
    if (isTikTokPixelId(tiktok)) loadTikTok(tiktok!);
  } catch {
    /* un bloqueador de anuncios no debe romper la página */
  }
}

/** Reserva completada: «Schedule» en Meta y «SubmitForm» en TikTok (solo si se cargaron). */
export function trackPixelsBooking(): void {
  try {
    if (loadedMeta && window.fbq) window.fbq("track", "Schedule");
    if (loadedTikTok && window.ttq) window.ttq.track("SubmitForm");
  } catch {
    /* silencioso */
  }
}
