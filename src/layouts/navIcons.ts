// Íconos (Tabler, trazo 1.75) de la navegación del panel, por clave.
import {
  IconBrandWhatsapp,
  IconBuildingStore,
  IconCalendarEvent,
  IconCash,
  IconChartBar,
  IconDots,
  IconGift,
  IconInbox,
  IconSchool,
  IconSettings,
  IconTags,
  IconUser,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import type { NavIconKey } from "./adminNavigation";

export const NAV_ICONS: Record<NavIconKey, Icon> = {
  agenda: IconCalendarEvent,
  reservations: IconInbox,
  clients: IconUsers,
  loyalty: IconGift,
  cash: IconCash,
  store: IconBuildingStore,
  whatsapp: IconBrandWhatsapp,
  analytics: IconChartBar,
  catalog: IconTags,
  employees: IconUser,
  classes: IconSchool,
  settings: IconSettings,
  more: IconDots,
};

/** Iniciales del negocio (hasta 2) para cuando no hay logo. */
export function orgInitials(name?: string): string {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
