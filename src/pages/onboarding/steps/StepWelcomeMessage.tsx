import {
  Stack, TextInput, Textarea, Group, Button, Text, Paper,
  SimpleGrid, Badge, Divider, Alert, Box, useMantineTheme,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

// ── Mini-previews de cada layout ────────────────────────────────────────────

function PreviewModern({ title, description, primary }: { title: string; description: string; primary: string }) {
  const rows = ["Reserva", "Servicios", "Fidelidad", "Ubicación"];
  return (
    <Box style={{ width: "100%", height: "100%", background: "#f8f9fa", position: "relative", overflow: "hidden", padding: 8 }}>
      {/* Blobs decorativos */}
      <Box style={{ position: "absolute", top: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: `${primary}22`, filter: "blur(20px)" }} />
      <Box style={{ position: "absolute", top: -10, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${primary}18`, filter: "blur(20px)" }} />
      {/* Título */}
      <Text size="xs" fw={900} ta="center" c={primary} mb={3} lineClamp={1} style={{ fontSize: 9, lineHeight: 1.2 }}>
        {title || "¡Hola! Bienvenido"}
      </Text>
      <Text size="xs" ta="center" c="dimmed" mb={6} lineClamp={2} style={{ fontSize: 7, lineHeight: 1.3 }}>
        {description || "Estamos felices de tenerte aquí."}
      </Text>
      {/* Cards 2 columnas con icono circular + texto */}
      <SimpleGrid cols={2} spacing={4}>
        {rows.map((r) => (
          <Box key={r} style={{ background: "#fff", borderRadius: 6, border: "1px solid #e9ecef", padding: "4px 5px", display: "flex", alignItems: "center", gap: 4 }}>
            <Box style={{ width: 14, height: 14, borderRadius: "50%", background: primary, flexShrink: 0 }} />
            <Text style={{ fontSize: 7, fontWeight: 600, color: "#333" }}>{r}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

function PreviewMinimal({ title, description, primary }: { title: string; description: string; primary: string }) {
  const rows = ["Reserva", "Servicios", "Fidelidad", "Ubicación"];
  return (
    <Box style={{ width: "100%", height: "100%", background: "#fff", padding: 8 }}>
      <Text fw={900} ta="center" c="#111" mb={3} style={{ fontSize: 9, lineHeight: 1.2 }} lineClamp={1}>
        {title || "¡Hola! Bienvenido"}
      </Text>
      <Text ta="center" c="#999" mb={7} style={{ fontSize: 7, lineHeight: 1.3 }} lineClamp={2}>
        {description || "Estamos felices de tenerte aquí."}
      </Text>
      {/* Lista horizontal */}
      <Stack gap={4}>
        {rows.map((r) => (
          <Box key={r} style={{ borderRadius: 5, border: `1px solid ${primary}44`, padding: "3px 6px", display: "flex", alignItems: "center", gap: 5, boxShadow: `0 0 0 1px ${primary}22` }}>
            <Box style={{ width: 8, height: 8, borderRadius: 2, background: primary, flexShrink: 0 }} />
            <Text style={{ fontSize: 7, fontWeight: 600, color: "#333" }}>{r}</Text>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function PreviewCards({ title, description, primary }: { title: string; description: string; primary: string }) {
  const rows = ["Reserva", "Servicios", "Fidelidad", "Ubicación"];
  return (
    <Box style={{ width: "100%", height: "100%", background: `linear-gradient(180deg, ${primary}18 0%, #fff 55%)`, padding: 8 }}>
      {/* Hero card */}
      <Box style={{ background: "#fff", borderRadius: 7, border: "1px solid #e9ecef", padding: "5px 7px", marginBottom: 6, textAlign: "center" }}>
        <Text fw={800} c={primary} style={{ fontSize: 9, lineHeight: 1.2 }} lineClamp={1}>{title || "¡Hola! Bienvenido"}</Text>
        <Text c="dimmed" style={{ fontSize: 7, lineHeight: 1.3, marginTop: 2 }} lineClamp={2}>{description || "Estamos felices de tenerte aquí."}</Text>
      </Box>
      {/* Cards 2 col centradas */}
      <SimpleGrid cols={2} spacing={4}>
        {rows.map((r) => (
          <Box key={r} style={{ background: "#fff", borderRadius: 6, border: "1px solid #dee2e6", padding: "5px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Box style={{ width: 16, height: 16, borderRadius: 4, background: primary }} />
            <Text style={{ fontSize: 7, fontWeight: 700, color: "#333", textAlign: "center" }}>{r}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

function PreviewLanding({ title, description, primary }: { title: string; description: string; primary: string }) {
  return (
    <Box style={{ width: "100%", height: "100%", background: "#fff", overflow: "hidden" }}>
      {/* Hero gradient */}
      <Box style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, padding: "8px 8px 10px", marginBottom: 5, position: "relative" }}>
        <Box style={{ position: "absolute", top: -10, right: -10, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", filter: "blur(8px)" }} />
        <Text fw={900} ta="center" c="white" style={{ fontSize: 9, lineHeight: 1.2 }} lineClamp={1}>{title || "¡Hola! Bienvenido"}</Text>
        <Text ta="center" c="white" style={{ fontSize: 7, lineHeight: 1.2, opacity: 0.9, marginTop: 2 }} lineClamp={2}>{description || "Estamos felices de tenerte aquí."}</Text>
      </Box>
      {/* Servicios grid 3 cols */}
      <Box style={{ padding: "0 6px 4px" }}>
        <Text style={{ fontSize: 7, fontWeight: 700, textAlign: "center", color: "#333", marginBottom: 4 }}>Nuestros Servicios</Text>
        <SimpleGrid cols={3} spacing={3}>
          {["Serv. 1", "Serv. 2", "Serv. 3"].map((s) => (
            <Box key={s} style={{ borderRadius: 4, border: "1px solid #dee2e6", padding: "3px 2px", textAlign: "center" }}>
              <Box style={{ width: "100%", height: 14, background: `${primary}22`, borderRadius: 3, marginBottom: 2 }} />
              <Text style={{ fontSize: 6, fontWeight: 600, color: "#555" }}>{s}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
      {/* Acciones */}
      <Box style={{ background: "#f8f9fa", padding: "4px 6px" }}>
        <Text style={{ fontSize: 7, fontWeight: 700, textAlign: "center", color: "#333", marginBottom: 3 }}>¿Qué deseas hacer?</Text>
        <SimpleGrid cols={3} spacing={3}>
          {["Reserva", "Servicios", "Ubicación"].map((a) => (
            <Box key={a} style={{ borderRadius: 4, border: "1px solid #dee2e6", background: "#fff", padding: "3px 2px", textAlign: "center" }}>
              <Box style={{ width: 12, height: 12, borderRadius: "50%", background: primary, margin: "0 auto 2px" }} />
              <Text style={{ fontSize: 6, fontWeight: 600, color: "#555" }}>{a}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}

// ── Datos de layouts ─────────────────────────────────────────────────────────

const LAYOUTS = [
  {
    id: "modern",
    label: "Moderno",
    description: "Fondo claro con blobs decorativos, tarjetas en grilla con icono circular.",
    color: "violet" as const,
  },
  {
    id: "minimal",
    label: "Minimalista",
    description: "Fondo blanco, lista de acciones con borde sutil. Elegante y limpio.",
    color: "gray" as const,
  },
  {
    id: "cards",
    label: "Tarjetas",
    description: "Gradiente suave, hero en card, acciones en cuadrícula centrada.",
    color: "blue" as const,
  },
  {
    id: "landing",
    label: "Landing",
    description: "Hero colorido, sección de servicios y acciones rápidas abajo.",
    color: "teal" as const,
  },
] as const;

type LayoutId = typeof LAYOUTS[number]["id"];

// ── Componente principal ─────────────────────────────────────────────────────

export default function StepWelcomeMessage({ form, onNext, onBack, saving }: Props) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const selectedLayout = (form.values.homeLayout as LayoutId | undefined) ?? "modern";

  const title = form.values.welcomeTitle ?? "";
  const description = form.values.welcomeDescription ?? "";

  const renderPreview = (id: LayoutId) => {
    switch (id) {
      case "modern":   return <PreviewModern   title={title} description={description} primary={primary} />;
      case "minimal":  return <PreviewMinimal  title={title} description={description} primary={primary} />;
      case "cards":    return <PreviewCards    title={title} description={description} primary={primary} />;
      case "landing":  return <PreviewLanding  title={title} description={description} primary={primary} />;
    }
  };

  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Personaliza el mensaje de bienvenida y elige cómo se verá tu página pública. La vista previa se actualiza en tiempo real.
      </Alert>

      {/* Mensaje de bienvenida */}
      <Paper withBorder p="md" radius="md">
        <Text fw={700} size="sm" mb="sm">Mensaje de bienvenida</Text>
        <Divider mb="md" />
        <Stack gap="md">
          <TextInput
            label="Título de bienvenida"
            description="Encabezado principal de tu página pública"
            placeholder="Ej: ¡Bienvenido a tu espacio de bienestar!"
            {...form.getInputProps("welcomeTitle")}
          />
          <Textarea
            label="Descripción de bienvenida"
            description="Una frase que describa tu negocio o invite al cliente a reservar"
            placeholder="Ej: Aquí te mereces lo mejor. Agenda tu cita ✨"
            {...form.getInputProps("welcomeDescription")}
            minRows={2}
            autosize
          />
        </Stack>
      </Paper>

      {/* Selector de layout con preview */}
      <Paper withBorder p="md" radius="md">
        <Text fw={700} size="sm" mb="xs">Diseño de página pública</Text>
        <Text size="xs" c="dimmed" mb="md">
          Elige la apariencia de tu página de inicio. La vista previa muestra cómo verán tu negocio los clientes.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {LAYOUTS.map((layout) => {
            const isSelected = selectedLayout === layout.id;
            return (
              <Box
                key={layout.id}
                onClick={() => form.setFieldValue("homeLayout", layout.id)}
                style={{
                  cursor: "pointer",
                  borderRadius: 12,
                  border: isSelected
                    ? `2px solid var(--mantine-color-${layout.color}-6)`
                    : "1px solid var(--mantine-color-gray-3)",
                  overflow: "hidden",
                  transition: "all 0.15s",
                  boxShadow: isSelected ? `0 0 0 3px var(--mantine-color-${layout.color}-1)` : undefined,
                }}
              >
                {/* Preview visual */}
                <Box style={{ height: 180, overflow: "hidden", borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
                  {renderPreview(layout.id as LayoutId)}
                </Box>
                {/* Label + descripción */}
                <Box p="sm" style={{ background: isSelected ? `var(--mantine-color-${layout.color}-0)` : "#fff" }}>
                  <Group gap="xs" mb={4}>
                    <Text fw={700} size="sm">{layout.label}</Text>
                    {isSelected && <Badge size="xs" color={layout.color}>Seleccionado</Badge>}
                  </Group>
                  <Text size="xs" c="dimmed">{layout.description}</Text>
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      </Paper>

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">← Anterior</Button>
        <Button size="md" onClick={onNext} loading={saving}>Guardar y continuar →</Button>
      </Group>
    </Stack>
  );
}
