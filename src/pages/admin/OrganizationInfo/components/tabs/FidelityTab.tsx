import { NumberInput, SimpleGrid, TextInput } from "@mantine/core";
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
  return (
    <SectionCard
      title="Programa de fidelidad"
      description="Configura metas y recompensas para referidos y servicios."
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <NumberInput
          label="N.º de referidos"
          {...form.getInputProps("referredCount")}
          disabled={!isEditing}
          min={0}
        />
        <TextInput
          label="Premio por referidos"
          {...form.getInputProps("referredReward")}
          disabled={!isEditing}
        />
        <NumberInput
          label="N.º de servicios"
          {...form.getInputProps("serviceCount")}
          disabled={!isEditing}
          min={0}
        />
        <TextInput
          label="Premio por servicios"
          {...form.getInputProps("serviceReward")}
          disabled={!isEditing}
        />
      </SimpleGrid>
    </SectionCard>
  );
}
