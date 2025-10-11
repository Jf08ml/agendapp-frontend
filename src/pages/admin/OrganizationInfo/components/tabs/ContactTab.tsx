import { SimpleGrid, TextInput } from "@mantine/core";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function ContactTab({
  form,
  isEditing,
  domains,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
  domains: string[];
}) {
  return (
    <SectionCard
      title="Nombre y contacto"
      description="Estos datos se usan en tu encabezado, recibos y comunicaciones."
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Nombre"
          {...form.getInputProps("name")}
          disabled={!isEditing}
        />
        <TextInput
          label="Correo electrónico"
          {...form.getInputProps("email")}
          disabled={!isEditing}
        />
        <TextInput
          label="Teléfono"
          {...form.getInputProps("phoneNumber")}
          disabled={!isEditing}
        />
        <TextInput
          label="Dominios"
          value={(domains || []).join(", ")}
          disabled
        />
      </SimpleGrid>
    </SectionCard>
  );
}
