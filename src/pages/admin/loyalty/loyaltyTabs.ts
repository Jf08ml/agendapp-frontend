// Pestañas de Clientes › Fidelidad. Puro (sin React) para probarlo con node --test.

export type LoyaltyTabKey = "clientes" | "programa" | "tarjeta" | "mensajes";

export const LOYALTY_TABS: { key: LoyaltyTabKey; label: string }[] = [
  { key: "clientes", label: "Clientes" },
  { key: "programa", label: "Programa" },
  { key: "tarjeta", label: "Tarjeta" },
  { key: "mensajes", label: "Mensajes" },
];

/**
 * Pestaña a mostrar: la pedida en ?tab= si el rol puede verla; si no, la
 * primera permitida; null si no puede ver ninguna.
 */
export function resolveLoyaltyTab(requested: string | null, allowed: LoyaltyTabKey[]): LoyaltyTabKey | null {
  if (requested && (allowed as string[]).includes(requested)) return requested as LoyaltyTabKey;
  return allowed[0] ?? null;
}
