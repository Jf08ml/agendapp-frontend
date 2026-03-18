import {
  Alert,
  ActionIcon,
  Button,
  Divider,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Paper,
  Badge,
} from "@mantine/core";
import {
  IconStar,
  IconUsers,
  IconBulb,
  IconScissors,
  IconTrash,
  IconPlus,
  IconTrophy,
} from "@tabler/icons-react";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

type Tier = { threshold: number; reward: string };

function TierEditor({
  tiers,
  onChange,
  disabled,
  addLabel,
  thresholdLabel,
  rewardPlaceholder,
}: {
  tiers: Tier[];
  onChange: (tiers: Tier[]) => void;
  disabled: boolean;
  addLabel: string;
  thresholdLabel: string;
  rewardPlaceholder: string;
}) {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);

  const addTier = () => {
    const maxThreshold = sorted.length > 0 ? sorted[sorted.length - 1].threshold : 0;
    onChange([...tiers, { threshold: maxThreshold + 1, reward: "" }]);
  };

  const updateTier = (index: number, field: keyof Tier, value: string | number) => {
    const updated = tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    onChange(updated);
  };

  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  return (
    <Stack gap="xs">
      {sorted.length === 0 && (
        <Text size="sm" c="dimmed" ta="center" py="xs">
          Sin niveles configurados. Agrega al menos uno para activar el programa.
        </Text>
      )}

      {sorted.map((tier, i) => {
        const originalIndex = tiers.indexOf(tier);
        const isMax = i === sorted.length - 1;
        return (
          <Paper key={i} withBorder p="xs" radius="md">
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <Badge
                size="lg"
                circle
                variant="light"
                color={isMax ? "yellow" : "blue"}
                style={{ flexShrink: 0, alignSelf: "center" }}
              >
                {i + 1}
              </Badge>
              <NumberInput
                label={thresholdLabel}
                placeholder="5"
                min={1}
                value={tier.threshold}
                onChange={(v) => updateTier(originalIndex, "threshold", Number(v) || 1)}
                disabled={disabled}
                style={{ width: 110, flexShrink: 0 }}
              />
              <TextInput
                label="Premio"
                placeholder={rewardPlaceholder}
                value={tier.reward}
                onChange={(e) => updateTier(originalIndex, "reward", e.currentTarget.value)}
                disabled={disabled}
                style={{ flex: 1 }}
              />
              {isMax && sorted.length > 1 && (
                <Badge size="xs" color="yellow" variant="dot" style={{ flexShrink: 0, alignSelf: "center" }}>
                  reinicia ciclo
                </Badge>
              )}
              {!disabled && (
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => removeTier(originalIndex)}
                  style={{ flexShrink: 0, alignSelf: "center" }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </Group>
          </Paper>
        );
      })}

      {!disabled && (
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addTier}
          w="fit-content"
        >
          {addLabel}
        </Button>
      )}
    </Stack>
  );
}

export default function FidelityTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const programEnabled = form.values.showLoyaltyProgram;
  const serviceTiers: Tier[] = form.values.serviceTiers ?? [];
  const referralTiers: Tier[] = form.values.referralTiers ?? [];

  const sortedService = [...serviceTiers].sort((a, b) => a.threshold - b.threshold);
  const sortedReferral = [...referralTiers].sort((a, b) => a.threshold - b.threshold);

  return (
    <SectionCard
      title="Programa de fidelidad"
      description="Premia a tus clientes por referir nuevos clientes y por acumular servicios. Puedes configurar uno o varios niveles de recompensa."
      icon={<IconStar size={16} />}
      iconColor="yellow"
    >
      <Stack gap="md">
        <Switch
          label="Mostrar programa de fidelidad"
          description="Los clientes podrán ver sus puntos y recompensas desde su perfil"
          {...form.getInputProps("showLoyaltyProgram", { type: "checkbox" })}
          disabled={!isEditing}
        />

        {!programEnabled && (
          <Alert icon={<IconBulb size={14} />} color="gray" variant="light">
            <Text size="sm">
              Activa el programa para configurar los niveles de recompensa por referidos y servicios.
            </Text>
          </Alert>
        )}

        {programEnabled && (
          <>
            <Divider />

            {/* Niveles por referidos */}
            <Stack gap="xs">
              <Group gap={6}>
                <IconUsers size={14} color="var(--mantine-color-dimmed)" />
                <Text fw={500} size="sm" c="dimmed">
                  Niveles por referidos
                </Text>
              </Group>

              <TierEditor
                tiers={referralTiers}
                onChange={(tiers) => form.setFieldValue("referralTiers", tiers)}
                disabled={!isEditing}
                addLabel="Agregar nivel de referido"
                thresholdLabel="Referidos"
                rewardPlaceholder="ej. Descuento 20%"
              />

              {sortedReferral.length > 0 && sortedReferral.every((t) => t.reward) && (
                <Alert icon={<IconTrophy size={14} />} color="yellow" variant="light">
                  <Stack gap={2}>
                    {sortedReferral.map((t, i) => (
                      <Text key={i} size="xs">
                        Al referir <strong>{t.threshold} {t.threshold === 1 ? "persona" : "personas"}</strong>:{" "}
                        <strong>{t.reward}</strong>
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              )}
            </Stack>

            <Divider />

            {/* Niveles por servicios */}
            <Stack gap="xs">
              <Group gap={6}>
                <IconScissors size={14} color="var(--mantine-color-dimmed)" />
                <Text fw={500} size="sm" c="dimmed">
                  Niveles por servicios acumulados
                </Text>
              </Group>

              <TierEditor
                tiers={serviceTiers}
                onChange={(tiers) => form.setFieldValue("serviceTiers", tiers)}
                disabled={!isEditing}
                addLabel="Agregar nivel de servicio"
                thresholdLabel="Servicios"
                rewardPlaceholder="ej. 1 servicio gratis"
              />

              {sortedService.length > 0 && sortedService.every((t) => t.reward) && (
                <Alert icon={<IconTrophy size={14} />} color="blue" variant="light">
                  <Stack gap={2}>
                    {sortedService.map((t, i) => (
                      <Text key={i} size="xs">
                        Al completar <strong>{t.threshold} {t.threshold === 1 ? "servicio" : "servicios"}</strong>:{" "}
                        <strong>{t.reward}</strong>
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
