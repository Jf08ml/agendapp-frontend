import { useNavigate } from "react-router-dom";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Container,
  Divider,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBrandWhatsapp,
  IconCalendar,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconMessage,
  IconQuestionMark,
  IconScissors,
  IconSettings,
  IconUsers,
  IconClick,
  IconArrowRight,
  IconBulb,
} from "@tabler/icons-react";

interface StepCardProps {
  number: number;
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  tips?: string[];
  ctaLabel?: string;
  ctaHref?: string;
}

function StepCard({
  number,
  icon,
  iconColor,
  title,
  description,
  tips,
  ctaLabel,
  ctaHref,
}: StepCardProps) {
  const navigate = useNavigate();

  return (
    <Paper withBorder radius="md" p="md">
      <Group gap="sm" align="flex-start" mb="xs">
        <ThemeIcon size="lg" radius="xl" color={iconColor} variant="light">
          {icon}
        </ThemeIcon>
        <div style={{ flex: 1 }}>
          <Group gap="xs">
            <Badge size="sm" color={iconColor} variant="light" circle>
              {number}
            </Badge>
            <Text fw={600} size="sm">
              {title}
            </Text>
          </Group>
        </div>
      </Group>
      <Text size="sm" c="dimmed" mb={tips || ctaLabel ? "xs" : 0}>
        {description}
      </Text>
      {tips && tips.length > 0 && (
        <List size="xs" spacing={2} mb="xs" icon={<IconCheck size={11} />}>
          {tips.map((tip, i) => (
            <List.Item key={i}>{tip}</List.Item>
          ))}
        </List>
      )}
      {ctaLabel && ctaHref && (
        <Button
          size="xs"
          variant="light"
          color={iconColor}
          rightSection={<IconArrowRight size={13} />}
          onClick={() => navigate(ctaHref)}
          mt={4}
        >
          {ctaLabel}
        </Button>
      )}
    </Paper>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <Container size="md" py="md">
      {/* Header */}
      <Group gap="sm" mb="xs">
        <ThemeIcon size="xl" radius="md" color="blue" variant="light">
          <IconQuestionMark size={20} />
        </ThemeIcon>
        <div>
          <Title order={2}>Instrucciones y ayuda</Title>
          <Text size="sm" c="dimmed">
            Todo lo que necesitas saber para sacarle el máximo provecho a la
            plataforma.
          </Text>
        </div>
      </Group>

      <Divider my="md" />

      {/* ─── Primeros pasos ─── */}
      <Stack gap="xl">
        <div>
          <Group gap="xs" mb="sm">
            <ThemeIcon size="md" radius="md" color="blue" variant="light">
              <IconCalendarEvent size={16} />
            </ThemeIcon>
            <Title order={4}>Primeros pasos — Configura tu agenda</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Sigue estos pasos en orden para empezar a crear citas con tus clientes.
          </Text>

          <Stack gap="sm">
            <StepCard
              number={1}
              icon={<IconScissors size={16} />}
              iconColor="violet"
              title="Crea tus servicios"
              description="Los servicios son los tratamientos o trabajos que ofrece tu negocio. Debes definirlos antes de asignarlos a un empleado."
              tips={[
                "Agrega el nombre, duración y precio de cada servicio",
                "Puedes marcarlo como activo o inactivo",
                "También puedes importar servicios desde un archivo Excel",
              ]}
              ctaLabel="Ir a Servicios"
              ctaHref="/gestionar-servicios"
            />

            <StepCard
              number={2}
              icon={<IconUsers size={16} />}
              iconColor="teal"
              title="Crea tu primer empleado"
              description="Los empleados son quienes aparecen como columnas en la agenda. Necesitas al menos uno activo para poder crear citas."
              tips={[
                "Cada empleado tiene su propio color en la agenda",
                "Puedes asignarles un rol con permisos específicos",
                "Si eres tú solo quien trabaja, créate como empleado",
              ]}
              ctaLabel="Ir a Empleados"
              ctaHref="/gestionar-empleados"
            />

            <StepCard
              number={3}
              icon={<IconSettings size={16} />}
              iconColor="orange"
              title="Asigna servicios al empleado"
              description='En la página de empleados, haz clic sobre un empleado para abrir su detalle. Luego busca la pestaña "Servicios" y selecciona cuáles puede realizar ese empleado.'
              tips={[
                "Solo los servicios asignados aparecerán disponibles al crear una cita",
                "Puedes asignarle servicios distintos a cada empleado",
              ]}
              ctaLabel="Gestionar empleados"
              ctaHref="/gestionar-empleados"
            />

            <StepCard
              number={4}
              icon={<IconClick size={16} />}
              iconColor="blue"
              title="Crea tu primera cita en la agenda"
              description="Una vez configurado el paso anterior, ya puedes usar la agenda para crear citas manualmente."
              tips={[
                "Haz clic en un día del calendario mensual para abrir la vista de ese día",
                "Dentro del día, verás una columna por cada empleado activo",
                "Haz clic en la línea de tiempo (la hora que deseas) en la columna del empleado",
                "Se abrirá el formulario de nueva cita con la hora y empleado preseleccionados",
              ]}
              ctaLabel="Ir a la Agenda"
              ctaHref="/gestionar-agenda"
            />
          </Stack>
        </div>

        <Divider />

        {/* ─── WhatsApp ─── */}
        <div>
          <Group gap="xs" mb="sm">
            <ThemeIcon size="md" radius="md" color="teal" variant="light">
              <IconBrandWhatsapp size={16} />
            </ThemeIcon>
            <Title order={4}>WhatsApp — Recordatorios y mensajes</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            La integración con WhatsApp te permite enviar recordatorios
            automáticos a tus clientes y mantenerlos informados.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Paper withBorder radius="md" p="md">
              <Group gap="sm" mb="xs">
                <ThemeIcon size="md" radius="md" color="teal" variant="light">
                  <IconBrandWhatsapp size={14} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  1. Conecta tu número de WhatsApp
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                Ve a "Gestionar WhatsApp" para escanear el código QR con tu
                teléfono. Una vez conectado, la plataforma podrá enviar mensajes
                en tu nombre.
              </Text>
              <Button
                size="xs"
                color="teal"
                variant="light"
                leftSection={<IconBrandWhatsapp size={13} />}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Conectar WhatsApp
              </Button>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Group gap="sm" mb="xs">
                <ThemeIcon size="md" radius="md" color="teal" variant="light">
                  <IconMessage size={14} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  2. Personaliza los mensajes
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                En "Mensajes de WhatsApp" puedes editar el texto de cada
                plantilla: confirmaciones, recordatorios, cancelaciones y más.
                Usa variables como <code>{"{{clientName}}"}</code> para
                personalizarlos.
              </Text>
              <Button
                size="xs"
                color="teal"
                variant="light"
                leftSection={<IconMessage size={13} />}
                onClick={() => navigate("/mensajes-whatsapp")}
              >
                Ver mensajes
              </Button>
            </Paper>
          </SimpleGrid>

          <Alert
            icon={<IconClock size={14} />}
            color="blue"
            variant="light"
            mt="sm"
          >
            <Text size="xs">
              Los <strong>recordatorios automáticos</strong> se envían horas
              antes de cada cita según lo que configures en{" "}
              <Text
                component="span"
                size="xs"
                c="blue"
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => navigate("/informacion-negocio")}
              >
                Configuración del negocio → Recordatorios
              </Text>
              .
            </Text>
          </Alert>
        </div>

        <Divider />

        {/* ─── Reservas en línea ─── */}
        <div>
          <Group gap="xs" mb="sm">
            <ThemeIcon size="md" radius="md" color="indigo" variant="light">
              <IconCalendar size={16} />
            </ThemeIcon>
            <Title order={4}>Reservas en línea</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Permite que tus clientes reserven sus propias citas desde tu página
            pública, sin necesidad de llamar o escribir.
          </Text>

          <Stack gap="sm">
            <Paper withBorder radius="md" p="md">
              <Text fw={600} size="sm" mb={4}>
                Configura tus horarios de atención
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                Ve a{" "}
                <Text
                  component="span"
                  size="xs"
                  c="blue"
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => navigate("/informacion-negocio")}
                >
                  Configuración del negocio → Horario y reservas
                </Text>{" "}
                para definir los días y horas en que tu negocio acepta
                reservas. Puedes usar un horario general para toda la
                organización o configurar horarios individuales por día.
              </Text>
              <List size="xs" spacing={2}>
                <List.Item>
                  <strong>Horario general:</strong> define hora de apertura y
                  cierre más los días laborables
                </List.Item>
                <List.Item>
                  <strong>Horarios personalizados:</strong> configura cada día
                  de la semana por separado (ideal si el negocio tiene horarios
                  variados)
                </List.Item>
                <List.Item>
                  <strong>Intervalo de tiempo:</strong> controla cada cuántos
                  minutos aparecen los slots disponibles para el cliente
                </List.Item>
              </List>
            </Paper>

            <Alert
              icon={<IconBulb size={14} />}
              color="indigo"
              variant="light"
            >
              <Text size="xs">
                También puedes configurar un horario distinto por empleado. Abre
                el empleado y busca la sección de horario. Esto tiene prioridad
                sobre el horario general de la organización.
              </Text>
            </Alert>
          </Stack>
        </div>

        <Divider />

        {/* ─── FAQ ─── */}
        <div>
          <Group gap="xs" mb="sm">
            <ThemeIcon size="md" radius="md" color="gray" variant="light">
              <IconQuestionMark size={16} />
            </ThemeIcon>
            <Title order={4}>Preguntas frecuentes</Title>
          </Group>

          <Accordion variant="separated" radius="md">
            <Accordion.Item value="no-citas">
              <Accordion.Control>
                ¿Por qué no puedo crear citas en la agenda?
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Text size="sm">Para poder crear citas necesitas:</Text>
                  <List size="sm" spacing={4}>
                    <List.Item>Tener al menos un <strong>servicio</strong> creado</List.Item>
                    <List.Item>Tener al menos un <strong>empleado activo</strong></List.Item>
                    <List.Item>
                      Tener al menos un servicio <strong>asignado al empleado</strong>
                    </List.Item>
                  </List>
                  <Text size="sm">
                    Sigue los pasos de "Primeros pasos" en la parte superior de
                    esta guía.
                  </Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="asignar-servicios">
              <Accordion.Control>
                ¿Cómo asigno servicios a un empleado?
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Ve a{" "}
                  <Text
                    component="span"
                    size="sm"
                    c="blue"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => navigate("/gestionar-empleados")}
                  >
                    Gestionar empleados
                  </Text>
                  , haz clic sobre el nombre o la tarjeta del empleado para
                  abrir su detalle. Dentro del modal, busca la pestaña{" "}
                  <strong>"Servicios"</strong> y selecciona los servicios que
                  ese empleado puede realizar. Guarda los cambios.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="horarios-personalizados">
              <Accordion.Control>
                ¿Para qué sirven los horarios personalizados por día?
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Los horarios personalizados te permiten definir un horario
                  diferente para cada día de la semana. Por ejemplo, lunes de
                  9 AM a 6 PM y viernes de 9 AM a 2 PM. Esto es útil si tu
                  negocio no tiene un horario fijo todos los días. Los horarios
                  personalizados tienen <strong>prioridad</strong> sobre el
                  horario general de apertura y cierre.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="recordatorio-wa">
              <Accordion.Control>
                ¿Cómo funcionan los recordatorios automáticos de WhatsApp?
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Text size="sm">
                    Cuando tienes WhatsApp conectado y los recordatorios
                    habilitados, el sistema envía automáticamente un mensaje a
                    cada cliente antes de su cita. El comportamiento es:
                  </Text>
                  <List size="sm" spacing={4}>
                    <List.Item>
                      Se calculan las horas de anticipación configuradas en
                      Recordatorios (ej. 24h antes)
                    </List.Item>
                    <List.Item>
                      Si la hora calculada cae fuera del rango de envío
                      permitido, se ajusta al inicio del rango
                    </List.Item>
                    <List.Item>
                      Varias citas el mismo día se consolidan en un solo mensaje
                    </List.Item>
                    <List.Item>
                      Puedes configurar un segundo recordatorio más cercano a la
                      cita
                    </List.Item>
                  </List>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="reserva-fuera-horario">
              <Accordion.Control>
                ¿Qué pasa si la reserva de un cliente cae fuera del horario de
                atención?
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  La plataforma solo muestra a los clientes los horarios
                  disponibles dentro del rango de atención configurado, por lo
                  que un cliente no puede seleccionar un horario fuera de ese
                  rango. Si cambias el horario después de que alguien haya
                  reservado, la cita existente no se cancela automáticamente;
                  deberías revisarla manualmente.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="deposito-reserva">
              <Accordion.Control>
                ¿Puedo cobrar un anticipo (depósito) al momento de la reserva?
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Sí. En{" "}
                  <Text
                    component="span"
                    size="sm"
                    c="blue"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => navigate("/informacion-negocio")}
                  >
                    Configuración del negocio → Horario y reservas
                  </Text>{" "}
                  puedes activar la opción de <strong>depósito de reserva</strong>{" "}
                  y definir el porcentaje del valor del servicio que el cliente
                  debe pagar para confirmar su cita.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="cliente-cancelar">
              <Accordion.Control>
                ¿Cómo puede un cliente cancelar su cita?
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Cada mensaje de confirmación de cita incluye un{" "}
                  <strong>enlace de cancelación</strong> personalizado y seguro.
                  El cliente puede hacer clic en ese enlace para cancelar su
                  cita sin necesidad de iniciar sesión. Puedes controlar en qué
                  condiciones se permite cancelar desde{" "}
                  <Text
                    component="span"
                    size="sm"
                    c="blue"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => navigate("/informacion-negocio")}
                  >
                    Configuración del negocio → Cancelación
                  </Text>
                  .
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      </Stack>
    </Container>
  );
}
