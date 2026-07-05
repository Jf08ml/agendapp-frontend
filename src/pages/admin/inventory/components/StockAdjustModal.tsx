import React, { useEffect, useState } from "react";
import {
  Modal,
  Stack,
  NumberInput,
  Button,
  Group,
  Text,
  Title,
  SegmentedControl,
  Autocomplete,
  ThemeIcon,
  Badge,
} from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";
import { Product } from "../../../../services/productService";

const REASON_SUGGESTIONS = [
  "Recepción de mercancía",
  "Ajuste por conteo",
  "Merma",
  "Devolución",
  "Producto dañado",
];

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjust: (delta: number, reason: string) => Promise<void> | void;
}

const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  onAdjust,
}) => {
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDirection("in");
      setQuantity(1);
      setReason("");
    }
  }, [isOpen, product]);

  if (!product) return null;

  const delta = direction === "out" ? -quantity : quantity;
  const resulting = (product.stockQuantity ?? 0) + delta;
  const insufficient = resulting < 0;
  const canSave = quantity > 0 && reason.trim().length > 0 && !insufficient;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onAdjust(delta, reason.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" size="lg" radius="md">
            <IconAdjustments size={20} />
          </ThemeIcon>
          <Title order={4}>Ajustar stock</Title>
        </Group>
      }
      size="md"
      centered
      radius="md"
      overlayProps={{ blur: 2 }}
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600}>{product.name}</Text>
          <Badge variant="light" size="lg">
            Stock actual: {product.stockQuantity ?? 0}
          </Badge>
        </Group>

        <SegmentedControl
          value={direction}
          onChange={(v) => setDirection(v as "in" | "out")}
          data={[
            { label: "➕ Entrada", value: "in" },
            { label: "➖ Salida", value: "out" },
          ]}
          fullWidth
        />

        <NumberInput
          label="Cantidad"
          value={quantity}
          onChange={(v) => setQuantity(typeof v === "number" ? v : 0)}
          min={1}
          required
          withAsterisk
        />

        <Autocomplete
          label="Motivo"
          placeholder="Ej: Recepción de mercancía"
          data={REASON_SUGGESTIONS}
          value={reason}
          onChange={setReason}
          required
          withAsterisk
        />

        <Text size="sm" c={insufficient ? "red" : "dimmed"}>
          {insufficient
            ? "El ajuste dejaría el stock en negativo."
            : `Stock resultante: ${resulting} unidades`}
        </Text>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!canSave}>
            Aplicar ajuste
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default StockAdjustModal;
