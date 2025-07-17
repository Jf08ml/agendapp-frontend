// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/dates/styles.css";
import { Provider } from "react-redux";
import { store } from "./app/store.ts";
import AppWithBranding from "./AppWithBranding.tsx";

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <Provider store={store}>
    <AppWithBranding />
  </Provider>
  // </StrictMode>
);
