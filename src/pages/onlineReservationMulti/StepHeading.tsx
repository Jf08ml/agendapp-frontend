import { Stack, Text } from "@mantine/core";

interface StepHeadingProps {
  /** Instrucción principal, corta y directa (ej. "Elige el día") */
  title: string;
  /** Una línea opcional de apoyo */
  hint?: React.ReactNode;
}

// Encabezado común de cada sección del wizard de reserva: una instrucción clara
// en lugar de párrafos explicativos.
export default function StepHeading({ title, hint }: StepHeadingProps) {
  return (
    <Stack gap={2}>
      <Text fw={700} size="lg" lh={1.25}>
        {title}
      </Text>
      {hint && (
        <Text size="sm" c="dimmed" lh={1.35}>
          {hint}
        </Text>
      )}
    </Stack>
  );
}
