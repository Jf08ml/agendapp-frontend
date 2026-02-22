import { Alert, Divider, NumberInput, SimpleGrid, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconStar, IconUsers, IconBulb, IconScissors } from "@tabler/icons-react";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function FidelityTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const programEnabled = form.values.showLoyaltyProgram;
  const referredCount = form.values.referredCount ?? 0;
  const referredReward = form.values.referredReward ?? "";
  const serviceCount = form.values.serviceCount ?? 0;
  const serviceReward = form.values.serviceReward ?? "";

  return (
    <SectionCard
      title="Programa de fidelidad"
      description="Premia a tus clientes por referir nuevos clientes y por acumular servicios."
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
              Activa el programa para configurar las recompensas por referidos y servicios.
            </Text>
          </Alert>
        )}

        {programEnabled && (
          <>
            <Divider />

            {/* Recompensa por referidos */}
            <Stack gap="xs">
              <Text fw={500} size="sm" c="dimmed">
                <IconUsers size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Recompensa por referidos
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <NumberInput
                  label="Número de referidos necesarios"
                  description="¿Cuántos amigos debe referir para ganar el premio?"
                  placeholder="5"
                  min={0}
                  {...form.getInputProps("referredCount")}
                  disabled={!isEditing}
                />
                <TextInput
                  label="Premio por referidos"
                  description="Describe qué recibe el cliente (ej. descuento, servicio gratis)"
                  placeholder="ej. 20% de descuento"
                  {...form.getInputProps("referredReward")}
                  disabled={!isEditing}
                />
              </SimpleGrid>
              {referredCount > 0 && referredReward && (
                <Alert icon={<IconBulb size={14} />} color="yellow" variant="light">
                  <Text size="xs">
                    Al referir <strong>{referredCount} {referredCount === 1 ? "persona" : "personas"}</strong>, el cliente recibe: <strong>{referredReward}</strong>
                  </Text>
                </Alert>
              )}
            </Stack>

            <Divider />

            {/* Recompensa por servicios */}
            <Stack gap="xs">
              <Text fw={500} size="sm" c="dimmed">
                <IconScissors size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Recompensa por servicios acumulados
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <NumberInput
                  label="Número de servicios necesarios"
                  description="¿Cuántas citas debe completar para ganar el premio?"
                  placeholder="10"
                  min={0}
                  {...form.getInputProps("serviceCount")}
                  disabled={!isEditing}
                />
                <TextInput
                  label="Premio por servicios"
                  description="Describe qué recibe el cliente al alcanzar la meta"
                  placeholder="ej. 1 servicio gratis"
                  {...form.getInputProps("serviceReward")}
                  disabled={!isEditing}
                />
              </SimpleGrid>
              {serviceCount > 0 && serviceReward && (
                <Alert icon={<IconBulb size={14} />} color="yellow" variant="light">
                  <Text size="xs">
                    Al completar <strong>{serviceCount} {serviceCount === 1 ? "servicio" : "servicios"}</strong>, el cliente recibe: <strong>{serviceReward}</strong>
                  </Text>
                </Alert>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
