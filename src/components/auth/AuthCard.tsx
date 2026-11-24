// Tarjeta de acceso (rediseño, AuthCard / AccesoEquipo): tarjeta clara sobre
// surface-muted, con el logo y el nombre del negocio arriba e «Impulsado por
// AgenditApp» al pie. En app.agenditapp.com (sin negocio) muestra la marca de
// la plataforma. La usan el login del equipo y la recuperación de acceso.
import type { ReactNode } from "react";
import { Anchor, Avatar, Box } from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { orgInitials } from "../../layouts/navIcons";

interface AuthCardProps {
  title?: ReactNode;
  /** Línea bajo el título (por defecto, el nombre del negocio) */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Pantalla de la plataforma: sin logo ni nombre de negocio */
  platform?: boolean;
  /** Ancho máximo de la tarjeta (AuthCard: 400px) */
  maxWidth?: number;
}

export default function AuthCard({ title, subtitle, children, platform = false, maxWidth = 400 }: AuthCardProps) {
  const organization = useSelector((s: RootState) => s.organization.organization);
  const showOrg = !platform && !!organization;
  const logoUrl = organization?.branding?.logoUrl;

  return (
    <Box
      style={{
        minHeight: "calc(100dvh - var(--app-shell-header-offset, 0px))",
        background: "var(--surface-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-5)",
        padding: "var(--space-7) var(--space-4) var(--space-5)",
      }}
    >
      <div className="ag-card ag-auth" style={{ maxWidth, boxShadow: "var(--shadow-sm)" }}>
        {showOrg && (
          <Avatar
            src={logoUrl || undefined}
            alt={organization?.name}
            size={48}
            radius="xl"
            styles={{
              root: { background: logoUrl ? "transparent" : "var(--brand)" },
              placeholder: { color: "var(--on-brand)", fontWeight: 600 },
              image: { objectFit: "cover" },
            }}
          >
            {orgInitials(organization?.name)}
          </Avatar>
        )}
        {(title || subtitle || showOrg) && (
          <div>
            {title && <h1>{title}</h1>}
            {(subtitle ?? (showOrg ? organization?.name : null)) && (
              <p className="ag-muted" style={{ margin: "4px 0 0" }}>
                {subtitle ?? organization?.name}
              </p>
            )}
          </div>
        )}
        {children}
      </div>

      <span className="ag-subtle">
        Impulsado por{" "}
        <Anchor
          href="https://www.agenditapp.com?utm_source=app-login&utm_medium=referral&utm_campaign=powered-by"
          target="_blank"
          rel="noopener noreferrer"
          fz={13}
          c="var(--platform)"
          fw={600}
        >
          AgenditApp
        </Anchor>
      </span>
    </Box>
  );
}
