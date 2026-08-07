/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import {
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Group,
  Switch,
  Stack,
  Divider,
  Text,
  Title,
  ColorInput,
  SimpleGrid,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { ClassType } from "../../../../services/classService";
import { ImageUploadField, PdfAndVideoFields } from "../../components/MediaUploadFields";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<ClassType, "_id" | "organizationId" | "createdAt">,
  ) => Promise<void>;
  editing?: ClassType | null;
  loading?: boolean;
}

interface FormValues {
  name: string;
  description: string;
  duration: number;
  defaultCapacity: number;
  pricePerPerson: number;
  hidePrice: boolean;
  color: string;
  isActive: boolean;
  isPublic: boolean;
  featured: boolean;
  videoUrl: string;
  groupDiscount: {
    enabled: boolean;
    minPeople: number;
    maxPeople: number | null;
    discountPercent: number;
  };
}

export default function ClassFormModal({
  opened,
  onClose,
  onSubmit,
  editing,
  loading,
}: Props) {
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);
  const [pdfFile, setPdfFile] = useState<File | string | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      name: "",
      description: "",
      duration: 60,
      defaultCapacity: 10,
      pricePerPerson: 0,
      hidePrice: false,
      color: "#4C6EF5",
      isActive: true,
      isPublic: true,
      featured: false,
      videoUrl: "",
      groupDiscount: {
        enabled: false,
        minPeople: 2,
        maxPeople: null as number | null,
        discountPercent: 10,
      },
    },
    validate: {
      name: (v) => (!v.trim() ? "El nombre es requerido" : null),
      duration: (v) => v < 1 ? "La duración debe ser al menos 1 minuto" : null,
      defaultCapacity: (v) => (v < 1 ? "El cupo debe ser al menos 1" : null),
      pricePerPerson: (v) => (v < 0 ? "El precio no puede ser negativo" : null),
      groupDiscount: {
        minPeople: (v, values) =>
          (values as FormValues).groupDiscount.enabled && v < 2 ? "Mínimo 2 personas" : null,
        discountPercent: (v, values) =>
          (values as FormValues).groupDiscount.enabled && (v <= 0 || v > 100)
            ? "El descuento debe estar entre 1 y 100"
            : null,
      },
    },
  });

  useEffect(() => {
    if (editing) {
      form.setValues({
        name: editing.name,
        description: editing.description || "",
        duration: editing.duration,
        defaultCapacity: editing.defaultCapacity,
        pricePerPerson: editing.pricePerPerson,
        hidePrice: editing.hidePrice ?? false,
        color: editing.color || "#4C6EF5",
        isActive: editing.isActive,
        isPublic: editing.isPublic ?? true,
        featured: editing.featured ?? false,
        videoUrl: editing.videoUrl ?? "",
        groupDiscount: {
          enabled: editing.groupDiscount?.enabled ?? false,
          minPeople: editing.groupDiscount?.minPeople ?? 2,
          maxPeople: editing.groupDiscount?.maxPeople ?? null,
          discountPercent: editing.groupDiscount?.discountPercent ?? 10,
        },
      });
      setImageFiles(editing.images || []);
      setPdfFile(editing.pdfUrl ?? null);
    } else {
      form.reset();
      setImageFiles([]);
      setPdfFile(null);
    }
  }, [editing, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    await onSubmit({
      ...values,
      images: imageFiles as unknown as string[],
      pdfUrl: pdfFile as unknown as string | null,
      videoUrl: values.videoUrl?.trim() || null,
    });
    form.reset();
    setImageFiles([]);
    setPdfFile(null);
  };

  const discountEnabled = form.values.groupDiscount.enabled;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Editar clase" : "Nueva clase"}
      centered
      size="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          <TextInput
            label="Nombre de la clase"
            placeholder="Ej: Pilates Básico, Curso de Verano"
            required
            {...form.getInputProps("name")}
          />
          <Textarea
            label="Descripción"
            placeholder="Describe la clase para los clientes"
            autosize
            minRows={2}
            {...form.getInputProps("description")}
          />
          <SimpleGrid cols={2}>
            <NumberInput
              label="Duración (minutos)"
              min={1}
              required
              {...form.getInputProps("duration")}
            />
            <NumberInput
              label="Cupo por defecto"
              description="Personas por sesión"
              min={1}
              required
              {...form.getInputProps("defaultCapacity")}
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <NumberInput
              label="Precio por persona"
              prefix="$"
              thousandSeparator=","
              min={0}
              required
              {...form.getInputProps("pricePerPerson")}
            />
            <ColorInput
              label="Color en agenda"
              format="hex"
              swatches={[
                "#4C6EF5",
                "#7950F2",
                "#E64980",
                "#F03E3E",
                "#2F9E44",
                "#1971C2",
                "#F76707",
              ]}
              {...form.getInputProps("color")}
            />
          </SimpleGrid>

          <Switch
            label="Ocultar precio al cliente"
            description="El precio no será visible en la vista pública (landing, catálogo, detalle ni reserva)"
            {...form.getInputProps("hidePrice", { type: "checkbox" })}
          />

          <Divider label="Descuento grupal" labelPosition="left" />

          <Switch
            label="Activar descuento por reserva grupal"
            description="Aplica un descuento cuando reservan juntos cierto número de personas"
            {...form.getInputProps("groupDiscount.enabled", {
              type: "checkbox",
            })}
          />

          {discountEnabled && (
            <Stack
              gap="sm"
              pl="md"
              style={{ borderLeft: "3px solid var(--mantine-color-blue-4)" }}
            >
              <Text size="xs" c="dimmed">
                El descuento aplica cuando el número de personas está entre el
                mínimo y el máximo (si se define).
              </Text>
              <SimpleGrid cols={3}>
                <NumberInput
                  label="Mínimo de personas"
                  min={2}
                  required
                  {...form.getInputProps("groupDiscount.minPeople")}
                />
                <NumberInput
                  label="Máximo de personas"
                  description="Opcional"
                  min={2}
                  allowDecimal={false}
                  placeholder="Sin límite"
                  value={form.values.groupDiscount.maxPeople ?? ""}
                  onChange={(v) =>
                    form.setFieldValue(
                      "groupDiscount.maxPeople",
                      v === "" ? null : Number(v),
                    )
                  }
                />
                <NumberInput
                  label="Descuento (%)"
                  min={1}
                  max={100}
                  suffix="%"
                  required
                  {...form.getInputProps("groupDiscount.discountPercent")}
                />
              </SimpleGrid>
            </Stack>
          )}

          <Divider label="Imágenes del programa" labelPosition="left" />
          <Title order={6} c="dimmed" fw={500}>
            Se muestran en el catálogo y detalle público de programas
          </Title>
          <ImageUploadField images={imageFiles} onChange={setImageFiles} />

          <Divider label="Material adicional (opcional)" labelPosition="left" />
          <PdfAndVideoFields
            pdfFile={pdfFile}
            onPdfChange={setPdfFile}
            videoUrl={form.values.videoUrl}
            onVideoUrlChange={(v) => form.setFieldValue("videoUrl", v)}
            pdfLabel="PDF (temario, ficha del programa, etc.)"
            videoDescription="Se muestra incrustado en el detalle público del programa"
          />

          <Switch
            label="⭐ Programa destacado"
            description="Se muestra primero en el catálogo de programas y en la landing"
            {...form.getInputProps("featured", { type: "checkbox" })}
          />

          <Switch
            label="🌐 Clase pública"
            description="Si se desactiva, sigue disponible para programar sesiones desde este panel, pero no aparece en la landing ni en el catálogo/reserva de clases para los clientes"
            {...form.getInputProps("isPublic", { type: "checkbox" })}
          />

          <Switch
            label="Clase activa"
            description="Si se desactiva, la clase no se puede usar para programar nuevas sesiones"
            {...form.getInputProps("isActive", { type: "checkbox" })}
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? "Guardar cambios" : "Crear clase"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
