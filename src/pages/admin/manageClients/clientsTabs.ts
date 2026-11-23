// Pestañas de «Clientes y fidelidad» (decisión 6). Puro (sin React) para
// probarlo con node --test.

export type ClientsTabKey = "clientes" | "seguimientos" | "programa" | "tarjeta";

export const CLIENTS_TABS: { key: ClientsTabKey; label: string }[] = [
  { key: "clientes", label: "Clientes" },
  { key: "seguimientos", label: "Seguimientos" },
  { key: "programa", label: "Programa de fidelidad" },
  { key: "tarjeta", label: "Tarjeta" },
];

/**
 * Pestaña a mostrar: la pedida en ?tab= si el rol puede verla; si no, la
 * primera permitida (Clientes).
 */
export function resolveClientsTab(requested: string | null, allowed: ClientsTabKey[]): ClientsTabKey {
  if (requested && (allowed as string[]).includes(requested)) return requested as ClientsTabKey;
  return allowed[0] ?? "clientes";
}
