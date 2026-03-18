import React from "react";
import {
  Card,
  Text,
  Progress,
  useMantineTheme,
  Box,
  rem,
  Stack,
  Divider,
  Badge,
  Group,
  ThemeIcon,
} from "@mantine/core";
import { FaCheckCircle } from "react-icons/fa";
import { IconGift, IconLock } from "@tabler/icons-react";
import { RewardHistoryEntry } from "../../services/clientService";

interface Tier {
  threshold: number;
  reward: string;
}

interface ReferredPlanProps {
  referralsMade: number;
  // Nuevo: array de niveles
  referralTiers?: Tier[];
  // Legacy (un solo nivel)
  totalReferrals?: number;
  referredReward?: string;
  rewardHistory?: RewardHistoryEntry[];
}

const ReferredPlan: React.FC<ReferredPlanProps> = ({
  referralsMade,
  referralTiers,
  totalReferrals,
  referredReward,
  rewardHistory = [],
}) => {
  const theme = useMantineTheme();
  const color = theme.colors[theme.primaryColor][6];

  // Normalizar a array de tiers (soporte legacy)
  const tiers: Tier[] =
    referralTiers && referralTiers.length > 0
      ? [...referralTiers].sort((a, b) => a.threshold - b.threshold)
      : totalReferrals && totalReferrals > 0
      ? [{ threshold: totalReferrals, reward: referredReward || "" }]
      : [];

  const maxThreshold = tiers[tiers.length - 1]?.threshold ?? 0;
  const nextTier = tiers.find((t) => referralsMade < t.threshold);
  const percent =
    maxThreshold > 0 ? Math.min(100, (referralsMade / maxThreshold) * 100) : 0;

  const lastFive = rewardHistory.slice(-5).reverse();

  if (tiers.length === 0) {
    return (
      <Card shadow="lg" radius="2xl" withBorder miw={260} maw={420} m="auto">
        <Text c="dimmed" size="sm" ta="center" py="md">
          Este plan aún no tiene niveles configurados.
        </Text>
      </Card>
    );
  }

  return (
    <Card
      shadow="lg"
      radius="2xl"
      withBorder
      miw={260}
      maw={420}
      m="auto"
      style={{
        border: !nextTier
          ? `2px solid ${color}`
          : `1.5px solid ${theme.colors.gray[3]}`,
        transition: "all .4s",
      }}
    >
      <Stack gap="xs" align="center">
        <Text
          fw={900}
          size="xl"
          style={{ color, letterSpacing: 0.4, textAlign: "center" }}
        >
          Plan de Referidos
        </Text>

        <Text c="dimmed" size="md" ta="center">
          <b>{referralsMade}</b> / {maxThreshold} referidos
        </Text>

        <Progress
          value={percent}
          size="lg"
          radius="xl"
          striped
          animated
          color={theme.primaryColor}
          style={{ width: "85%", margin: `${rem(6)} auto ${rem(4)}`, transition: "all .4s" }}
        />

        {/* Niveles */}
        <Stack gap={4} w="100%" mt="xs">
          {tiers.map((tier, i) => {
            const reached = referralsMade >= tier.threshold;
            const isNext = tier === nextTier;
            return (
              <Group
                key={i}
                px="sm"
                py={4}
                justify="space-between"
                wrap="nowrap"
                style={{
                  borderRadius: 8,
                  background: reached
                    ? `${color}18`
                    : isNext
                    ? theme.colors.gray[0]
                    : "transparent",
                  border: isNext ? `1px dashed ${theme.colors.gray[4]}` : "none",
                }}
              >
                <Group gap={6} wrap="nowrap" style={{ flex: 1 }}>
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    color={reached ? "teal" : "gray"}
                    variant={reached ? "filled" : "light"}
                  >
                    {reached ? <IconGift size={12} /> : <IconLock size={12} />}
                  </ThemeIcon>
                  <Text size="xs" fw={isNext ? 600 : 400} c={reached ? "dark" : "dimmed"} truncate="end">
                    {tier.reward}
                  </Text>
                </Group>
                <Badge
                  size="xs"
                  color={reached ? "green" : isNext ? "blue" : "gray"}
                  variant={reached ? "filled" : "light"}
                  style={{ flexShrink: 0 }}
                >
                  {tier.threshold} referidos
                </Badge>
              </Group>
            );
          })}
        </Stack>

        {/* Mensaje de estado */}
        <Box w="100%" mt="xs">
          {!nextTier ? (
            <Group justify="center" gap={8}>
              <FaCheckCircle color={color} size={22} />
              <Text fw={700} size="md" ta="center" style={{ color }}>
                ¡Completaste todos los niveles!
              </Text>
            </Group>
          ) : (
            <Text c="dimmed" size="sm" ta="center">
              Te faltan{" "}
              <Text span fw={700}>
                {Math.max(nextTier.threshold - referralsMade, 0)}
              </Text>{" "}
              referido{nextTier.threshold - referralsMade === 1 ? "" : "s"} para:{" "}
              <Text span fw={800}>
                {nextTier.reward}
              </Text>
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
                      {new Date(entry.earnedAt).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                      })}
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
