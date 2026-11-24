// /exchange — ingreso automático con un código de un solo uso (tras el
// registro, la recuperación de acceso o la suplantación del superadmin).
// Rediseño, ErroresYAcceso: «Entrando a tu panel…» y, si el enlace ya se usó
// o venció, «Iniciar sesión» y soporte.
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@mantine/core";
import { IconBrandWhatsapp, IconClock } from "@tabler/icons-react";
import { useDispatch } from "react-redux";
import { exchangeCodeForToken } from "../../services/registrationService";
import { loginSuccess } from "../../features/auth/sliceAuth";
import { AGENDITAPP_SUPPORT_WA_URL } from "../../utils/panelAccess";
import AuthCard from "../../components/auth/AuthCard";
import { IndeterminateBar, StatusIcon } from "../../components/auth/AccessStatus";

export default function ExchangePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setIsLoading(false);
      return;
    }

    const exchange = async () => {
      try {
        const result = await exchangeCodeForToken(code);

        // Si es sesión de impersonación, marcar para poder volver al panel de superadmin
        if (result.isImpersonated) {
          localStorage.setItem("sa_is_impersonating", "true");
        } else {
          // Limpiar flags de impersonación si era una sesión normal
          localStorage.removeItem("sa_is_impersonating");
          localStorage.removeItem("sa_backup");
        }

        // loginSuccess guarda en Redux + localStorage automáticamente
        dispatch(
          loginSuccess({
            token: result.token,
            userId: result.userId,
            sessionId: result.sessionId,
            role: result.userType,
            organizationId: result.organizationId,
            permissions: result.userPermissions,
            expiresAt: result.expiresAt,
          })
        );

        // En dev, preservar ?slug= para que el axios interceptor envíe X-Dev-Tenant-Slug
        const slug = searchParams.get("slug");
        const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

        if (isDev && slug) {
          navigate(`/gestionar-agenda?slug=${slug}`, { replace: true });
        } else {
          // En producción el hostname ya identifica al tenant
          window.history.replaceState({}, "", window.location.pathname);
          navigate("/gestionar-agenda", { replace: true });
        }
      } catch {
        // El código vence a los 2 minutos y sirve una sola vez (una recarga o
        // volver atrás lo reusa). A esta altura la cuenta YA existe: no hay
        // que mandar a registrarse de nuevo (eso termina en "ya existe una
        // organización con ese email"), sino a iniciar sesión aquí mismo.
        setIsLoading(false);
      }
    };

    exchange();
  }, [searchParams, dispatch, navigate]);

  if (isLoading) {
    return (
      <AuthCard platform title="Entrando a tu panel…" subtitle="Estamos preparando tu sesión. Un momento.">
        <IndeterminateBar />
      </AuthCard>
    );
  }

  return (
    <AuthCard platform maxWidth={420}>
      <StatusIcon tone="info">
        <IconClock size={26} />
      </StatusIcon>
      <div>
        <h1>Este enlace ya se usó o venció</h1>
        <p className="ag-muted" style={{ margin: "4px 0 0" }}>
          Tu cuenta ya está creada. Entra con el correo y la contraseña con los que te registraste.
        </p>
      </div>
      <div className="ag-card" style={{ padding: "10px 12px", background: "var(--surface-muted)", fontSize: 14 }}>
        <div className="ag-subtle">El enlace de tu panel</div>
        <b style={{ wordBreak: "break-all" }}>{`${window.location.origin}/login-admin`}</b>
      </div>
      <div className="ag-stack" style={{ gap: 8 }}>
        <Button fullWidth color="var(--platform)" onClick={() => navigate("/login-admin", { replace: true })}>
          Iniciar sesión
        </Button>
        <Button fullWidth variant="default" component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" leftSection={<IconBrandWhatsapp size={16} />}>
          ¿No puedes entrar? Escríbenos
        </Button>
      </div>
    </AuthCard>
  );
}
