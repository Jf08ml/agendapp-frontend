import React from "react";
import { Box, Group, Text, Progress } from "@mantine/core";

interface LoyaltyPlanProps {
  servicesTaken: number;
  totalServices: number;
  serviceReward: string;
}

const LoyaltyPlan: React.FC<LoyaltyPlanProps> = ({
  servicesTaken,
  totalServices,
  serviceReward,
}) => {
  const progress = (servicesTaken / totalServices) * 100;

  return (
    <Box
      bg="#1A202C"
      p="xl"
      m="auto"
      mt="sm"
      style={{
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        color: "#E2E8F0",
      }}
    >
      <Group>
        <Text size="xl" fw={700}>
          Plan de Lealtad
        </Text>
        <Text size="md" c="dimmed">
          {servicesTaken} de {totalServices} servicios tomados
        </Text>
      </Group>

      <Progress
        value={progress}
        size="lg"
        mt="md"
        color={servicesTaken === totalServices ? "green" : "blue"}
      />

      {servicesTaken === totalServices ? (
        <Text mt="md" c="green" fw={500}>
          ¡Felicidades! Has completado {totalServices} servicios. Recibe{" "}
          {serviceReward}.
        </Text>
      ) : (
        <Text mt="md" c="dimmed">
          Completa {totalServices - servicesTaken} servicio(s) más para obtener{" "}
          {serviceReward}.
        </Text>
      )}
    </Box>
  );
};

export default LoyaltyPlan;
