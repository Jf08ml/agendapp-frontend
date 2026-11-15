import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Container, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { AGENDITAPP_SUPPORT_WA_URL, ingresarTarget } from "../../utils/panelAccess";

/**
 * /ingresar/:slug — puente al login del panel de un negocio.
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
      <Container size={400} my={80}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed" size="sm">Abriendo tu panel…</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size={420} my={80}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Stack gap="md">
          <Title order={3}>No encontramos ese enlace</Title>
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            El enlace para entrar a tu panel parece incompleto. Busca el correo o el WhatsApp de
            bienvenida de AgenditApp, o escríbenos y te ayudamos a entrar.
          </Alert>
          <Button component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" fullWidth>
            Escribir a soporte por WhatsApp
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
