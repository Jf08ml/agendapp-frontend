import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Title,
  Card,
  Group,
  Button,
  Text,
  ActionIcon,
  TextInput,
  Avatar,
  Badge,
  Tooltip,
  Switch,
  Table,
  Skeleton,
  Center,
  Stack,
} from "@mantine/core";
import { useClipboard, useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import {
  IconPlus,
  IconPencil,
  IconAdjustments,
  IconCircleX,
  IconCircleCheck,
  IconSearch,
  IconShoppingCart,
  IconAlertTriangle,
  IconCheck,
  IconLink,
  IconPackage,
} from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../../app/store";
import { fetchOrganizationConfig } from "../../../features/organization/sliceOrganization";
import { updateOrganization } from "../../../services/organizationService";
import { usePermissions } from "../../../hooks/usePermissions";
import { formatCurrency } from "../../../utils/formatCurrency";
import {
  Product,
  getProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  adjustStock,
} from "../../../services/productService";
import ProductModal, { ProductFormData } from "./components/ProductModal";
import StockAdjustModal from "./components/StockAdjustModal";
import SaleModal from "./components/SaleModal";

const isLowStock = (p: Product) =>
  p.trackStock && p.lowStockThreshold > 0 && p.stockQuantity <= p.lowStockThreshold;

const commissionLabel = (p: Product, currency: string): string => {
  if (!p.commissionType) return "Del profesional";
  if (p.commissionType === "percentage") return `${p.commissionValue ?? 0}%`;
  return `${formatCurrency(p.commissionValue ?? 0, currency)} c/u`;
};

const InventoryPage: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const { hasPermission } = usePermissions();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const currency = organization?.currency || "COP";

  const canManage = hasPermission("inventory:manage");
  const canSell = hasPermission("inventory:sell") || canManage;

  const [products, setProducts] = useState<Product[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchTerm, 250);
  const [showInactive, setShowInactive] = useState(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  // ── Tienda pública: flags de la organización ──────────────────────────────
  const dispatch = useAppDispatch();
  const clipboard = useClipboard({ timeout: 1500 });
  const [savingStoreConfig, setSavingStoreConfig] = useState(false);
  const storeEnabled = !!organization?.storeEnabled;
  const storeCodEnabled = organization?.storeCodEnabled !== false;

  const handleStoreConfigChange = async (patch: {
    storeEnabled?: boolean;
    storeCodEnabled?: boolean;
  }) => {
    if (!organization?._id) return;
    setSavingStoreConfig(true);
    try {
      const updated = await updateOrganization(organization._id, patch);
      if (!updated) {
        throw new Error("No se pudo actualizar la configuración de la tienda");
      }
      // Refresco del slice de org en segundo plano — NO provoca loader global
      // (App.tsx solo muestra el loader cuando !organization).
      await dispatch(fetchOrganizationConfig());
      showNotification({
        title: "Tienda actualizada",
        message: "La configuración se guardó correctamente",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar la configuración de la tienda";
      showNotification({ title: "Error", message, color: "red" });
    } finally {
      setSavingStoreConfig(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts({ includeInactive: true });
      setProducts(data);
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "Error al cargar los productos",
        color: "red",
      });
    } finally {
      setInitialLoaded(true);
    }
  };

  const filtered = useMemo(() => {
    let data = [...products];
    if (!showInactive) data = data.filter((p) => p.active);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category?.toLowerCase() ?? "").includes(q) ||
          (p.brand?.toLowerCase() ?? "").includes(q) ||
          (p.sku?.toLowerCase() ?? "").includes(q)
      );
    }
    data.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return data;
  }, [products, debouncedSearch, showInactive]);

  const handleSaveProduct = async (form: ProductFormData) => {
    try {
      if (form._id) {
        // No enviar stockQuantity en edición: los ajustes van por adjustStock
        const { _id, stockQuantity: _stock, ...data } = form;
        void _stock;
        const updated = await updateProduct(_id, data);
        if (updated) {
          setProducts((prev) =>
            prev.map((p) => (p._id === _id ? updated : p))
          );
        }
      } else {
        const { _id, ...data } = form;
        void _id;
        const created = await createProduct(data);
        if (created) setProducts((prev) => [...prev, created]);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      showNotification({
        title: form._id ? "Producto actualizado" : "Producto creado",
        message: "El producto se guardó correctamente",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al guardar el producto";
      showNotification({ title: "Error", message, color: "red" });
    }
  };

  const handleAdjustStock = async (delta: number, reason: string) => {
    if (!adjustingProduct) return;
    try {
      const updated = await adjustStock(adjustingProduct._id, delta, reason);
      if (updated) {
        setProducts((prev) =>
          prev.map((p) => (p._id === updated._id ? updated : p))
        );
      }
      setAdjustingProduct(null);
      showNotification({
        title: "Stock ajustado",
        message: "El ajuste se aplicó correctamente",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al ajustar el stock";
      showNotification({ title: "Error", message, color: "red" });
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      if (product.active) {
        await deactivateProduct(product._id);
        setProducts((prev) =>
          prev.map((p) =>
            p._id === product._id ? { ...p, active: false } : p
          )
        );
        showNotification({
          title: "Producto desactivado",
          message: "Ya no aparecerá en las ventas",
          color: "green",
        });
      } else {
        const updated = await updateProduct(product._id, { active: true });
        if (updated) {
          setProducts((prev) =>
            prev.map((p) => (p._id === product._id ? updated : p))
          );
        }
        showNotification({
          title: "Producto activado",
          message: "El producto vuelve a estar disponible",
          color: "green",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al cambiar el estado del producto";
      showNotification({ title: "Error", message, color: "red" });
    }
  };

  const confirmDeactivate = (product: Product) => {
    if (!product.active) {
      handleToggleActive(product);
      return;
    }
    modals.openConfirmModal({
      title: "Desactivar producto",
      children: (
        <Text size="sm">
          ¿Deseas desactivar "{product.name}"? No se eliminará el historial de
          ventas y podrás reactivarlo cuando quieras.
        </Text>
      ),
      labels: { confirm: "Desactivar", cancel: "Cancelar" },
      confirmProps: { color: "orange" },
      onConfirm: () => handleToggleActive(product),
    });
  };

  const rows = filtered.map((product) => {
    const low = isLowStock(product);
    return (
      <Table.Tr key={product._id} style={{ opacity: product.active ? 1 : 0.6 }}>
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            <Avatar
              src={product.imageUrl || undefined}
              alt={product.name}
              size={38}
              radius="sm"
              color="gray"
            >
              <IconPackage size={20} />
            </Avatar>
            <div>
              <Group gap={6} wrap="nowrap">
                <Text fw={600} size="sm">
                  {product.name}
                </Text>
                {!product.active && (
                  <Badge color="gray" size="xs" variant="light">
                    Inactivo
                  </Badge>
                )}
              </Group>
              {product.brand && (
                <Text size="xs" c="dimmed">
                  {product.brand}
                </Text>
              )}
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{product.category || "—"}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={600}>
            {formatCurrency(product.salePrice, currency)}
          </Text>
        </Table.Td>
        <Table.Td>
          {product.trackStock ? (
            <Badge
              color={low ? "red" : "teal"}
              variant={low ? "filled" : "light"}
              leftSection={low ? <IconAlertTriangle size={12} /> : undefined}
            >
              {product.stockQuantity}
            </Badge>
          ) : (
            <Text size="sm" c="dimmed">
              Sin control
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="sm">{commissionLabel(product, currency)}</Text>
        </Table.Td>
        {canManage && (
          <Table.Td>
            <Group gap={6} wrap="nowrap">
              <Tooltip label="Editar" withArrow>
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => {
                    setEditingProduct(product);
                    setIsProductModalOpen(true);
                  }}
                >
                  <IconPencil size={16} />
                </ActionIcon>
              </Tooltip>
              {product.trackStock && (
                <Tooltip label="Ajustar stock" withArrow>
                  <ActionIcon
                    variant="light"
                    color="grape"
                    onClick={() => setAdjustingProduct(product)}
                  >
                    <IconAdjustments size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              <Tooltip
                label={product.active ? "Desactivar" : "Activar"}
                withArrow
              >
                <ActionIcon
                  variant="light"
                  color={product.active ? "orange" : "green"}
                  onClick={() => confirmDeactivate(product)}
                >
                  {product.active ? (
                    <IconCircleX size={16} />
                  ) : (
                    <IconCircleCheck size={16} />
                  )}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Table.Td>
        )}
      </Table.Tr>
    );
  });

  return (
    <Box>
      <Card withBorder radius="md" p="md" mb="md" shadow="sm">
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Title order={isMobile ? 3 : 2}>Inventario</Title>
            <Group gap="xs">
              {canSell && (
                <Button
                  leftSection={<IconShoppingCart size={18} />}
                  variant="light"
                  color="teal"
                  onClick={() => setIsSaleModalOpen(true)}
                  size={isMobile ? "sm" : "md"}
                >
                  {isMobile ? "Venta" : "Registrar venta"}
                </Button>
              )}
              {canManage && (
                <Button
                  leftSection={<IconPlus size={18} />}
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                  size={isMobile ? "sm" : "md"}
                >
                  {isMobile ? "Nuevo" : "Nuevo producto"}
                </Button>
              )}
            </Group>
          </Group>

          <Group wrap="wrap" gap="sm" align="center">
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Buscar por nombre, categoría, marca o SKU…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              style={{
                flex: isMobile ? "1 1 100%" : "1 1 280px",
                minWidth: isMobile ? "100%" : 240,
              }}
            />
            <Switch
              label="Ver inactivos"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.currentTarget.checked)}
            />
          </Group>

          {canManage && (
            <Group wrap="wrap" gap="md" align="center">
              <Switch
                label="Tienda pública"
                checked={storeEnabled}
                disabled={savingStoreConfig}
                onChange={(e) =>
                  handleStoreConfigChange({
                    storeEnabled: e.currentTarget.checked,
                  })
                }
              />
              {storeEnabled && (
                <Switch
                  label="Aceptar pago contra entrega"
                  checked={storeCodEnabled}
                  disabled={savingStoreConfig}
                  onChange={(e) =>
                    handleStoreConfigChange({
                      storeCodEnabled: e.currentTarget.checked,
                    })
                  }
                />
              )}
              {storeEnabled && (
                <Button
                  variant="light"
                  size="xs"
                  color={clipboard.copied ? "teal" : undefined}
                  leftSection={
                    clipboard.copied ? (
                      <IconCheck size={14} />
                    ) : (
                      <IconLink size={14} />
                    )
                  }
                  onClick={() =>
                    clipboard.copy(`${window.location.origin}/tienda`)
                  }
                >
                  {clipboard.copied ? "Link copiado" : "Copiar link de la tienda"}
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Card>

      {!initialLoaded ? (
        <Card withBorder radius="md" p="md">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={36} mb="sm" />
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Center mih={200}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">
              {products.length === 0
                ? "Aún no tienes productos. Crea el primero para empezar a vender."
                : "No hay productos para los filtros aplicados."}
            </Text>
            {canManage && products.length === 0 && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
              >
                Nuevo producto
              </Button>
            )}
          </Stack>
        </Center>
      ) : (
        <Card withBorder radius="md" p={0}>
          <Table.ScrollContainer minWidth={720}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Precio venta</Table.Th>
                  <Table.Th>Stock</Table.Th>
                  <Table.Th>Comisión</Table.Th>
                  {canManage && <Table.Th>Acciones</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      <StockAdjustModal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
        onAdjust={handleAdjustStock}
      />

      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSaleCreated={loadProducts}
        products={products}
      />
    </Box>
  );
};

export default InventoryPage;
