import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  ScrollArea,
  Stack,
  NavLink as MantineNavLink,
  Divider,
  Text,
  rem,
} from "@mantine/core";
import { MdOutlineLoyalty } from "react-icons/md";
import { GrUserSettings } from "react-icons/gr";
import { BiCalendar, BiCalendarCheck } from "react-icons/bi";
import { GiClawSlashes, GiPriceTag } from "react-icons/gi";
import { FaCashRegister, FaIdeal, FaUsers, FaWhatsapp } from "react-icons/fa";
import { IoAnalytics } from "react-icons/io5";
import { FaBell, FaCrown } from "react-icons/fa";
import { usePermissions } from "../hooks/usePermissions";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import CustomLoader from "../components/customLoader/CustomLoader";

interface NavbarLinksProps {
  closeNavbar: () => void;
}

type LinkItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  canShow: boolean;
};

export default function NavbarLinks({ closeNavbar }: NavbarLinksProps) {
  const { hasPermission } = usePermissions();
  const { organization, loading } = useSelector(
    (s: RootState) => s.organization
  );
  const location = useLocation();

  if (loading || !organization) {
    return (
      <CustomLoader
        loadingText={`Cargando ${organization?.name || "organización"}...`}
        logoUrl={organization?.branding?.logoUrl}
      />
    );
  }

  // Permisos (centralizado)
  const can = {
    businessInfo: hasPermission("businessInformation:read"),
    employeeInfo: hasPermission("employeeInformation:read"),
    clientsRead: hasPermission("clients:read"),
    servicesRead: hasPermission("services:read"),
    employeesRead: hasPermission("employees:read"),
    apptsAll: hasPermission("appointments:view_all"),
    apptsOwn: hasPermission("appointments:view_own"),
    onlineRes: hasPermission("reservationOnline:read"),
    cashRead: hasPermission("cashManagement:read"), // <-- fix typo
    whatsappRead: hasPermission("whatsapp:read"),
    analyticsRead: hasPermission("analytics:read"),
  };

  // Estilos consistentes sobre navbar de color
  const textColor = "white";
  const activeBg = "rgba(255,255,255,0.18)";
  const hoverBg = "rgba(255,255,255,0.12)";

  // SECCIONES EN ORDEN FIJO
  const sections: { title?: string; items: LinkItem[] }[] = [
    {
      title: "Explora",
      items: [
        {
          label: "Nuestros Servicios",
          to: "/servicios-precios",
          icon: <GiPriceTag size={18} />,
          canShow: true,
        },
        {
          label: "Plan de fidelidad",
          to: "/search-client",
          icon: <FaIdeal size={18} />,
          canShow: organization?.showLoyaltyProgram ?? true,
        },
        {
          label: "Reserva en línea",
          to: "/online-reservation",
          icon: <BiCalendar size={18} />,
          canShow: true,
        },
      ],
    },
    {
      title:
        can.businessInfo || can.apptsAll || can.apptsOwn
          ? "Gestión de cuenta"
          : undefined,
      items: [
        {
          label: "Gestión de caja",
          to: "/gestion-caja",
          icon: <FaCashRegister size={18} />,
          canShow: can.cashRead,
        },
        {
          label: "Gestionar agenda",
          to: "/gestionar-agenda",
          icon: <BiCalendarCheck size={18} />,
          canShow: can.apptsAll || can.apptsOwn,
        },
        {
          label: "Gestionar reservas online",
          to: "/gestionar-reservas-online",
          icon: <FaUsers size={18} />,
          canShow: can.onlineRes,
        },
        {
          label: "Información del negocio",
          to: "/informacion-negocio",
          icon: <MdOutlineLoyalty size={18} />,
          canShow: can.businessInfo,
        },
        {
          label: "Información del empleado",
          to: "/informacion-empleado",
          icon: <MdOutlineLoyalty size={18} />,
          canShow: can.employeeInfo,
        },
      ],
    },
    {
      title:
        can.clientsRead || can.servicesRead || can.employeesRead
          ? "Sección administrativa"
          : undefined,
      items: [
        {
          label: "Gestionar clientes",
          to: "/gestionar-clientes",
          icon: <GrUserSettings size={18} />,
          canShow: can.clientsRead,
        },
        {
          label: "Gestionar servicios",
          to: "/gestionar-servicios",
          icon: <GiClawSlashes size={18} />,
          canShow: can.servicesRead,
        },
        {
          label: "Gestionar empleados",
          to: "/gestionar-empleados",
          icon: <FaUsers size={18} />,
          canShow: can.employeesRead,
        },
        {
          label: "Gestionar WhatsApp",
          to: "/gestionar-whatsapp",
          icon: <FaWhatsapp size={18} />,
          canShow: can.whatsappRead,
        },
        {
          label: "Analíticas del negocio",
          to: "/analytics-dashboard",
          icon: <IoAnalytics size={18} />,
          canShow: can.analyticsRead,
        },
        {
          label: "Mi Membresía",
          to: "/my-membership",
          icon: <FaCrown size={18} />,
          canShow: can.businessInfo, // Solo admins ven esto
        },
        {
          label: "Notificaciones de Membresía",
          to: "/membership-notifications",
          icon: <FaBell size={18} />,
          canShow: can.businessInfo, // Solo admins ven esto
        },
      ],
    },
  ];

  const linkStyles = {
    root: {
      color: textColor,
      padding: `${rem(8)} ${rem(10)}`,
      borderRadius: rem(10),
      "&:hover": { backgroundColor: hoverBg },
    },
    label: { fontWeight: 600 },
  } as const;

  const renderLink = (item: LinkItem) => {
    if (!item.canShow) return null;
    const active =
      location.pathname === item.to ||
      (item.to !== "/" && location.pathname.startsWith(item.to));

    return (
      <MantineNavLink
        key={item.to}
        component={Link}
        to={item.to}
        leftSection={item.icon}
        label={item.label}
        onClick={closeNavbar}
        active={active}
        styles={{
          ...linkStyles,
          root: {
            ...linkStyles.root,
            backgroundColor: active ? activeBg : "transparent",
            borderLeft: active ? `${rem(3)} solid ${textColor}` : "transparent",
          },
        }}
      />
    );
  };

  return (
    <ScrollArea type="auto" scrollbars="y" style={{ paddingTop: rem(4) }}>
      <Stack gap="xs">
        {sections.map(({ title, items }, idx) => {
          // Filtra items visibles según permisos
          const visible = items.filter((it) => it.canShow);
          if (visible.length === 0) return null;

          return (
            <Box key={idx}>
              {title && (
                <Divider
                  my="xs"
                  label={
                    <Text
                      size="xs"
                      fw={700}
                      c={textColor}
                      style={{ letterSpacing: ".02em" }}
                    >
                      {title}
                    </Text>
                  }
                  labelPosition="center"
                  color={textColor}
                  styles={{
                    label: { opacity: 0.9 },
                    root: { borderColor: "rgba(255,255,255,.35)" },
                  }}
                />
              )}
              <Stack gap={4} px="xs" py={4}>
                {visible.map(renderLink)}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </ScrollArea>
  );
}
