import { Card, Divider, Group, Text, ThemeIcon, Title } from "@mantine/core";
import React from "react";

export default function SectionCard({
  title,
  description,
  icon,
  iconColor = "blue",
  children,
}: {
  title: string;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card withBorder radius="lg" p="lg">
      <Group gap="sm" mb="xs" align="flex-start">
        {icon && (
          <ThemeIcon size="lg" radius="md" color={iconColor} variant="light">
            {icon}
          </ThemeIcon>
        )}
        <div style={{ flex: 1 }}>
          <Title order={4}>{title}</Title>
          {description && (
            <Text c="dimmed" size="sm" mt={2}>
              {description}
            </Text>
          )}
        </div>
      </Group>
      <Divider mb="md" />
      {children}
    </Card>
  );
}
