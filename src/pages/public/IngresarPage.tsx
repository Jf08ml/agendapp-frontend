import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@mantine/core";
import { IconBrandWhatsapp, IconLinkOff } from "@tabler/icons-react";
import AuthCard from "../../components/auth/AuthCard";
import { IndeterminateBar, StatusIcon } from "../../components/auth/AccessStatus";
import { AGENDITAPP_SUPPORT_WA_URL, RECOVER_ACCESS_PATH, ingresarTarget } from "../../utils/panelAccess";

/**
 * /ingresar/:slug — puente al login del panel de un negocio (rediseño,
 * ErroresYAcceso).
 *
 * Meta solo deja URLs dinámicas con la parte variable al final de un dominio
 * fijo, así que el botón "Ir a mi panel" del WhatsApp de bienvenida
 * (`cuenta_creada`) apunta a https://app.agenditapp.com/ingresar/{slug} y esta
 * página redirige a https://{slug}.agenditapp.com/login-admin.
 */
export default function IngresarPage() {
  const { slug } = useParams<{ slug: string }>();
  const target = useMemo(() => ingresarTarget(slug, window.location.hostname), [slug]);

  useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);

  if (target) {
    return (
      <AuthCard platform title="Entrando a tu panel…" subtitle="Un momento, te llevamos a la página de ingreso de tu negocio.">
        <IndeterminateBar />
      </AuthCard>
    );
  }

  return (
    <AuthCard platform>
      <StatusIcon tone="warning">
        <IconLinkOff size={26} />
      </StatusIcon>
      <div>
        <h1>El enlace está incompleto</h1>
        <p className="ag-muted" style={{ margin: "4px 0 0" }}>
          Busca el correo o el WhatsApp de bienvenida de AgenditApp y ábrelo desde ahí. Si no lo encuentras, recupera tu acceso con tu correo o tu
          celular.
        </p>
      </div>
      <div className="ag-stack" style={{ gap: 8 }}>
        <Button component="a" href={RECOVER_ACCESS_PATH} fullWidth color="var(--platform)">
          Recuperar acceso
        </Button>
        <Button component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" fullWidth variant="default" leftSection={<IconBrandWhatsapp size={16} />}>
          Escribir a soporte
        </Button>
      </div>
    </AuthCard>
  );
}
