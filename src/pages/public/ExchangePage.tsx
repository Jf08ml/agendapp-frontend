import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Container, Paper, Title, Text, Loader, Alert, Button, Stack } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useDispatch } from "react-redux";
import { exchangeCodeForToken } from "../../services/registrationService";
import { loginSuccess } from "../../features/auth/sliceAuth";
import { AGENDITAPP_SUPPORT_WA_URL } from "../../utils/panelAccess";

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
        const isDev =
          window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

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
      <Container size={400} my={80}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Title order={3}>Configurando tu cuenta...</Title>
            <Text c="dimmed" size="sm">
              Por favor espera un momento
            </Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} my={80}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Stack gap="md">
          <Title order={3}>Inicia sesión para entrar a tu panel</Title>
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            Tu cuenta ya está creada. Este enlace de acceso automático ya se usó o venció, así que
            entra con el <strong>correo y la contraseña</strong> con los que te registraste.
          </Alert>
          <Text size="sm" c="dimmed">
            El enlace de tu panel es{" "}
            <Text span fw={700} c="dark" style={{ wordBreak: "break-all" }}>
              {`${window.location.origin}/login-admin`}
            </Text>
            . También te lo enviamos a tu correo y a tu WhatsApp.
          </Text>
          <Button fullWidth onClick={() => navigate("/login-admin", { replace: true })}>
            Iniciar sesión
          </Button>
          <Button
            variant="subtle"
            fullWidth
            component="a"
            href={AGENDITAPP_SUPPORT_WA_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            ¿No puedes entrar? Escríbenos por WhatsApp
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
