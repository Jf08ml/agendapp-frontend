import { Button, Group, ScrollArea } from "@mantine/core";
import {
  IconCreditCard,
  IconBuildingStore,
  IconPackage,
  IconUserCheck,
  IconChartBar,
  IconRobot,
  IconRocket,
  IconBell,
} from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router-dom";

// Navegación compartida del panel superadmin. Se usa en todas las páginas para
// que el menú sea consistente y siempre accesible (antes cada página duplicaba
// su propia barra, con enlaces distintos).
const NAV_ITEMS: { label: string; to: string; icon: React.ReactNode }[] = [
  { label: "Membresías", to: "/superadmin", icon: <IconCreditCard size={16} /> },
  { label: "Organizaciones", to: "/superadmin/orgs", icon: <IconBuildingStore size={16} /> },
  { label: "Planes", to: "/superadmin/planes", icon: <IconPackage size={16} /> },
  { label: "Agentes", to: "/superadmin/agentes", icon: <IconUserCheck size={16} /> },
  { label: "Analítica", to: "/superadmin/analiticas", icon: <IconChartBar size={16} /> },
  { label: "Chatbots", to: "/superadmin/chatbots", icon: <IconRobot size={16} /> },
  { label: "Activación", to: "/superadmin/activacion", icon: <IconRocket size={16} /> },
  { label: "Anuncios", to: "/superadmin/anuncios", icon: <IconBell size={16} /> },
];

export default function SuperadminNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to: string) =>
    to === "/superadmin"
      ? location.pathname === "/superadmin"
      : location.pathname.startsWith(to);

  return (
    <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
      <Group gap="xs" wrap="nowrap" pb={4}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          return (
            <Button
              key={item.to}
              variant={active ? "filled" : "light"}
              leftSection={item.icon}
              size="sm"
              onClick={() => navigate(item.to)}
              style={{ flexShrink: 0 }}
            >
              {item.label}
            </Button>
          );
        })}
      </Group>
    </ScrollArea>
  );
}
