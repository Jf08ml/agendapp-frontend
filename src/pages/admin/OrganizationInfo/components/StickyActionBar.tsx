import { Button, Card, Group, Text, rem } from "@mantine/core";

export default function StickyActionBar({
  isDirty,
  saving,
  onCancel,
  onSave,
}: {
  isDirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Card
      withBorder
      radius="lg"
      shadow="sm"
      style={{
        position: "sticky",
        bottom: 8,
        zIndex: 5,
        marginTop: rem(16),
        backdropFilter: "blur(6px)",
      }}
    >
      <Group justify="space-between">
        <Text size="sm" c={isDirty ? "yellow.7" : "dimmed"}>
          {isDirty ? "Tienes cambios sin guardar" : "Sin cambios"}
        </Text>
        <Group>
          <Button
            variant="light"
            color="gray"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button color="green" onClick={onSave} loading={saving}>
            Guardar cambios
          </Button>
        </Group>
      </Group>
    </Card>
  );
}
