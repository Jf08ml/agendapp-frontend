import { Button, Container, Paper, Stack, Text, Title } from "@mantine/core";
import { AGENDITAPP_SUPPORT_WA_URL } from "../utils/panelAccess";

interface Props {
  notFound: boolean;
  onRetry: () => void;
}

/**
 * Pantalla cuando no se pudo cargar el negocio del dominio actual. Antes la app
 * se quedaba en "Cargando organización..." para siempre (y en el registro el
 * código de acceso vencía mientras tanto).
 */
export default function OrgLoadError({ notFound, onRetry }: Props) {
  return (
    <Container size={420} my={80}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Stack gap="md">
          <Title order={3}>
            {notFound ? "No encontramos este negocio" : "No pudimos cargar la página"}
          </Title>
          <Text size="sm" c="dimmed">
            {notFound
              ? "Revisa que el enlace esté bien escrito. Si es el enlace de tu negocio y no funciona, escríbenos."
              : "Puede ser la conexión a internet. Inténtalo de nuevo en un momento."}
          </Text>
          {!notFound && (
            <Button fullWidth onClick={onRetry}>
              Reintentar
            </Button>
          )}
          <Button
            variant={notFound ? "filled" : "subtle"}
            fullWidth
            component="a"
            href={AGENDITAPP_SUPPORT_WA_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Escribir a soporte por WhatsApp
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
