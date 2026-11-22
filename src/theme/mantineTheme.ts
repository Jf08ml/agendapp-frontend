// Tema de Mantine del rediseño: defaults de componentes que igualan las clases
// ag-* del design system (project/components/bundle.css). La marca entra como
// la escala "brand" (10 tonos reales) y como variables CSS (--brand…).
import {
  Badge,
  Button,
  Card,
  createTheme,
  Drawer,
  Modal,
  NavLink,
  Switch,
  Tabs,
  type CSSVariablesResolver,
  type MantineThemeOverride,
} from "@mantine/core";
import {
  brandCssVariables,
  buildBrandTokens,
  generateBrandScale,
} from "./brandTokens";

const SCRIM = { color: "#0c0d10", backgroundOpacity: 0.48 } as const;

export function createAppTheme(brand: string, fontFamily: string): MantineThemeOverride {
  const scale = generateBrandScale(brand);

  return createTheme({
    fontFamily,
    fontFamilyMonospace:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

    headings: {
      fontFamily,
      sizes: {
        h1: { fontSize: "clamp(2rem, 2.8vw, 3rem)", fontWeight: "700", lineHeight: "1.1" },
        h2: { fontSize: "clamp(1.5rem, 2.2vw, 2.25rem)", fontWeight: "700", lineHeight: "1.15" },
      },
    },

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

    // "custom" se conserva como alias: hay código que pudo usar color="custom".
    colors: { brand: scale, custom: scale },
    primaryColor: "brand",
    primaryShade: { light: 6, dark: 6 },
    // Texto ink (no blanco) sobre rellenos con marcas claras. Expone también
    // --mantine-primary-color-contrast.
    autoContrast: true,
    luminanceThreshold: 0.3,

    defaultRadius: "md",
    radius: { xs: "2px", sm: "4px", md: "8px", lg: "16px", xl: "32px" },
    shadows: {
      xs: "var(--shadow-xs)",
      sm: "var(--shadow-sm)",
      md: "var(--shadow-md)",
      lg: "var(--shadow-lg)",
      xl: "var(--shadow-lg)",
    },
    focusRing: "auto",

    components: {
      // Formato por defecto de los selectores de fecha: con locale "es" el default
      // de Mantine ("MMMM D, YYYY") saldría "septiembre 25, 2026".
      DateInput: { defaultProps: { valueFormat: "DD/MM/YYYY" } },
      DatePickerInput: { defaultProps: { valueFormat: "DD/MM/YYYY" } },

      // ag-btn: peso 500, radio md
      Button: Button.extend({
        styles: { label: { fontWeight: 500 } },
      }),

      // ag-badge: sin mayúsculas forzadas, peso 600, pastilla
      Badge: Badge.extend({
        defaultProps: { radius: "xl" },
        styles: { root: { textTransform: "none", fontWeight: 600, letterSpacing: 0 } },
      }),

      // ag-card: superficie elevada, borde line, radio lg
      Card: Card.extend({
        defaultProps: { radius: "lg" },
        styles: { root: { backgroundColor: "var(--surface-raised)" } },
      }),

      // ag-subtabs: subrayado en ink, no en la marca (si no se pide otro color)
      Tabs: Tabs.extend({
        vars: (_theme, props) =>
          props.color ? { root: {} } : { root: { "--tabs-color": "var(--ink)" } },
        styles: { tab: { fontWeight: 500 } },
      }),

      // ag-nav__item: activo en brand-soft + brand-text, hover surface-hover
      NavLink: NavLink.extend({
        vars: (_theme, props) =>
          props.color
            ? { root: {}, children: {} }
            : {
                root: {
                  "--nl-bg": "var(--brand-soft)",
                  "--nl-color": "var(--brand-text)",
                  "--nl-hover": "var(--surface-hover)",
                },
                children: {},
              },
        styles: { root: { borderRadius: "var(--radius-md)" }, label: { fontWeight: 500 } },
      }),

      // ag-modal: radio lg, título title-3, fondo scrim
      Modal: Modal.extend({
        defaultProps: { radius: "lg", overlayProps: SCRIM },
        styles: { title: { fontWeight: 600, fontSize: "18px", lineHeight: "24px" } },
      }),

      Drawer: Drawer.extend({
        defaultProps: { overlayProps: SCRIM },
        styles: { title: { fontWeight: 600, fontSize: "18px", lineHeight: "24px" } },
      }),

      // ag-switch: encendido en la marca
      Switch: Switch.extend({
        defaultProps: { color: "brand" },
      }),
    },
  });
}

/** Variables de marca por esquema + alias de Mantine hacia los tokens. */
export function createCssVariablesResolver(
  brand: string,
  accent: string | null | undefined
): CSSVariablesResolver {
  const light = buildBrandTokens(brand, accent, "light");
  const dark = buildBrandTokens(brand, accent, "dark");

  const mantineAliases = {
    "--mantine-color-body": "var(--surface)",
    "--mantine-color-text": "var(--ink)",
    "--mantine-color-dimmed": "var(--ink-muted)",
    "--mantine-color-anchor": "var(--brand-text)",
    "--mantine-color-default-border": "var(--line-control)",
    "--mantine-color-default-hover": "var(--surface-hover)",
  };

  return () => ({
    variables: {},
    light: { ...brandCssVariables(light), ...mantineAliases },
    dark: { ...brandCssVariables(dark), ...mantineAliases },
  });
}
