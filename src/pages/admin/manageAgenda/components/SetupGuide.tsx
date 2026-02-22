import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconBrandWhatsapp,
  IconMessage,
  IconArrowRight,
  IconInfoCircle,
  IconClick,
} from "@tabler/icons-react";
import { RootState } from "../../../../app/store";
import {
  getServicesByOrganizationId,
  type Service,
} from "../../../../services/serviceService";
import type { Employee } from "../../../../services/employeeService";

interface SetupGuideProps {
  employees: Employee[];
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  done: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  children?: React.ReactNode;
}

function Step({ number, title, description, done, ctaLabel, ctaHref, children }: StepProps) {
  const navigate = useNavigate();

  return (
    <Group
      gap="md"
      align="flex-start"
      wrap="nowrap"
      style={{
        opacity: done ? 0.75 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <ThemeIcon
        size="lg"
        radius="xl"
        color={done ? "green" : "blue"}
        variant={done ? "filled" : "light"}
        style={{ flexShrink: 0, marginTop: 2 }}
      >
        {done ? <IconCheck size={16} /> : (
          <Text size="xs" fw={700} c={done ? "white" : "blue"}>
            {number}
          </Text>
        )}
      </ThemeIcon>

      <Stack gap={4} style={{ flex: 1 }}>
        <Group gap="xs" align="center">
          <Text fw={600} size="sm">
            {title}
          </Text>
          {done && (
            <Badge size="xs" color="green" variant="light">
              Listo
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
        {children}
        {!done && ctaLabel && ctaHref && (
          <Button
            size="xs"
            variant="light"
            mt={4}
            rightSection={<IconArrowRight size={13} />}
            onClick={() => navigate(ctaHref)}
            style={{ width: "fit-content" }}
          >
            {ctaLabel}
          </Button>
        )}
      </Stack>
    </Group>
  );
}

export default function SetupGuide({ employees }: SetupGuideProps) {
  const navigate = useNavigate();
  const organizationId = useSelector(
    (s: RootState) => s.auth.organizationId as string
  );

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    getServicesByOrganizationId(organizationId)
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, [organizationId]);

  const hasServices = services.length > 0;
  const hasEmployees = employees.length > 0;
  const hasServicesAssigned = employees.some(
    (e) => (e.services?.length ?? 0) > 0
  );

  const allCoreStepsDone = hasServices && hasEmployees && hasServicesAssigned;

  return (
    <Paper withBorder radius="lg" p="xl" mb="md">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Group gap="xs" mb={4}>
            <Title order={4}>¡Bienvenido! Configura tu negocio</Title>
            {loadingServices && <Loader size="xs" />}
          </Group>
          <Text size="sm" c="dimmed">
            Sigue estos pasos para empezar a gestionar tus citas. La guía
            desaparecerá una vez que hayas completado la configuración básica.
          </Text>
        </div>

        <Divider />

        {/* Steps */}
        <Stack gap="xl">
          <Step
            number={1}
            title="Crea tus servicios"
            description="Agrega los servicios que ofrece tu negocio: nombre, duración y precio. Son la base para poder agendar citas."
            done={hasServices}
            ctaLabel="Ir a Servicios"
            ctaHref="/gestionar-servicios"
          />

          <Step
            number={2}
            title="Crea tu primer empleado o colaborador"
            description="Necesitas al menos un empleado activo para poder mostrar columnas en la agenda y asignarle citas."
            done={hasEmployees}
            ctaLabel="Ir a Empleados"
            ctaHref="/gestionar-empleados"
          />

          <Step
            number={3}
            title="Asigna servicios al empleado"
            description='En la página de empleados, haz clic sobre el empleado y abre la pestaña "Servicios" para asignarle los servicios que él realiza.'
            done={hasServicesAssigned}
            ctaLabel="Gestionar empleados"
            ctaHref="/gestionar-empleados"
          />

          <Step
            number={4}
            title="¡Crea tu primera cita!"
            description="Ahora puedes usar la agenda. Haz clic en un día del calendario para abrir la vista de ese día. Luego, haz clic sobre la columna de un empleado en la línea de tiempo para crear una cita en ese horario."
            done={allCoreStepsDone}
          >
            {allCoreStepsDone && (
              <Alert
                icon={<IconClick size={14} />}
                color="blue"
                variant="light"
                mt={4}
              >
                <Text size="xs">
                  Clic en un día del calendario → clic en la columna del
                  empleado y la línea de tiempo → se abre el modal de nueva
                  cita con el horario preseleccionado.
                </Text>
              </Alert>
            )}
          </Step>
        </Stack>

        <Divider label="Opcional pero muy recomendado" labelPosition="center" />

        {/* WhatsApp section */}
        <Alert
          icon={<IconBrandWhatsapp size={16} />}
          color="teal"
          variant="light"
          title="Conecta tu WhatsApp"
        >
          <Stack gap="xs">
            <Text size="xs">
              Conecta tu número de WhatsApp para enviar{" "}
              <strong>recordatorios automáticos</strong> a tus clientes antes
              de sus citas y reducir inasistencias.
            </Text>
            <Group gap="xs" wrap="wrap">
              <Button
                size="xs"
                color="teal"
                variant="light"
                leftSection={<IconBrandWhatsapp size={13} />}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Conectar WhatsApp
              </Button>
              <Button
                size="xs"
                color="teal"
                variant="subtle"
                leftSection={<IconMessage size={13} />}
                onClick={() => navigate("/mensajes-whatsapp")}
              >
                Personalizar mensajes
              </Button>
            </Group>
          </Stack>
        </Alert>

        {/* Link to full guide */}
        <Group justify="space-between" align="center">
          <Group gap={4}>
            <IconInfoCircle size={14} color="gray" />
            <Text size="xs" c="dimmed">
              ¿Tienes dudas sobre la reserva en línea u otras funciones?
            </Text>
          </Group>
          <Anchor
            size="xs"
            onClick={() => navigate("/instrucciones")}
            style={{ cursor: "pointer" }}
          >
            Ver guía completa y preguntas frecuentes →
          </Anchor>
        </Group>
      </Stack>
    </Paper>
  );
}
