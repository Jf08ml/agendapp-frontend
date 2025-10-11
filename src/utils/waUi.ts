import type { WaCode } from "../utils/waRealtime";

export type PrimaryCta =
  | { label: string; onClick: () => void }
  | null;

/**
 * Regla única para decidir el CTA principal según el estado de WA.
 * 100% pura (sin React), ideal para reutilizar en web, móvil o tests.
 */
export function computePrimaryCta(
  code: WaCode,
  reason: string | undefined,
  qrTtl: number,
  longConnecting: boolean | 0 | null,
  connect: (opts?: { forceFresh?: boolean }) => void
): PrimaryCta {
  if (code === "ready") return null;

  if (code === "waiting_qr") {
    return {
      label: qrTtl === 0 ? "Regenerar QR" : "Mostrar QR (activo)",
      onClick: () => connect(),
    };
  }

  if (code === "disconnected" || reason === "not_found" || code === "auth_failure") {
    return {
      label: "Conectar y mostrar QR",
      onClick: () => connect({ forceFresh: code === "auth_failure" }),
    };
  }

  if (code === "error") {
    return { label: "Reintentar", onClick: () => connect() };
  }

  if (longConnecting) {
    return { label: "Forzar nueva sesión", onClick: () => connect({ forceFresh: true }) };
  }

  return { label: "Conectar / Mostrar QR", onClick: () => connect() };
}
