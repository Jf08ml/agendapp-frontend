// pages/ServiceSuspended.tsx
import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Button,
  Group,
  Alert,
  ThemeIcon,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { BiLock, BiPhone } from "react-icons/bi";
import { IoAlertCircle } from "react-icons/io5";

export default function ServiceSuspended() {
  const navigate = useNavigate();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const handleContactAdmin = () => {
    const phone = "573184345284"; // Número de WhatsApp del administrador
    const message = encodeURIComponent(
      `Hola, soy ${organization?.name || "una organización"}. Mi servicio está suspendido y necesito reactivarlo. Por favor ayúdame.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <Container size="sm" py="xl" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <Paper withBorder shadow="xl" p="xl" radius="md" style={{ width: "100%" }}>
        <Stack align="center" gap="xl">
          {/* Icono */}
          <ThemeIcon size={120} radius={120} variant="light" color="red">
            <BiLock size={60} />
          </ThemeIcon>

          {/* Título */}
          <div style={{ textAlign: "center" }}>
            <Title order={1} c="red">
              Servicio Suspendido
            </Title>
            <Text c="dimmed" size="lg" mt="sm">
              Tu acceso ha sido temporalmente suspendido
            </Text>
          </div>

          {/* Alerta con información */}
          <Alert
            icon={<IoAlertCircle size={18} />}
            title="¿Por qué está suspendido mi servicio?"
            color="orange"
            variant="light"
            styles={{ root: { width: "100%" } }}
          >
            <Stack gap="sm">
              <Text size="sm">
                Tu membresía ha vencido y el período de gracia ha finalizado.
                Para reactivar tu servicio, debes renovar tu suscripción.
              </Text>
              <Text size="sm" fw={600}>
                Razones comunes:
              </Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  <Text size="sm">Falta de pago de la membresía mensual</Text>
                </li>
                <li>
                  <Text size="sm">Período de gracia finalizado (2 días)</Text>
                </li>
                <li>
                  <Text size="sm">
                    No se recibió confirmación del pago realizado
                  </Text>
                </li>
              </ul>
            </Stack>
          </Alert>

          {/* Información de la organización */}
          {organization && (
            <Paper withBorder p="md" radius="md" style={{ width: "100%" }}>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Organización
                </Text>
                <Text size="lg" fw={600}>
                  {organization.name}
                </Text>
                {organization.email && (
                  <>
                    <Text size="sm" c="dimmed" mt="sm">
                      Correo de contacto
                    </Text>
                    <Text size="sm">{organization.email}</Text>
                  </>
                )}
              </Stack>
            </Paper>
          )}

          {/* Instrucciones */}
          <Paper withBorder p="md" bg="blue.0" radius="md" style={{ width: "100%" }}>
            <Stack gap="sm">
              <Text size="sm" fw={600} c="blue">
                ¿Cómo reactivar mi servicio?
              </Text>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  <Text size="sm">
                    Contacta al administrador usando el botón de abajo
                  </Text>
                </li>
                <li>
                  <Text size="sm">
                    Realiza el pago de tu membresía mensual
                  </Text>
                </li>
                <li>
                  <Text size="sm">
                    Envía el comprobante de pago por WhatsApp
                  </Text>
                </li>
                <li>
                  <Text size="sm">
                    Espera la confirmación y reactivación (usualmente en minutos)
                  </Text>
                </li>
              </ol>
            </Stack>
          </Paper>

          {/* Botones de acción */}
          <Group justify="center" mt="md">
            <Button
              size="lg"
              leftSection={<BiPhone size={20} />}
              color="green"
              onClick={handleContactAdmin}
            >
              Contactar Administrador
            </Button>
            <Button
              size="lg"
              variant="light"
              onClick={() => navigate("/login-admin")}
            >
              Volver al Inicio
            </Button>
          </Group>

          {/* Nota final */}
          <Text size="xs" c="dimmed" ta="center" mt="xl">
            Si crees que esto es un error o ya realizaste el pago, por favor
            contacta al administrador de inmediato. Tu servicio será reactivado
            tan pronto como se confirme tu pago.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}
