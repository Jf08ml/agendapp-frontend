import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Stack,
  NumberInput,
  Button,
  Group,
  Text,
  Title,
  Select,
  Textarea,
  ActionIcon,
  Divider,
  ThemeIcon,
  Paper,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconShoppingCart, IconTrash, IconPlus } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import {
  Product,
  ProductSale,
  getProducts,
  createSale,
} from "../../../../services/productService";
import {
  Employee,
  getEmployeesByOrganizationId,
} from "../../../../services/employeeService";
import { Client, searchClients } from "../../../../services/clientService";
import { formatCurrency } from "../../../../utils/formatCurrency";

const METHOD_OPTIONS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
];

interface SaleItemRow {
  productId: string | null;
  quantity: number;
  unitPrice: number;
}

export interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se llama tras registrar la venta con éxito (refrescar tablas). */
  onSaleCreated?: (sale: ProductSale) => void;
  /** Productos precargados (opcional). Si no se pasan, el modal los carga. */
  products?: Product[];
}

const emptyRow = (): SaleItemRow => ({
  productId: null,
  quantity: 1,
  unitPrice: 0,
});

const SaleModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  onSaleCreated,
  products: productsProp,
}) => {
  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const currency = organization?.currency || "COP";

  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<SaleItemRow[]>([emptyRow()]);
  const [method, setMethod] = useState<string>("cash");
  const [soldBy, setSoldBy] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientOptions, setClientOptions] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch] = useDebouncedValue(clientSearch, 300);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const products = productsProp ?? loadedProducts;
  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products]
  );

  // Carga de productos (si no vienen precargados) y profesionales al abrir
  useEffect(() => {
    if (!isOpen) return;
    setItems([emptyRow()]);
    setMethod("cash");
    setSoldBy(null);
    setClientId(null);
    setClientSearch("");
    setNote("");

    if (!productsProp) {
      getProducts()
        .then(setLoadedProducts)
        .catch(() => setLoadedProducts([]));
    }
    if (organizationId) {
      getEmployeesByOrganizationId(organizationId)
        .then((data) => setEmployees(data.filter((e) => e.isActive)))
        .catch(() => setEmployees([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Búsqueda de clientes (opcional)
  useEffect(() => {
    if (!isOpen || !organizationId) return;
    if (!debouncedClientSearch.trim()) return;
    searchClients(organizationId, debouncedClientSearch, 20)
      .then(setClientOptions)
      .catch(() => setClientOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedClientSearch, isOpen]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p._id, p));
    return map;
  }, [products]);

  const updateItem = (index: number, patch: Partial<SaleItemRow>) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const handleProductChange = (index: number, productId: string | null) => {
    const product = productId ? productById.get(productId) : undefined;
    updateItem(index, {
      productId,
      unitPrice: product ? product.salePrice : 0,
    });
  };

  const validItems = items.filter(
    (row) => row.productId && row.quantity > 0
  );

  const total = validItems.reduce(
    (sum, row) => sum + row.quantity * row.unitPrice,
    0
  );

  // Comisión estimada client-side (prioridad producto → profesional)
  const computeCommission = (): number => {
    if (!soldBy) return 0;
    const employee = employees.find((e) => e._id === soldBy);
    let commission = 0;
    for (const row of validItems) {
      const product = row.productId
        ? productById.get(row.productId)
        : undefined;
      if (!product) continue;
      const type = product.commissionType ?? employee?.commissionType ?? null;
      const value =
        product.commissionType != null
          ? product.commissionValue ?? 0
          : employee?.commissionValue ?? 0;
      if (!type || !value) continue;
      const subtotal = row.quantity * row.unitPrice;
      commission +=
        type === "percentage" ? subtotal * (value / 100) : row.quantity * value;
    }
    return commission;
  };
  const estimatedCommission = computeCommission();

  const canSave = validItems.length > 0 && total >= 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const sale = await createSale({
        items: validItems.map((row) => ({
          productId: row.productId as string,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
        })),
        method: method as ProductSale["method"],
        soldBy: soldBy || undefined,
        clientId: clientId || undefined,
        note: note.trim() || undefined,
      });
      if (sale) {
        showNotification({
          title: "Venta registrada",
          message: `Total: ${formatCurrency(sale.total ?? total, currency)}`,
          color: "green",
        });
        onSaleCreated?.(sale);
        onClose();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al registrar la venta";
      showNotification({ title: "Error", message, color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const productSelectData = activeProducts.map((p) => ({
    value: p._id,
    label: `${p.name} — ${formatCurrency(p.salePrice, currency)}${
      p.trackStock ? ` (stock: ${p.stockQuantity})` : ""
    }`,
  }));

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" size="lg" radius="md">
            <IconShoppingCart size={20} />
          </ThemeIcon>
          <Title order={4}>Registrar venta</Title>
        </Group>
      }
      size="lg"
      centered
      radius="md"
      overlayProps={{ blur: 2 }}
    >
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Productos
          </Text>
          {items.map((row, idx) => (
            <Group key={idx} gap="xs" align="flex-end" wrap="nowrap">
              <Select
                placeholder="Selecciona un producto"
                data={productSelectData}
                value={row.productId}
                onChange={(v) => handleProductChange(idx, v)}
                searchable
                style={{ flex: 1 }}
                nothingFoundMessage="Sin productos"
              />
              <NumberInput
                placeholder="Cant."
                value={row.quantity}
                onChange={(v) =>
                  updateItem(idx, {
                    quantity: typeof v === "number" ? v : 1,
                  })
                }
                min={1}
                w={80}
              />
              <NumberInput
                placeholder="Precio"
                prefix="$ "
                thousandSeparator="."
                decimalSeparator=","
                value={row.unitPrice}
                onChange={(v) =>
                  updateItem(idx, {
                    unitPrice: typeof v === "number" ? v : 0,
                  })
                }
                min={0}
                w={130}
              />
              {items.length > 1 && (
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={() => setItems((prev) => [...prev, emptyRow()])}
          >
            Agregar producto
          </Button>
        </Stack>

        <Divider />

        <Group grow align="flex-start">
          <Select
            label="Método de pago"
            data={METHOD_OPTIONS}
            value={method}
            onChange={(v) => setMethod(v ?? "cash")}
            allowDeselect={false}
          />
          <Select
            label="Profesional que vendió"
            placeholder="Sin profesional"
            data={employees.map((e) => ({ value: e._id, label: e.names }))}
            value={soldBy}
            onChange={setSoldBy}
            clearable
            searchable
          />
        </Group>

        <Select
          label="Cliente (opcional)"
          placeholder="Busca por nombre o teléfono…"
          data={clientOptions.map((c) => ({
            value: c._id,
            label: `${c.name}${c.phoneNumber ? ` — ${c.phoneNumber}` : ""}`,
          }))}
          value={clientId}
          onChange={setClientId}
          searchValue={clientSearch}
          onSearchChange={setClientSearch}
          searchable
          clearable
          nothingFoundMessage={
            clientSearch.trim() ? "Sin resultados" : "Escribe para buscar"
          }
        />

        <Textarea
          label="Nota"
          placeholder="Observaciones de la venta (opcional)"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          minRows={2}
          autosize
        />

        <Paper withBorder p="sm" radius="md">
          <Group justify="space-between">
            <Text fw={600}>Total</Text>
            <Text fw={800} size="lg">
              {formatCurrency(total, currency)}
            </Text>
          </Group>
          {soldBy && (
            <Group justify="space-between" mt={4}>
              <Text size="sm" c="dimmed">
                Comisión estimada
              </Text>
              <Text size="sm" fw={600} c={estimatedCommission > 0 ? "teal" : "dimmed"}>
                {estimatedCommission > 0
                  ? formatCurrency(estimatedCommission, currency)
                  : "Sin comisión configurada"}
              </Text>
            </Group>
          )}
        </Paper>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!canSave}>
            Registrar venta
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default SaleModal;
