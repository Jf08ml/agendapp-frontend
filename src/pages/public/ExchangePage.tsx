import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Container, Paper, Title, Text, Loader, Alert, Button, Stack } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useDispatch } from "react-redux";
import { exchangeCodeForToken } from "../../services/registrationService";
import { loginSuccess } from "../../features/auth/sliceAuth";

export default function ExchangePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setError("Código de acceso no proporcionado");
      setIsLoading(false);
      return;
    }

    const exchange = async () => {
      try {
        const result = await exchangeCodeForToken(code);

        // loginSuccess guarda en Redux + localStorage automáticamente
        dispatch(
          loginSuccess({
            token: result.token,
            userId: result.userId,
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
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(
          axiosErr.response?.data?.message ||
            "Código inválido o expirado. Por favor, intenta registrarte nuevamente."
        );
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
    <Container size={400} my={80}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Stack gap="md">
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error de acceso"
            color="red"
          >
            {error}
          </Alert>
          <Button
            variant="light"
            fullWidth
            onClick={() => {
              window.location.href = "https://app.agenditapp.com/signup";
            }}
          >
            Crear nueva cuenta
          </Button>
          <Button variant="subtle" fullWidth onClick={() => navigate("/login-admin")}>
            Iniciar sesión
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
