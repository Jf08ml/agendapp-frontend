// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { createTheme, MantineProvider } from "@mantine/core";
import "./index.css";
import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/dates/styles.css";
import { Notifications } from "@mantine/notifications";
import { Provider } from "react-redux";
import { store } from "./app/store.ts";
import { ModalsProvider } from "@mantine/modals";
import GoogleMapsProvider from "./utils/GoogleMapsProvider.tsx"

const theme = createTheme({
  fontFamily: "Playfair Display, serif",
  fontFamilyMonospace: "Monaco, Courier, monospace",
  headings: { fontFamily: "Playfair Display, serif" },
  fontSizes: {
    xs: "16px",
    sm: "16px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    xxl: "24px",
  },
});

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <Provider store={store}>
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications />
        <GoogleMapsProvider>
          <App />
        </GoogleMapsProvider>
      </ModalsProvider>
    </MantineProvider>
  </Provider>
  // </StrictMode>
);
