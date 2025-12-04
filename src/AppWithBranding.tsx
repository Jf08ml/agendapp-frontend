import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrganizationConfig } from "./features/organization/sliceOrganization";
import { AppDispatch, RootState } from "./app/store";
import { createTheme, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import GoogleMapsProvider from "./utils/GoogleMapsProvider";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import App from "./App";
import { CustomLoaderHtml } from "./components/customLoader/CustomLoaderHtml";

// Función para crear paleta de 10 colores iguales con HEX
function createCustomPalette(
  hex: string
): [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
] {
  return [hex, hex, hex, hex, hex, hex, hex, hex, hex, hex];
}

function useFavicon(faviconUrl?: string) {
  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector(
      "link[rel~='icon']"
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);
}

export default function AppWithBranding() {
  const dispatch = useDispatch<AppDispatch>();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const loading = useSelector((state: RootState) => state.organization.loading);

  useEffect(() => {
    if (!organization) {
      dispatch(fetchOrganizationConfig());
    }
  }, [dispatch, organization]);

  // Cambia el <title>
  useEffect(() => {
    if (organization?.name) document.title = organization.name;
  }, [organization?.name]);

  useEffect(() => {
    if (organization?.branding?.themeColor) {
      let metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.setAttribute("name", "theme-color");
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute("content", organization.branding.themeColor);
    }
  }, [organization?.branding?.themeColor]);

  // Cambia el favicon
  useFavicon(organization?.branding?.faviconUrl);

  // Lógica para color principal personalizado
  const colorValue = organization?.branding?.primaryColor || "#DE739E";
  const isHex = typeof colorValue === "string" && colorValue.startsWith("#");

  // Si es HEX, crea paleta custom, si no, fallback al default Mantine
  const colors = isHex ? { custom: createCustomPalette(colorValue) } : {}; // O podrías forzar un color fallback

  // El nombre del color primario
  const primaryColor = isHex ? "custom" : "blue";

  // Crea el theme dinámico
  // Crea el theme dinámico
  const theme = createTheme({
    // Base UI: Inter
    fontFamily:
      '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Noto Sans", "Helvetica Neue", Arial, sans-serif',

    // Monospace (para logs / código)
    fontFamilyMonospace:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

    // Títulos / Headings: Poppins
    headings: {
      fontFamily:
        '"Poppins", "Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      sizes: {
        h1: {
          fontSize: "clamp(2rem, 2.8vw, 3rem)",
          fontWeight: "700",
          lineHeight: "1.1",
        },
        h2: {
          fontSize: "clamp(1.5rem, 2.2vw, 2.25rem)",
          fontWeight: "700",
          lineHeight: "1.15",
        },
      },
    },

    // Tamaños opcionales (conserva si te sirven)
    fontSizes: {
      xxxs: "8px",
      xxs: "10px",
      xs: "12px",
      sm: "14px",
      md: "16px",
      lg: "18px",
      xl: "20px",
      xxl: "24px",
    },

    // Branding de color que ya tenías
    colors,
    primaryColor,
  });

  if (loading && !organization)
    return <CustomLoaderHtml loadingText="Cargando tu espacio..." />;

  return (
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications />
        <GoogleMapsProvider>
          <DndProvider backend={HTML5Backend}>
            <App />
          </DndProvider>
        </GoogleMapsProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
