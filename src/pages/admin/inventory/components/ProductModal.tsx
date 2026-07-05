import React, { useEffect, useState } from "react";
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Group,
  Text,
  Switch,
  Title,
  Divider,
  Select,
  SimpleGrid,
  ThemeIcon,
  Box,
  Image,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { showNotification } from "@mantine/notifications";
import { IconPackage, IconPhotoPlus, IconCircleXFilled } from "@tabler/icons-react";
import { Product } from "../../../../services/productService";
import { uploadImage } from "../../../../services/imageService";

export interface ProductFormData {
  _id?: string;
  name: string;
  category: string;
  brand: string;
  sku: string;
  barcode: string;
  description: string;
  imageUrl: string;
  costPrice: number;
  salePrice: number;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  commissionType: "percentage" | "fixed" | null;
  commissionValue: number;
  active: boolean;
  visibleInStore: boolean;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (data: ProductFormData) => Promise<void> | void;
}

const emptyForm = (): ProductFormData => ({
  name: "",
  category: "",
  brand: "",
  sku: "",
  barcode: "",
  description: "",
  imageUrl: "",
  costPrice: 0,
  salePrice: 0,
  trackStock: true,
  stockQuantity: 0,
  lowStockThreshold: 0,
  commissionType: null,
  commissionValue: 0,
  active: true,
  visibleInStore: false,
});

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
}) => {
  const [form, setForm] = useState<ProductFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isEditing = !!product?._id;

  useEffect(() => {
    if (product) {
      setForm({
        _id: product._id,
        name: product.name,
        category: product.category ?? "",
        brand: product.brand ?? "",
        sku: product.sku ?? "",
        barcode: product.barcode ?? "",
        description: product.description ?? "",
        imageUrl: product.imageUrl ?? "",
        costPrice: product.costPrice ?? 0,
        salePrice: product.salePrice ?? 0,
        trackStock: product.trackStock ?? true,
        stockQuantity: product.stockQuantity ?? 0,
        lowStockThreshold: product.lowStockThreshold ?? 0,
        commissionType: product.commissionType ?? null,
        commissionValue: product.commissionValue ?? 0,
        active: product.active ?? true,
        visibleInStore: product.visibleInStore ?? false,
      });
    } else {
      setForm(emptyForm());
    }
  }, [product, isOpen]);

  const canSave =
    form.name.trim().length > 1 && (form.salePrice ?? 0) > 0;

  const handleSave = async () => {
    if (!canSave || isUploading) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  // Máximo ~5MB: el body limit del backend es 5MB (app.js)
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  // Misma mecánica que ModalCreateEditEmployee: sube al soltar/seleccionar
  // el archivo (uploadImage → ImageKit) y guarda la URL en el estado del form.
  const handleDrop = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      showNotification({
        title: "Imagen muy pesada",
        message: `La imagen supera el límite de 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB). Usa una más liviana.`,
        color: "red",
      });
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        setForm((prev) => ({ ...prev, imageUrl: url }));
      }
    } catch (error) {
      console.error("Error al cargar la imagen:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => setForm((prev) => ({ ...prev, imageUrl: "" }));

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" size="lg" radius="md">
            <IconPackage size={20} />
          </ThemeIcon>
          <Title order={3}>
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </Title>
        </Group>
      }
      size="lg"
      centered
      radius="md"
      overlayProps={{ blur: 2 }}
    >
      <Stack gap="md">
        <TextInput
          label="Nombre del producto"
          placeholder="Ej: Shampoo reparador 500ml"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          required
          withAsterisk
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <NumberInput
            label="Precio de venta"
            prefix="$ "
            thousandSeparator="."
            decimalSeparator=","
            value={form.salePrice}
            onChange={(v) =>
              setForm({ ...form, salePrice: typeof v === "number" ? v : 0 })
            }
            min={1}
            required
            withAsterisk
          />
          <NumberInput
            label="Precio de costo"
            description="Costo interno (para calcular margen)"
            prefix="$ "
            thousandSeparator="."
            decimalSeparator=","
            value={form.costPrice}
            onChange={(v) =>
              setForm({ ...form, costPrice: typeof v === "number" ? v : 0 })
            }
            min={0}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Categoría"
            placeholder="Ej: Cuidado capilar"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.currentTarget.value })
            }
          />
          <TextInput
            label="Marca"
            placeholder="Ej: L'Oréal"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.currentTarget.value })}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="SKU"
            placeholder="Código interno (opcional)"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.currentTarget.value })}
          />
          <TextInput
            label="Código de barras"
            placeholder="Opcional"
            value={form.barcode}
            onChange={(e) =>
              setForm({ ...form, barcode: e.currentTarget.value })
            }
          />
        </SimpleGrid>

        <Textarea
          label="Descripción"
          placeholder="Detalles del producto..."
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.currentTarget.value })
          }
          minRows={2}
          autosize
        />

        <Box>
          <Text size="sm" fw={500} mb="xs">
            Imagen del producto
          </Text>
          <Dropzone
            onDrop={handleDrop}
            accept={IMAGE_MIME_TYPE}
            multiple={false}
            loading={isUploading}
            style={{
              border: "2px dashed var(--mantine-color-gray-4)",
              borderRadius: 8,
              cursor: isUploading ? "not-allowed" : "pointer",
              minHeight: form.imageUrl ? "auto" : 120,
            }}
          >
            <Group justify="center" p="md">
              {isUploading ? (
                <Stack align="center" gap="xs">
                  <Loader size="md" />
                  <Text size="sm" c="dimmed">
                    Subiendo imagen...
                  </Text>
                </Stack>
              ) : form.imageUrl ? (
                <Box pos="relative">
                  <Image
                    src={form.imageUrl}
                    alt="Imagen del producto"
                    w={120}
                    h={120}
                    fit="cover"
                    radius="md"
                  />
                  <ActionIcon
                    style={{ position: "absolute", top: -8, right: -8 }}
                    variant="filled"
                    radius="xl"
                    size="sm"
                    color="red"
                    aria-label="Quitar imagen"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                  >
                    <IconCircleXFilled size={16} />
                  </ActionIcon>
                </Box>
              ) : (
                <Stack align="center" gap="xs">
                  <IconPhotoPlus size={40} color="var(--mantine-color-blue-6)" />
                  <Text size="sm" ta="center" c="dimmed">
                    Arrastra una imagen o haz clic (máx. 5MB)
                  </Text>
                </Stack>
              )}
            </Group>
          </Dropzone>
        </Box>

        <Divider />

        <Switch
          label="Mostrar en tienda pública"
          description="El producto aparecerá en la página /tienda para que tus clientes lo compren en línea"
          checked={form.visibleInStore}
          onChange={(e) =>
            setForm({ ...form, visibleInStore: e.currentTarget.checked })
          }
        />

        <Switch
          label="Controlar stock"
          description="Descuenta unidades en cada venta y alerta cuando el stock esté bajo"
          checked={form.trackStock}
          onChange={(e) =>
            setForm({ ...form, trackStock: e.currentTarget.checked })
          }
        />

        {form.trackStock && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {isEditing ? (
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  Stock actual
                </Text>
                <Text size="lg" fw={700}>
                  {product?.stockQuantity ?? 0} unidades
                </Text>
                <Text size="xs" c="dimmed">
                  Usa la acción "Ajustar stock" para modificarlo
                </Text>
              </Stack>
            ) : (
              <NumberInput
                label="Stock inicial"
                value={form.stockQuantity}
                onChange={(v) =>
                  setForm({
                    ...form,
                    stockQuantity: typeof v === "number" ? v : 0,
                  })
                }
                min={0}
              />
            )}
            <NumberInput
              label="Umbral de alerta"
              description="Te avisamos cuando el stock llegue a este número (0 = sin alerta)"
              value={form.lowStockThreshold}
              onChange={(v) =>
                setForm({
                  ...form,
                  lowStockThreshold: typeof v === "number" ? v : 0,
                })
              }
              min={0}
            />
          </SimpleGrid>
        )}

        <Divider />

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Comisión por venta
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Tipo de comisión"
              description="Se paga al profesional que registra la venta"
              data={[
                { value: "employee", label: "Usar comisión del profesional" },
                { value: "percentage", label: "Porcentaje (%)" },
                { value: "fixed", label: "Valor fijo por unidad" },
              ]}
              value={form.commissionType ?? "employee"}
              onChange={(v) =>
                setForm({
                  ...form,
                  commissionType:
                    v === "percentage" || v === "fixed" ? v : null,
                })
              }
              allowDeselect={false}
            />
            {form.commissionType && (
              <NumberInput
                label={
                  form.commissionType === "percentage"
                    ? "Porcentaje (%)"
                    : "Valor fijo por unidad"
                }
                prefix={form.commissionType === "fixed" ? "$ " : undefined}
                suffix={form.commissionType === "percentage" ? " %" : undefined}
                thousandSeparator={
                  form.commissionType === "fixed" ? "." : undefined
                }
                decimalSeparator=","
                value={form.commissionValue}
                onChange={(v) =>
                  setForm({
                    ...form,
                    commissionValue: typeof v === "number" ? v : 0,
                  })
                }
                min={0}
                max={form.commissionType === "percentage" ? 100 : undefined}
              />
            )}
          </SimpleGrid>
        </Stack>

        <Divider />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {!canSave && "Completa el nombre y el precio de venta (*)"}
          </Text>
          <Group>
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!canSave || isUploading}
            >
              {isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ProductModal;
