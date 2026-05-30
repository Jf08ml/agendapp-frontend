import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  SimpleGrid,
  ThemeIcon,
  Box,
  Paper,
  Flex,
  Button,
  rem,
} from "@mantine/core";
import {
  IconRobot,
  IconCalendarEvent,
  IconChevronRight,
  IconCheck,
  IconArrowRight,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface BookingChoiceScreenProps {
  onSelectAI: () => void;
  onSelectManual: () => void;
}

// Mini-conversación (desktop)
function ChatPreview() {
  return (
    <Stack gap={8}>
      <Flex align="flex-end" gap={6}>
        <ThemeIcon size={22} radius="xl"
          style={{ background: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
          <IconRobot size={12} color="white" />
        </ThemeIcon>
        <Paper px="sm" py={rem(5)} radius="xl"
          style={{ background: "rgba(255,255,255,0.18)" }}>
          <Text size="xs" c="white" lh={1.4}>¿Qué servicio buscas?</Text>
        </Paper>
      </Flex>
      <Flex justify="flex-end">
        <Paper px="sm" py={rem(5)} radius="xl"
          style={{ background: "rgba(255,255,255,0.30)" }}>
          <Text size="xs" c="white" lh={1.4}>Quiero un corte de cabello</Text>
        </Paper>
      </Flex>
      <Flex align="flex-end" gap={6}>
        <ThemeIcon size={22} radius="xl"
          style={{ background: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
          <IconRobot size={12} color="white" />
        </ThemeIcon>
        <Paper px="sm" py={rem(5)} radius="xl"
          style={{ background: "rgba(255,255,255,0.18)" }}>
          <Text size="xs" c="white" lh={1.4}>¡Perfecto! Busco horarios...</Text>
        </Paper>
      </Flex>
    </Stack>
  );
}

// Pills de pasos (desktop)
function StepsPreview() {
  const steps = ["Servicio", "Fecha", "Hora", "Confirmar"];
  return (
    <Stack gap="xs" align="center">
      <ThemeIcon size={44} radius="xl" color="gray" variant="light">
        <IconCalendarEvent size={24} />
      </ThemeIcon>
      <Flex align="center" justify="center" gap={4} wrap="wrap">
        {steps.map((step, i) => (
          <Flex key={step} align="center" gap={4}>
            <Paper px={rem(10)} py={rem(5)} radius="sm" bg="white" shadow="xs">
              <Text size="xs" fw={600} c="dark.6">{step}</Text>
            </Paper>
            {i < steps.length - 1 && (
              <IconChevronRight size={12} color="var(--mantine-color-gray-4)" />
            )}
          </Flex>
        ))}
      </Flex>
    </Stack>
  );
}

const AI_FEATURES    = ["Sin formularios — solo escribe", "Te guío paso a paso", "Listo en segundos"];
const MANUAL_FEATURES = ["Ve toda la disponibilidad", "Elige profesional y horario", "Control total"];

export default function BookingChoiceScreen({ onSelectAI, onSelectManual }: BookingChoiceScreenProps) {
  const org      = useSelector((s: RootState) => s.organization.organization);
  const color    = org?.branding?.primaryColor || "#1C3461";
  const orgName  = org?.name;
  const agentName = org?.aiAssistantName || "Roxi";

  return (
    <Stack align="center" gap="lg" py="xs" w="100%">

      <Stack align="center" gap={4}>
        <Title order={2} ta="center" lh={1.2}>
          Reserva tu cita{orgName ? ` en ${orgName}` : ""}
        </Title>
        <Text c="dimmed" ta="center" size="sm">¿Cómo prefieres continuar?</Text>
      </Stack>

      {/* ══════════════════════════════════════════════
          MOBILE — dos tarjetas horizontales visibles
          a la vez, sin necesidad de scroll
      ══════════════════════════════════════════════ */}
      <Stack gap="sm" w="100%" maw={480} hiddenFrom="sm">

        {/* IA — mobile */}
        <Card withBorder radius="lg" p={0}
          style={{ cursor: "pointer", overflow: "hidden", borderColor: color, borderWidth: 2,
            transition: "box-shadow 150ms" }}
          onClick={onSelectAI}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 18px ${color}40`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <Flex>
            {/* Franja de color con ícono */}
            <Flex align="center" justify="center"
              style={{ background: color, width: rem(72), flexShrink: 0 }}>
              <ThemeIcon size={40} radius="xl"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                <IconRobot size={22} color="white" />
              </ThemeIcon>
            </Flex>
            {/* Texto */}
            <Stack gap={4} p="md" flex={1} justify="center">
              <Group gap={6} align="center">
                <Text fw={700} size="sm">Habla con {agentName}</Text>
                <Badge size="xs" color="yellow" variant="light">Beta</Badge>
              </Group>
              <Text size="xs" c="dimmed" lh={1.3}>
                Escribe lo que necesitas, yo me encargo del resto.
              </Text>
              <Button size="xs" mt={4} style={{ background: color }}
                rightSection={<IconArrowRight size={12} />}>
                Empezar a chatear
              </Button>
            </Stack>
          </Flex>
        </Card>

        {/* Manual — mobile */}
        <Card withBorder radius="lg" p={0}
          style={{ cursor: "pointer", overflow: "hidden",
            transition: "box-shadow 150ms" }}
          onClick={onSelectManual}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 18px rgba(0,0,0,0.10)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <Flex>
            {/* Franja gris con ícono */}
            <Flex align="center" justify="center"
              style={{ background: "var(--mantine-color-gray-1)", width: rem(72), flexShrink: 0 }}>
              <ThemeIcon size={40} radius="xl" color="gray" variant="light">
                <IconCalendarEvent size={22} />
              </ThemeIcon>
            </Flex>
            {/* Texto */}
            <Stack gap={4} p="md" flex={1} justify="center">
              <Text fw={700} size="sm">Reserva paso a paso</Text>
              <Text size="xs" c="dimmed" lh={1.3}>
                Elige servicio, fecha y hora tú mismo.
              </Text>
              <Button size="xs" mt={4} variant="default"
                rightSection={<IconArrowRight size={12} />}>
                Reservar manualmente
              </Button>
            </Stack>
          </Flex>
        </Card>

      </Stack>

      {/* ══════════════════════════════════════════════
          DESKTOP — tarjetas verticales enriquecidas
          con preview visual y lista de beneficios
      ══════════════════════════════════════════════ */}
      <SimpleGrid cols={2} spacing="md" w="100%" maw={680} visibleFrom="sm">

        {/* IA — desktop */}
        <Card withBorder radius="lg" p={0}
          style={{ cursor: "pointer", overflow: "hidden",
            borderColor: color, borderWidth: 2,
            transition: "box-shadow 150ms ease, transform 150ms ease" }}
          onClick={onSelectAI}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}40`;
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          <Box p="lg" style={{ background: color }}>
            <ChatPreview />
          </Box>
          <Stack gap="sm" p="lg">
            <Group gap="xs" align="center">
              <Text fw={800} size="lg" lh={1.2}>Habla con {agentName}</Text>
              <Badge size="xs" color="yellow" variant="light"
                style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>Beta</Badge>
            </Group>
            <Text size="sm" c="dimmed" lh={1.4}>
              Cuéntame qué necesitas y te consigo la cita. Nada de formularios.
            </Text>
            <Stack gap={6} mt={2}>
              {AI_FEATURES.map((f) => (
                <Flex key={f} align="center" gap={8}>
                  <IconCheck size={13} color={color} style={{ flexShrink: 0 }} />
                  <Text size="xs" c="dimmed">{f}</Text>
                </Flex>
              ))}
            </Stack>
            <Button mt="sm" style={{ background: color }}
              rightSection={<IconArrowRight size={14} />}>
              Empezar a chatear
            </Button>
          </Stack>
        </Card>

        {/* Manual — desktop */}
        <Card withBorder radius="lg" p={0}
          style={{ cursor: "pointer", overflow: "hidden",
            transition: "box-shadow 150ms ease, transform 150ms ease" }}
          onClick={onSelectManual}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          <Box p="lg" bg="gray.1">
            <StepsPreview />
          </Box>
          <Stack gap="sm" p="lg">
            <Text fw={800} size="lg" lh={1.2}>Reserva paso a paso</Text>
            <Text size="sm" c="dimmed" lh={1.4}>
              Selecciona servicio, fecha y hora tú mismo, con total control.
            </Text>
            <Stack gap={6} mt={2}>
              {MANUAL_FEATURES.map((f) => (
                <Flex key={f} align="center" gap={8}>
                  <IconCheck size={13} color="var(--mantine-color-gray-5)"
                    style={{ flexShrink: 0 }} />
                  <Text size="xs" c="dimmed">{f}</Text>
                </Flex>
              ))}
            </Stack>
            <Button mt="sm" variant="default"
              rightSection={<IconArrowRight size={14} />}>
              Reservar manualmente
            </Button>
          </Stack>
        </Card>

      </SimpleGrid>

    </Stack>
  );
}
