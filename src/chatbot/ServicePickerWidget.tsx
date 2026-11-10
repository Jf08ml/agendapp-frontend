import { useMemo, useState } from "react";
import {
  Paper, Stack, Group, Checkbox, NumberInput, TextInput, Button, Text, ActionIcon,
} from "@mantine/core";
import { IconPlus, IconTrash, IconCheck } from "@tabler/icons-react";
import type { ServiceSuggestion } from "./chatbotService";

/**
 * Lista de servicios sugeridos del rubro para el onboarding con IA: marcar y
 * poner precio en vez de teclear el catálogo (el 72% de los que abandonaban el
 * onboarding se iba tras el primer mensaje, que pedía escribir nombre, duración
 * y precio). Al enviar, arma un mensaje de texto normal ("Estos son mis
 * servicios: …") y el asistente los crea con bulk_create_services — mismo
 * camino, guards y registro de acciones que si los hubiera escrito.
 */

interface Row {
  key: string;
  name: string;
  duration: number | "";
  price: number | "";
  checked: boolean;
  custom: boolean;
  typicalPrice?: number;
}

interface Props {
  suggestions: ServiceSuggestion[];
  currency: string;
  color: string;
  disabled?: boolean;
  onSubmit: (text: string) => void;
}

const fmtPrice = (n: number) =>
  `$${n.toLocaleString("es-CO", { maximumFractionDigits: 2 })}`;

export default function ServicePickerWidget({ suggestions, currency, color, disabled, onSubmit }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    suggestions.map((s, i) => ({
      key: `s${i}`,
      name: s.name,
      duration: s.duration,
      price: "",
      checked: false,
      custom: false,
      typicalPrice: s.typicalPrice,
    }))
  );
  const [sent, setSent] = useState(false);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addCustom = () =>
    setRows((prev) => [
      ...prev,
      { key: `c${Date.now()}`, name: "", duration: 60, price: "", checked: true, custom: true },
    ]);

  const selected = rows.filter((r) => r.checked && r.name.trim());
  const missing = selected.filter((r) => !(Number(r.duration) > 0) || r.price === "" || Number(r.price) < 0);
  const canSubmit = selected.length > 0 && missing.length === 0 && !disabled && !sent;

  const thousandSeparator = useMemo(
    () => (["USD", "EUR"].includes(currency.toUpperCase()) ? "," : "."),
    [currency]
  );
  const decimalSeparator = thousandSeparator === "." ? "," : ".";

  const handleSubmit = () => {
    if (!canSubmit) return;
    const lines = selected.map(
      (r) => `- ${r.name.trim()} — ${Number(r.duration)} min — ${fmtPrice(Number(r.price))}`
    );
    setSent(true);
    onSubmit(`Estos son mis servicios:\n${lines.join("\n")}`);
  };

  return (
    <Paper withBorder radius="lg" p="md" shadow="xs" bg="white">
      <Stack gap="xs">
        <Text size="sm" fw={600}>Marca los servicios que ofreces y ponles tu precio</Text>
        {rows.map((r) => (
          <Paper
            key={r.key}
            withBorder
            radius="md"
            p="xs"
            style={{ borderColor: r.checked ? color : undefined }}
          >
            <Group gap="xs" wrap="nowrap" align="center">
              <Checkbox
                checked={r.checked}
                color={color}
                disabled={sent}
                onChange={(e) => update(r.key, { checked: e.currentTarget.checked })}
                aria-label={r.name || "Servicio"}
              />
              {r.custom ? (
                <TextInput
                  size="xs"
                  placeholder="Nombre del servicio"
                  value={r.name}
                  disabled={sent}
                  onChange={(e) => update(r.key, { name: e.currentTarget.value })}
                  style={{ flex: 1 }}
                />
              ) : (
                <Text
                  size="sm"
                  style={{ flex: 1, cursor: sent ? "default" : "pointer" }}
                  onClick={() => !sent && update(r.key, { checked: !r.checked })}
                >
                  {r.name}
                </Text>
              )}
              {r.custom && !sent && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                  aria-label="Quitar"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </Group>
            {r.checked && (
              <Group gap="xs" mt={6} pl={30} wrap="nowrap">
                <NumberInput
                  size="xs"
                  label="Duración"
                  suffix=" min"
                  min={5}
                  max={720}
                  step={5}
                  allowDecimal={false}
                  hideControls
                  value={r.duration}
                  disabled={sent}
                  onChange={(v) => update(r.key, { duration: v === "" ? "" : Number(v) })}
                  w={100}
                />
                <NumberInput
                  size="xs"
                  label="Precio"
                  prefix="$ "
                  hideControls
                  min={0}
                  thousandSeparator={thousandSeparator}
                  decimalSeparator={decimalSeparator}
                  placeholder={r.typicalPrice ? `Ej: ${fmtPrice(r.typicalPrice)}` : "Precio"}
                  value={r.price}
                  disabled={sent}
                  onChange={(v) => update(r.key, { price: v === "" ? "" : Number(v) })}
                  style={{ flex: 1 }}
                />
              </Group>
            )}
          </Paper>
        ))}

        {!sent && (
          <Button
            variant="subtle"
            size="xs"
            color={color}
            leftSection={<IconPlus size={14} />}
            onClick={addCustom}
            style={{ alignSelf: "flex-start" }}
          >
            Agregar otro servicio
          </Button>
        )}

        {selected.length > 0 && missing.length > 0 && !sent && (
          <Text size="xs" c="dimmed">Ponle precio a cada servicio marcado (0 si es gratis).</Text>
        )}

        <Button
          color={color}
          disabled={!canSubmit}
          onClick={handleSubmit}
          leftSection={sent ? <IconCheck size={16} /> : undefined}
        >
          {sent
            ? "Enviado"
            : selected.length > 0
            ? `Agregar ${selected.length} ${selected.length === 1 ? "servicio" : "servicios"}`
            : "Marca al menos un servicio"}
        </Button>
      </Stack>
    </Paper>
  );
}
