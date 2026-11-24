// Ayudas de Ajustes (design system, Fase 2): copiar el horario del lunes,
// la política de cancelación como la lee el cliente, el contraste del color
// de marca en lenguaje claro y las redes sociales por usuario.
// Módulo puro para probarlo con `node --test`.
import { contrast, onBrandColor, readableBrandText, isHexColor } from "../../../theme/brandTokens.ts";

// ── Horario: «Copiar lunes a todos» ─────────────────────────────────────────

export interface DayScheduleLike {
  day: number;
  isOpen: boolean;
  start: string;
  end: string;
  breaks: { start: string; end: string; note?: string }[];
}

/**
 * Copia horas y descansos de `fromDay` a los demás días abiertos. Los días
 * cerrados siguen cerrados (el domingo no se abre solo).
 */
export function copyDayToOpenDays<T extends DayScheduleLike>(schedule: T[], fromDay = 1): T[] {
  const src = schedule.find((d) => d.day === fromDay);
  if (!src) return schedule;
  return schedule.map((d) =>
    d.day === fromDay || !d.isOpen
      ? d
      : { ...d, start: src.start, end: src.end, breaks: src.breaks.map((b) => ({ ...b })) }
  );
}

/** Días abiertos (sin contar `fromDay`) que cambiarían al copiar. */
export function daysChangedByCopy(schedule: DayScheduleLike[], fromDay = 1): number {
  const src = schedule.find((d) => d.day === fromDay);
  if (!src) return 0;
  const sig = (d: DayScheduleLike) => JSON.stringify([d.start, d.end, d.breaks.map((b) => [b.start, b.end])]);
  return schedule.filter((d) => d.day !== fromDay && d.isOpen && sig(d) !== sig(src)).length;
}

// ── Política: «Así lo ve tu cliente» ────────────────────────────────────────

export interface ClientPolicyInput {
  cancelMinHours?: number | null;
  preventCancellingConfirmed?: boolean;
  rescheduleEnabled?: boolean;
  maxReschedules?: number | null;
  rescheduleMinHours?: number | null;
}

const hoursText = (h: number) => (h % 24 === 0 && h >= 24 ? (h === 24 ? "1 día" : `${h / 24} días`) : h === 1 ? "1 hora" : `${h} horas`);

/** Frases que ve el cliente en el enlace de su cita. */
export function clientPolicyLines(p: ClientPolicyInput): string[] {
  const lines: string[] = [];
  const cancelH = Math.max(0, Number(p.cancelMinHours) || 0);
  lines.push(
    cancelH > 0
      ? `Puedes cancelar tu cita hasta ${hoursText(cancelH)} antes. Después, escríbele al negocio.`
      : "Puedes cancelar tu cita en cualquier momento antes de que empiece."
  );
  if (p.preventCancellingConfirmed) {
    lines.push("Si ya confirmaste tu asistencia, no puedes cancelarla desde el enlace: escríbele al negocio.");
  }
  if (p.rescheduleEnabled) {
    const max = Math.max(1, Number(p.maxReschedules) || 1);
    const resH = Math.max(0, Number(p.rescheduleMinHours) || 0);
    const veces = max === 1 ? "una vez" : `hasta ${max} veces`;
    lines.push(
      resH > 0
        ? `Puedes cambiar el día o la hora ${veces}, hasta ${hoursText(resH)} antes de la cita.`
        : `Puedes cambiar el día o la hora ${veces}, hasta el último momento.`
    );
  } else {
    lines.push("Para cambiar el día o la hora, escríbele al negocio.");
  }
  return lines;
}

// ── Marca: contraste en lenguaje claro ──────────────────────────────────────

export interface BrandContrastAdvice {
  tone: "success" | "info";
  text: string;
  /** Tono que usamos para enlaces cuando hubo que ajustarlo. */
  adjustedText?: string;
}

export function brandContrastAdvice(hex: string | null | undefined): BrandContrastAdvice | null {
  if (!isHexColor(hex)) return null;
  const color = hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
  const darkOnButton = onBrandColor(color) !== "#ffffff";
  const buttonText = darkOnButton ? "texto oscuro" : "texto blanco";
  const linkColor = readableBrandText(color, "light");
  if (contrast(color, "#ffffff") >= 4.5) {
    return { tone: "success", text: `Tu color se lee bien: los botones llevan ${buttonText} y los enlaces usan tu color tal cual.` };
  }
  return {
    tone: "info",
    text: `Tu color es claro para leerse como texto sobre blanco. Los botones lo usan tal cual con ${buttonText}, y para los enlaces usamos un tono un poco más oscuro.`,
    adjustedText: linkColor,
  };
}

// ── Redes sociales: usuario → enlace ────────────────────────────────────────

export type SocialNetwork = "instagram" | "facebook" | "tiktok" | "whatsapp";

export const SOCIAL_PREFIX: Record<SocialNetwork, string> = {
  instagram: "instagram.com/",
  facebook: "facebook.com/",
  tiktok: "tiktok.com/@",
  whatsapp: "wa.me/",
};

const NETWORK_LABEL: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

const HOSTS: Record<SocialNetwork, RegExp> = {
  instagram: /^(www\.)?instagram\.com$/i,
  facebook: /^((www|m|web)\.)?(facebook|fb)\.com$/i,
  tiktok: /^(www\.|m\.)?tiktok\.com$/i,
  whatsapp: /^(wa\.me|(api\.|web\.)?whatsapp\.com)$/i,
};

function parseUrl(value: string): URL | null {
  const v = value.trim();
  if (!v) return null;
  try {
    return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    return null;
  }
}

const looksLikeUrl = (v: string) => /^https?:\/\//i.test(v) || /^[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(v) || /\.(com|me)\b/i.test(v);

/** Usuario guardado en el enlace, o `null` si el enlace no es de esa red. */
export function socialHandle(network: SocialNetwork, url: string | null | undefined): string | null {
  const u = parseUrl(url ?? "");
  if (!u || !HOSTS[network].test(u.hostname)) return null;
  const path = u.pathname.replace(/^\/+|\/+$/g, "");
  switch (network) {
    case "instagram":
      return path.split("/")[0] || null;
    case "tiktok": {
      const h = path.split("/")[0];
      return h?.startsWith("@") ? h.slice(1) || null : null;
    }
    case "facebook":
      if (path === "profile.php") {
        const id = u.searchParams.get("id");
        return id ? `profile.php?id=${id}` : null;
      }
      return path || null;
    case "whatsapp": {
      const phone = u.hostname.toLowerCase() === "wa.me" ? path : u.searchParams.get("phone") ?? "";
      const digits = phone.replace(/\D/g, "");
      return digits || null;
    }
  }
}

/** Lo que escribe el negocio (usuario, @usuario, número o enlace) → enlace. */
export function socialUrl(network: SocialNetwork, input: string): string {
  const v = input.trim();
  if (!v) return "";
  if (network !== "whatsapp" && looksLikeUrl(v)) {
    const h = socialHandle(network, v);
    return h ? `https://${SOCIAL_PREFIX[network]}${h}` : v; // de otra red: lo marca la validación
  }
  if (network === "whatsapp") {
    const fromUrl = looksLikeUrl(v) ? socialHandle("whatsapp", v) : null;
    if (looksLikeUrl(v) && !fromUrl) return v;
    const digits = (fromUrl ?? v).replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }
  const handle = v.replace(/^@+/, "").replace(/\s+/g, "");
  if (!handle) return "";
  return `https://${SOCIAL_PREFIX[network]}${handle}`;
}

/** Error en lenguaje claro, o `null` si el enlace está bien (o vacío). */
export function socialError(network: SocialNetwork, url: string | null | undefined): string | null {
  const v = (url ?? "").trim();
  if (!v) return null;
  const h = socialHandle(network, v);
  if (!h) return `Ese enlace no es de ${NETWORK_LABEL[network]}. Escribe solo tu ${network === "whatsapp" ? "número" : "usuario"}.`;
  if (network === "whatsapp" && (h.length < 8 || h.length > 15)) return "Escribe el número con el indicativo del país, por ejemplo 57 300 123 4567.";
  if ((network === "instagram" || network === "tiktok") && !/^[A-Za-z0-9._]{1,30}$/.test(h)) return "El usuario solo puede tener letras, números, puntos y guiones bajos.";
  return null;
}
