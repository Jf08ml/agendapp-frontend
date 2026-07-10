import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrganizationConfig } from "./features/organization/sliceOrganization";
import { AppDispatch, RootState } from "./app/store";
import { createTheme, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import GoogleMapsProvider from "./utils/GoogleMapsProvider";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CustomLoaderHtml } from "./components/customLoader/CustomLoaderHtml";
import App from "./App";
import { extractTenantFromHost } from "./utils/domainUtils";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __swRecoveryTimeout?: ReturnType<typeof setTimeout>;
  }
}

const FONT_FAMILY_MAP: Record<string, string> = {
  "inter": '"Inter", system-ui, -apple-system, sans-serif',
  "plus-jakarta-sans": '"Plus Jakarta Sans", system-ui, sans-serif',
  "nunito": '"Nunito", system-ui, sans-serif',
  "dm-sans": '"DM Sans", system-ui, sans-serif',
  "outfit": '"Outfit", system-ui, sans-serif',
  "manrope": '"Manrope", system-ui, sans-serif',
};

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

// iOS Safari no lee el Web App Manifest para "Añadir a inicio" — solo usa
// apple-touch-icon (para el ícono) y apple-mobile-web-app-title (para el nombre
// bajo el ícono). index.html trae un fallback genérico estático; esto lo
// reemplaza por el branding real de la organización, igual que useFavicon.
function useAppleTouchIcon(iconUrl?: string) {
  useEffect(() => {
    if (!iconUrl) return;
    let link = document.querySelector(
      "link[rel='apple-touch-icon']"
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "apple-touch-icon";
      document.head.appendChild(link);
    }
    link.href = iconUrl;
  }, [iconUrl]);
}

function useAppleWebAppTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    let meta = document.querySelector(
      "meta[name='apple-mobile-web-app-title']"
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "apple-mobile-web-app-title");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", title);
  }, [title]);
}

export default function AppWithBranding() {
  const dispatch = useDispatch<AppDispatch>();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const loading = useSelector((state: RootState) => state.organization.loading);
  const hasSentInitialPageView = useRef(false);

  const domainInfo = useMemo(() => extractTenantFromHost(), []);

  // Landing → redirigir a app.agenditapp.com
  useEffect(() => {
    if (domainInfo.type === "landing") {
      window.location.href = "https://app.agenditapp.com";
    }
  }, [domainInfo.type]);

  // Las rutas /superadmin* no necesitan org (evita fetch innecesario en localhost)
  const isSuperadminPath = window.location.pathname.startsWith("/superadmin");

  // Solo cargar config de org si estamos en un tenant o custom domain y no es ruta de superadmin
  useEffect(() => {
    if (!organization && !isSuperadminPath && (domainInfo.type === "tenant" || domainInfo.type === "custom")) {
      dispatch(fetchOrganizationConfig());
    }
  }, [dispatch, organization, domainInfo.type, isSuperadminPath]);

  // Cambia el <title>
  useEffect(() => {
    if (!organization?.name) return;

    document.title = organization.name;

    if (!hasSentInitialPageView.current && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: organization.name,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
      hasSentInitialPageView.current = true;
    }
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

  // iOS: ícono y nombre para "Añadir a inicio" (el manifest no aplica en Safari)
  useAppleTouchIcon(organization?.branding?.pwaIcon || organization?.branding?.logoUrl);
  useAppleWebAppTitle(organization?.branding?.pwaShortName || organization?.name);

  // Lógica para color principal personalizado
  const colorValue = organization?.branding?.primaryColor || "#1C3461";
  const isHex = typeof colorValue === "string" && colorValue.startsWith("#");

  // Si es HEX, crea paleta custom, si no, fallback al default Mantine
  const colors = isHex ? { custom: createCustomPalette(colorValue) } : {}; // O podrías forzar un color fallback

  // El nombre del color primario
  const primaryColor = isHex ? "custom" : "blue";

  const resolvedFont =
    FONT_FAMILY_MAP[organization?.branding?.fontFamily ?? ""] ??
    FONT_FAMILY_MAP["inter"];

  // Crea el theme dinámico
  const theme = createTheme({
    fontFamily: resolvedFont,

    // Monospace (para logs / código)
    fontFamilyMonospace:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

    headings: {
      fontFamily: resolvedFont,
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

  // En signup domain: no loading, no org needed
  // En landing: redirigiendo
  if (domainInfo.type === "landing") {
    return <CustomLoaderHtml loadingText="Redirigiendo..." />;
  }

  // Solo mostrar loading para tenant/custom (signup y rutas /superadmin* no necesitan org)
  if (domainInfo.type !== "signup" && !isSuperadminPath && loading && !organization)
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
