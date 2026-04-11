import {
  Stack, Group, Button, Text, Paper, ThemeIcon, SimpleGrid,
  Title, Center, Box, Badge, List,
} from "@mantine/core";
import {
  IconRocket, IconCheck, IconBrandWhatsapp, IconCalendar,
  IconUsers, IconSettings, IconStar,
} from "@tabler/icons-react";

interface Props {
  onFinish: () => void;
  saving: boolean;
}

const NEXT_STEPS = [
  {
    icon: <IconBrandWhatsapp size={18} />,
    color: "green",
    title: "Conecta tu WhatsApp",
    description: "Vincula tu número de WhatsApp para enviar confirmaciones y recordatorios automáticos a tus clientes.",
  },
  {
    icon: <IconCalendar size={18} />,
    color: "blue",
    title: "Revisa tu agenda",
    description: "Explora el calendario de citas y familiarízate con las vistas diaria, semanal y mensual.",
  },
  {
    icon: <IconUsers size={18} />,
    color: "violet",
    title: "Agrega más profesionales",
    description: "Invita a todos los miembros de tu equipo con sus horarios y servicios específicos.",
  },
  {
    icon: <IconSettings size={18} />,
    color: "orange",
    title: "Personaliza los mensajes",
    description: "Edita los templates de WhatsApp para que los mensajes suenen con la voz de tu marca.",
  },
];

export default function StepFinish({ onFinish, saving }: Props) {
  return (
    <Stack gap="xl" align="center">
      {/* Hero de celebración */}
      <Center>
        <Stack align="center" gap="md">
          <Box
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "var(--mantine-color-green-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThemeIcon size={64} radius="50%" color="green" variant="filled">
              <IconCheck size={36} />
            </ThemeIcon>
          </Box>
          <Stack gap={4} align="center">
            <Title order={2} ta="center">¡Tu negocio está listo!</Title>
            <Text c="dimmed" size="md" ta="center" maw={480}>
              Completaste la configuración inicial. Ya puedes comenzar a recibir citas y gestionar tu negocio desde la plataforma.
            </Text>
          </Stack>
          <Badge size="lg" color="green" variant="light" leftSection={<IconStar size={14} />}>
            Configuración completada
          </Badge>
        </Stack>
      </Center>

      {/* Resumen de lo configurado */}
      <Paper withBorder p="md" radius="md" w="100%">
        <Group gap="xs" mb="sm">
          <IconRocket size={18} />
          <Text fw={700} size="sm">Lo que configuraste hoy:</Text>
        </Group>
        <List
          spacing="xs"
          size="sm"
          icon={<ThemeIcon size={18} radius="xl" color="green" variant="light"><IconCheck size={12} /></ThemeIcon>}
        >
          <List.Item>Primer servicio y su duración, precio y descripción</List.Item>
          <List.Item>Primer profesional con acceso a la plataforma</List.Item>
          <List.Item>Modo de aprobación de reservas en línea</List.Item>
          <List.Item>Mensaje de bienvenida y diseño de página pública</List.Item>
          <List.Item>Horario de atención y días laborales</List.Item>
          <List.Item>Identidad visual (logo, colores, branding)</List.Item>
          <List.Item>Política de cancelación y recordatorios automáticos</List.Item>
        </List>
      </Paper>

      {/* Próximos pasos */}
      <Box w="100%">
        <Text fw={700} size="sm" mb="md">Próximos pasos recomendados:</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {NEXT_STEPS.map((step, i) => (
            <Paper key={i} withBorder p="sm" radius="md">
              <Group gap="sm" align="flex-start">
                <ThemeIcon size="md" radius="md" color={step.color} variant="light">
                  {step.icon}
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={600} size="sm">{step.title}</Text>
                  <Text size="xs" c="dimmed" mt={2}>{step.description}</Text>
                </Box>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      </Box>

      <Button
        size="lg"
        leftSection={<IconBrandWhatsapp size={20} />}
        color="green"
        onClick={onFinish}
        loading={saving}
        fullWidth
        maw={400}
      >
        Ir a conectar WhatsApp
      </Button>

      <Text size="xs" c="dimmed" ta="center">
        Tu configuración ha sido guardada. Puedes ajustar cualquier detalle desde{" "}
        <Text span fw={600}>Configuración del negocio</Text> en el menú lateral.
      </Text>
    </Stack>
  );
}
