// Shell de la web pública (rediseño): header neutro con logo, enlaces y un único
// «Reservar», y un pie delgado neutro. También lo usan las pantallas de la
// plataforma (registro en app.agenditapp.com, superadmin), sin marca de negocio.
import { AppShell } from "@mantine/core";
import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import Header from "./Header";
import Footer from "./Footer";

interface PublicShellProps {
  children: ReactNode;
  showChristmas?: boolean;
  /** Pantallas de la plataforma: sin marca ni enlaces del negocio. */
  platform?: boolean;
}

export default function PublicShell({ children, showChristmas = false, platform = false }: PublicShellProps) {
  const organization = useSelector((s: RootState) => s.organization.organization);

  return (
    <AppShell
      header={{ height: 60 }}
      footer={{ height: 32 }}
      styles={{
        main: { background: "var(--surface)" },
        header: { border: "none" },
        footer: { border: "none" },
      }}
    >
      <AppShell.Header>
        <Header
          organization={platform ? null : organization}
          showChristmas={showChristmas}
          platform={platform}
        />
      </AppShell.Header>

      <AppShell.Main style={{ height: "100vh", overflow: "auto" }}>{children}</AppShell.Main>

      <AppShell.Footer>
        <Footer />
      </AppShell.Footer>
    </AppShell>
  );
}
