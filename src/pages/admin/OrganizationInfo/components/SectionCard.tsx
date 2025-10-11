import { Card, Group, Text, Title } from "@mantine/core";

export default function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card withBorder radius="lg" p="md" mb="lg">
      <Group justify="space-between" align="center" mb="xs">
        <Title order={4}>{title}</Title>
      </Group>
      {description && (
        <Text c="dimmed" size="sm" mb="md">
          {description}
        </Text>
      )}
      {children}
    </Card>
  );
}
