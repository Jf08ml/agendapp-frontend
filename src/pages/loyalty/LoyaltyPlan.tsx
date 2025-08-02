import React from "react";
import { Box, Text, Progress, Center, Stack, useMantineTheme, Card } from "@mantine/core";
import { FaMedal } from "react-icons/fa";

interface LoyaltyPlanProps {
  servicesTaken: number;
  totalServices: number;
  serviceReward: string;
  primaryColor?: string;
}

const LoyaltyPlan: React.FC<LoyaltyPlanProps> = ({
  servicesTaken,
  totalServices,
  serviceReward,
  primaryColor,
}) => {
  const theme = useMantineTheme();
  const colorProgress =
    primaryColor?.startsWith("#") && primaryColor.length >= 4
      ? primaryColor
      : theme.colors[theme.primaryColor][6];

  const completed = totalServices > 0 && servicesTaken >= totalServices;
  const safeTotal = totalServices > 0 ? totalServices : 1;
  const progress = Math.min(100, (servicesTaken / safeTotal) * 100);

  return (
    <Card
      shadow="lg"
      radius="2xl"
      withBorder
      miw={260}
      maw={420}
      m="auto"
      mt="xl"
      style={{
        border: completed
          ? `2px solid ${theme.colors[theme.primaryColor][6]}`
          : `1.5px solid ${theme.colors.gray[3]}`,
        transition: "all .4s",
      }}
    >
      <Stack gap="xs" align="center">
        <Text
          fw={900}
          size="xl"
          style={{
            color: completed
              ? colorProgress
              : theme.colors[theme.primaryColor][6],
            letterSpacing: 0.4,
            textAlign: "center",
          }}
        >
          Plan de Lealtad
        </Text>

        <Text c="dimmed" size="md" style={{ textAlign: "center" }}>
          <b>{servicesTaken}</b> / {totalServices} servicios
        </Text>

        <Progress
          value={progress}
          size="lg"
          radius="xl"
          striped
          animated
          color={primaryColor ? undefined : theme.primaryColor}
          style={{
            width: "85%",
            margin: "0 auto",
            marginTop: 6,
            marginBottom: 4,
            transition: "all .4s",
          }}
        />

        <Box mt="sm" w="100%">
          {completed ? (
            <Center>
              <FaMedal
                color={colorProgress}
                size={32}
                style={{ marginRight: 12, verticalAlign: "middle" }}
              />
              <Text
                fw={700}
                size="lg"
                ml={4}
                ta="center"
                style={{ color: colorProgress }}
              >
                ¡Felicidades! Completaste tu plan.
                <br />
                <Text span fw={800}>
                  Recompensa: <b>{serviceReward}</b>
                </Text>
              </Text>
            </Center>
          ) : totalServices > 0 ? (
            <Text c="dimmed" size="sm" ta="center" mt={4}>
              Te faltan{" "}
              <Text span fw={700}>
                {Math.max(totalServices - servicesTaken, 0)}
              </Text>{" "}
              servicio
              {totalServices - servicesTaken === 1 ? "" : "s"} para obtener{" "}
              <Text span fw={800}>
                {serviceReward}
              </Text>
              .
            </Text>
          ) : (
            <Text c="dimmed" size="sm" ta="center" mt={4}>
              Este plan aún no tiene meta configurada.
            </Text>
          )}
        </Box>
      </Stack>
    </Card>
  );
};

export default LoyaltyPlan;
