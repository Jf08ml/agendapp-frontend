import React from "react";
import {
  Card,
  Text,
  Progress,
  useMantineTheme,
  Box,
  rem,
  Center,
  Stack,
  Divider,
  Badge,
  Group,
} from "@mantine/core";
import { FaCheckCircle } from "react-icons/fa";
import { RewardHistoryEntry } from "../../services/clientService";

interface ReferredPlanProps {
  referralsMade: number;
  totalReferrals: number;
  referredReward: string;
  rewardHistory?: RewardHistoryEntry[];
}

const ReferredPlan: React.FC<ReferredPlanProps> = ({
  referralsMade,
  totalReferrals,
  referredReward,
  rewardHistory = [],
}) => {
  const theme = useMantineTheme();
  const completed = totalReferrals > 0 && referralsMade >= totalReferrals;
  const safeTotal = totalReferrals > 0 ? totalReferrals : 1;
  const percent = Math.min(100, (referralsMade / safeTotal) * 100);

  const lastFive = rewardHistory.slice(-5).reverse();

  return (
    <Card
      shadow="lg"
      radius="2xl"
      withBorder
      miw={260}
      maw={420}
      m="auto"
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
              ? theme.colors[theme.primaryColor][7]
              : theme.colors[theme.primaryColor][6],
            letterSpacing: 0.4,
            textAlign: "center",
          }}
        >
          Plan de Referidos
        </Text>

        <Text c="dimmed" size="md" style={{ textAlign: "center" }}>
          <b>{referralsMade}</b> / {totalReferrals} referidos
        </Text>

        <Progress
          value={percent}
          size="lg"
          radius="xl"
          striped
          animated
          color={theme.primaryColor}
          style={{
            width: "85%",
            margin: "0 auto",
            marginTop: rem(6),
            marginBottom: rem(4),
            transition: "all .4s",
          }}
        />

        <Box mt="sm" w="100%">
          {completed ? (
            <Center>
              <FaCheckCircle
                color={theme.colors[theme.primaryColor][6]}
                size={32}
                style={{ marginRight: 12, verticalAlign: "middle" }}
              />
              <Text
                fw={700}
                size="lg"
                ml={4}
                ta="center"
                style={{ color: theme.colors[theme.primaryColor][6] }}
              >
                ¡Felicidades! Has alcanzado tu meta.
                <br />
                <Text span fw={800}>
                  Recompensa: <b>{referredReward}</b>
                </Text>
              </Text>
            </Center>
          ) : (
            <Text c="dimmed" size="sm" ta="center" mt={4}>
              {totalReferrals > 0 ? (
                <>
                  Te faltan{" "}
                  <Text span fw={700}>
                    {Math.max(totalReferrals - referralsMade, 0)}
                  </Text>{" "}
                  referido
                  {totalReferrals - referralsMade === 1 ? "" : "s"} para obtener{" "}
                  <Text span fw={800}>
                    {referredReward}
                  </Text>
                  .
                </>
              ) : (
                <>Este plan aún no tiene meta configurada.</>
              )}
            </Text>
          )}
        </Box>

        {lastFive.length > 0 && (
          <>
            <Divider w="90%" label="Historial de premios" labelPosition="center" mt="xs" />
            <Stack gap={4} w="100%">
              {lastFive.map((entry) => (
                <Group key={entry._id} justify="space-between" px="xs" wrap="nowrap">
                  <Text size="xs" c="dimmed" style={{ flex: 1 }} truncate="end">
                    🎁 {entry.reward}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      {new Date(entry.earnedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                    </Text>
                    <Badge size="xs" color={entry.redeemed ? "green" : "orange"} variant="light">
                      {entry.redeemed ? "Canjeado" : "Pendiente"}
                    </Badge>
                  </Group>
                </Group>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
};

export default ReferredPlan;
