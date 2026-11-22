// Navegación del panel (rediseño, AdminNav del design system).
//
// Módulo puro: sin React, para poder probarlo con `node --test`. Los íconos se
// resuelven por clave en AdminNavbar.tsx.
//
// Cinco grupos por tarea (Hoy, Clientes, Ventas, Marketing, Negocio) en lugar de
// la lista de enlaces «Gestionar …». Cada ítem agrupa una o más rutas que ya
// existían; ninguna ruta se quita: si un ítem tiene varias, se muestran como
// subenlaces (hasta que cada sección tenga sus propias pestañas). Los permisos y
// límites del plan son los mismos que tenía layouts/NavbarLinks.tsx.

export type NavIconKey =
  | "agenda"
  | "reservations"
  | "clients"
  | "loyalty"
  | "cash"
  | "store"
  | "whatsapp"
  | "analytics"
  | "catalog"
  | "employees"
  | "classes"
  | "settings"
  | "more";

export interface NavPermissions {
  businessInfo: boolean;
  employeeInfo: boolean;
  clientsRead: boolean;
  servicesRead: boolean;
  employeesRead: boolean;
  apptsAll: boolean;
  apptsOwn: boolean;
  onlineRes: boolean;
  cashRead: boolean;
  inventoryRead: boolean;
  whatsappRead: boolean;
  analyticsRead: boolean;
  packagesRead: boolean;
  classesRead: boolean;
  campaignsRead: boolean;
}

export interface PlanLimitsLike {
  whatsappIntegration?: boolean;
  analyticsAdvanced?: boolean;
  servicePackages?: boolean;
  classesModule?: boolean;
  campaignsWhatsapp?: boolean;
}

export interface NavLeaf {
  label: string;
  /** Ruta, con query opcional (p. ej. "/informacion-negocio?tab=fidelity"). */
  to: string;
  visible: boolean;
  /** Punto rojo de «hay novedades». */
  dot?: boolean;
}

export interface NavItem {
  key: string;
  label: string;
  icon: NavIconKey;
  /** Rutas de la sección. Si solo una es visible, el ítem enlaza directo a ella. */
  links: NavLeaf[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Mismos permisos y límites del plan que layouts/NavbarLinks.tsx (antes del rediseño). */
export function computeNavPermissions(
  hasPermission: (permission: string) => boolean,
  limits: PlanLimitsLike | undefined | null
): NavPermissions {
  return {
    businessInfo: hasPermission("businessInformation:read"),
    employeeInfo: hasPermission("employeeInformation:read"),
    clientsRead: hasPermission("clients:read"),
    servicesRead: hasPermission("services:read"),
    employeesRead: hasPermission("employees:read"),
    apptsAll: hasPermission("appointments:view_all"),
    apptsOwn: hasPermission("appointments:view_own"),
    onlineRes: hasPermission("reservationOnline:read"),
    cashRead: hasPermission("cashManagement:read"),
    inventoryRead: hasPermission("inventory:read"),
    whatsappRead: hasPermission("whatsapp:read") && limits?.whatsappIntegration !== false,
    analyticsRead: hasPermission("analytics:read") && limits?.analyticsAdvanced !== false,
    packagesRead: hasPermission("packages:view") && limits?.servicePackages !== false,
    classesRead:
      (hasPermission("appointments:view_all") || hasPermission("services:read")) &&
      limits?.classesModule !== false,
    campaignsRead: hasPermission("whatsapp:read") && limits?.campaignsWhatsapp !== false,
  };
}

export function buildAdminNav(can: NavPermissions): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: "Hoy",
      items: [
        { key: "agenda", label: "Agenda", icon: "agenda", links: [{ label: "Agenda", to: "/gestionar-agenda", visible: can.apptsAll || can.apptsOwn }] },
        { key: "reservations", label: "Reservas online", icon: "reservations", links: [{ label: "Reservas online", to: "/gestionar-reservas-online", visible: can.onlineRes }] },
      ],
    },
    {
      title: "Clientes",
      items: [
        { key: "clients", label: "Clientes", icon: "clients", links: [{ label: "Clientes", to: "/gestionar-clientes", visible: can.clientsRead }] },
        // Los niveles de fidelidad viven hoy en Configuración del negocio → Fidelidad.
        { key: "loyalty", label: "Fidelidad", icon: "loyalty", links: [{ label: "Fidelidad", to: "/informacion-negocio?tab=fidelity", visible: can.businessInfo }] },
      ],
    },
    {
      title: "Ventas",
      items: [
        {
          key: "cash",
          label: "Caja y pagos",
          icon: "cash",
          links: [
            { label: "Caja", to: "/gestion-caja", visible: can.cashRead },
            { label: "Comprobantes de pago", to: "/gestionar-pagos", visible: can.onlineRes },
          ],
        },
        {
          key: "store",
          label: "Tienda e inventario",
          icon: "store",
          links: [
            { label: "Inventario", to: "/inventario", visible: can.inventoryRead },
            { label: "Pedidos", to: "/pedidos", visible: can.inventoryRead },
          ],
        },
      ],
    },
    {
      title: "Marketing",
      items: [
        {
          key: "whatsapp",
          label: "WhatsApp",
          icon: "whatsapp",
          links: [
            { label: "Conexión", to: "/gestionar-whatsapp", visible: can.whatsappRead },
            { label: "Mensajes", to: "/mensajes-whatsapp", visible: can.whatsappRead },
            { label: "Campañas", to: "/admin/campaigns", visible: can.campaignsRead },
          ],
        },
        { key: "analytics", label: "Analíticas", icon: "analytics", links: [{ label: "Analíticas", to: "/analytics-dashboard", visible: can.analyticsRead }] },
      ],
    },
    {
      title: "Negocio",
      items: [
        {
          key: "catalog",
          label: "Catálogo",
          icon: "catalog",
          links: [
            { label: "Servicios", to: "/gestionar-servicios", visible: can.servicesRead },
            { label: "Paquetes", to: "/gestionar-paquetes", visible: can.packagesRead },
          ],
        },
        { key: "employees", label: "Profesionales", icon: "employees", links: [{ label: "Profesionales", to: "/gestionar-profesionales", visible: can.employeesRead }] },
        { key: "classes", label: "Clases", icon: "classes", links: [{ label: "Clases", to: "/gestionar-clases", visible: can.classesRead }] },
        {
          key: "settings",
          label: "Ajustes",
          icon: "settings",
          links: [
            { label: "Mi negocio", to: "/informacion-negocio", visible: can.businessInfo },
            { label: "Mi perfil profesional", to: "/informacion-profesional", visible: can.employeeInfo },
          ],
        },
      ],
    },
  ];

  // Solo ítems con al menos una ruta visible, y grupos con al menos un ítem.
  return groups
    .map((g) => ({
      ...g,
      items: g.items
        .map((it) => ({ ...it, links: it.links.filter((l) => l.visible) }))
        .filter((it) => it.links.length > 0),
    }))
    .filter((g) => g.items.length > 0);
}

/** Menú de usuario: lo que antes estaba en «Configuración»/«Sistema» y no es una tarea diaria. */
export function buildUserMenuLinks(can: NavPermissions, hasNewUpdates: boolean): NavLeaf[] {
  return [
    { label: "Mi plan", to: "/my-membership", visible: can.businessInfo },
    { label: "Novedades", to: "/novedades", visible: can.businessInfo, dot: hasNewUpdates },
    { label: "Historial de eliminaciones", to: "/historial-eliminaciones", visible: can.businessInfo },
  ].filter((l) => l.visible);
}

export interface TabbarItem {
  key: string;
  label: string;
  icon: NavIconKey;
  to: string;
}

/** Barra inferior en móvil: Agenda, Clientes, Caja, WhatsApp (+ «Más», que abre el menú completo). */
export function buildTabbar(can: NavPermissions): TabbarItem[] {
  const items: (TabbarItem & { visible: boolean })[] = [
    { key: "agenda", label: "Agenda", icon: "agenda", to: "/gestionar-agenda", visible: can.apptsAll || can.apptsOwn },
    { key: "clients", label: "Clientes", icon: "clients", to: "/gestionar-clientes", visible: can.clientsRead },
    { key: "cash", label: "Caja", icon: "cash", to: "/gestion-caja", visible: can.cashRead },
    { key: "whatsapp", label: "WhatsApp", icon: "whatsapp", to: "/gestionar-whatsapp", visible: can.whatsappRead },
  ];
  return items.filter((i) => i.visible).map(({ key, label, icon, to }) => ({ key, label, icon, to }));
}

function splitTo(to: string): { path: string; query: URLSearchParams } {
  const [path, qs = ""] = to.split("?");
  return { path, query: new URLSearchParams(qs) };
}

function pathMatches(linkPath: string, pathname: string): boolean {
  return pathname === linkPath || (linkPath !== "/" && pathname.startsWith(linkPath));
}

/**
 * Ruta del menú que corresponde a la página actual. Un enlace con query
 * (Fidelidad → ?tab=fidelity) gana sobre uno de la misma ruta sin query (Ajustes).
 */
export function findActiveLink(links: NavLeaf[], pathname: string, search: string): string | null {
  const current = new URLSearchParams(search);
  let fallback: string | null = null;
  for (const link of links) {
    const { path, query } = splitTo(link.to);
    if (!pathMatches(path, pathname)) continue;
    const keys = [...query.keys()];
    if (keys.length === 0) {
      fallback ??= link.to;
    } else if (keys.every((k) => current.get(k) === query.get(k))) {
      return link.to;
    }
  }
  return fallback;
}

/** Todas las rutas del menú del panel (grupos + menú de usuario), en orden. */
export function allNavLinks(groups: NavGroup[], userMenu: NavLeaf[] = []): NavLeaf[] {
  return [...groups.flatMap((g) => g.items.flatMap((i) => i.links)), ...userMenu];
}

// Rutas que se muestran con el shell del panel (barra lateral, tabbar, header
// con campana). El resto (landing, reserva, tienda, mis reservas…) usa el shell
// público, también si quien navega tiene sesión iniciada.
const ADMIN_PATHS = [
  "/gestionar-agenda",
  "/gestionar-reservas-online",
  "/gestionar-clientes",
  "/gestion-caja",
  "/gestionar-pagos",
  "/inventario",
  "/pedidos",
  "/gestionar-whatsapp",
  "/mensajes-whatsapp",
  "/admin/campaigns",
  "/analytics-dashboard",
  "/gestionar-servicios",
  "/gestionar-paquetes",
  "/gestionar-profesionales",
  "/gestionar-clases",
  "/informacion-negocio",
  "/informacion-profesional",
  "/my-membership",
  "/novedades",
  "/historial-eliminaciones",
  "/configuracion-inicial",
];

export function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
