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
} from "@mantine/core";
import { FaCheckCircle } from "react-icons/fa";

interface ReferredPlanProps {
  referralsMade: number;
  totalReferrals: number;
  referredReward: string;
}

const ReferredPlan: React.FC<ReferredPlanProps> = ({
  referralsMade,
  totalReferrals,
  referredReward,
}) => {
  const theme = useMantineTheme();
  const completed = totalReferrals > 0 && referralsMade >= totalReferrals;
  const safeTotal = totalReferrals > 0 ? totalReferrals : 1;
  const percent = Math.min(100, (referralsMade / safeTotal) * 100);

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
      </Stack>
    </Card>
  );
};

export default ReferredPlan;
