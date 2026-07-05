import { Center, Anchor, Text, useMantineTheme, Box } from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { BiCalendar } from "react-icons/bi";
import { FaIdeal } from "react-icons/fa";
import { GiPriceTag } from "react-icons/gi";
import { GrLocation } from "react-icons/gr";
import { IconSchool, IconPackage, IconBuildingStore } from "@tabler/icons-react";
import { ModernLayout, MinimalLayout, CardsLayout, LandingLayout } from "./HomeLayouts";

export default function Home() {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const allFeatures = [
    {
      title: "Reserva en línea",
      icon: <BiCalendar size={28} />,
      link: "/online-reservation",
      show: organization?.enableOnlineBooking ?? true,
    },
    {
      title: "Nuestros Servicios",
      icon: <GiPriceTag size={28} />,
      link: "/servicios-precios",
    },
    {
      title: "Reservar clase",
      icon: <IconSchool size={28} />,
      link: "/reservar-clase",
      show: organization?.enableClassBooking ?? false,
    },
    {
      title: "Comprar paquetes",
      icon: <IconPackage size={28} />,
      link: "/comprar-paquete",
      // Si el plan incluye paquetes y hay un medio de cobro online: Mercado Pago
      // conectado o métodos de transferencia (compra vía comprobante con IA).
      show:
        (organization as any)?.planLimits?.servicePackages !== false &&
        (!!organization?.mpCollect?.connected ||
          ((organization?.paymentMethods?.length ?? 0) > 0)),
    },
    {
      title: "Tienda",
      icon: <IconBuildingStore size={28} />,
      link: "/tienda",
      // Opt-in: la org debe activar la tienda pública en /inventario.
      show: organization?.storeEnabled === true,
    },
    {
      title: "Plan de fidelidad",
      icon: <FaIdeal size={28} />,
      link: "/search-client",
      show: organization?.showLoyaltyProgram ?? true,
    },
    {
      title: "Ubicación",
      icon: <GrLocation size={28} />,
      link: "/location",
    },
  ];

  const features = allFeatures.filter((f) => f.show !== false);

  const welcomeTitle = organization?.welcomeTitle || "¡Hola! Bienvenido";
  const welcomeDescription = organization?.welcomeDescription || "Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás! ✨";
  const planLimits = (organization as any)?.planLimits;
  const rawLayout = (organization?.homeLayout || "modern") as "modern" | "minimal" | "cards" | "landing";
  // Si el plan no permite landing (downgrade), caer a modern sin tocar la BD
  const homeLayout = rawLayout === "landing" && planLimits?.professionalLanding === false ? "modern" : rawLayout;

  const enableOnlineBooking = organization?.enableOnlineBooking ?? true;

  // Seleccionar el layout según la configuración
  let LayoutComponent;
  switch (homeLayout) {
    case "minimal":
      LayoutComponent = MinimalLayout;
      break;
    case "cards":
      LayoutComponent = CardsLayout;
      break;
    case "landing":
      LayoutComponent = LandingLayout;
      break;
    case "modern":
    default:
      LayoutComponent = ModernLayout;
      break;
  }


  return (
    <>
      <LayoutComponent features={features} welcomeTitle={welcomeTitle} welcomeDescription={welcomeDescription} organizationId={organization?._id} enableOnlineBooking={enableOnlineBooking} />

      <Box py="xl" style={{ position: "relative", zIndex: 10 }}>
        <Center>
          <Anchor
            href="https://www.agenditapp.com?utm_source=app-dashboard&utm_medium=referral&utm_campaign=powered-by"
            target="_blank"
            c="dimmed" 
            size="xs" 
            underline="hover" 
          >
            Plataforma impulsada por{" "}
            <Text
              span
              fw={800} 
              c={primary} 
            >
              AgenditApp
            </Text>
          </Anchor>
        </Center>
      </Box>
    </>
  );
}
