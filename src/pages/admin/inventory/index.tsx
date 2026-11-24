// Tienda e inventario › Productos (rediseño, InventarioPanel). Encabezado con
// una sola acción filled («Nuevo producto»), ajustes de la tienda pública en
// panel lateral, tabla con foto, marca y SKU, stock con badge «Bajo», comisión
// en texto claro y publicación en palabras. En móvil, lista y «Registrar venta»
// flotante.
import React, { useEffect, useMemo, useState } from "react";
import { ActionIcon, Avatar, Button, Menu, Switch, Text } from "@mantine/core";
import { useClipboard, useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import {
  IconAdjustments,
  IconAlertTriangle,
  IconCheck,
  IconDots,
  IconLink,
  IconPackage,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShoppingCart,
} from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
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
import StoreSettingsDrawer from "./components/StoreSettingsDrawer";
import StoreTabs from "../../../components/store/StoreTabs";
import { isLowStock, lowStockSummary, productCommissionText, publicationState } from "./storeView";
import StateBadge from "./components/StoreStateBadge";

const InventoryPage: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const { hasPermission } = usePermissions();
  const organization = useSelector((state: RootState) => state.organization.organization);
  const currency = organization?.currency || "COP";
  const money = (n: number) => formatCurrency(n, currency);

  const canManage = hasPermission("inventory:manage");
  const canSell = hasPermission("inventory:sell") || canManage;

  const [products, setProducts] = useState<Product[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchTerm, 250);
  const [showInactive, setShowInactive] = useState(false);
  // «Ver solo esos» del aviso de stock bajo
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [storeSettingsOpen, setStoreSettingsOpen] = useState(false);

  const clipboard = useClipboard({ timeout: 1500 });
  const storeEnabled = !!organization?.storeEnabled;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadError(false);
    try {
      const data = await getProducts({ includeInactive: true });
      setProducts(data);
    } catch (error) {
      console.error(error);
      setLoadError(true);
    } finally {
      setInitialLoaded(true);
    }
  };

  const filtered = useMemo(() => {
    let data = [...products];
    if (!showInactive) data = data.filter((p) => p.active);
    if (onlyLowStock) data = data.filter((p) => p.active && isLowStock(p));
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
  }, [products, debouncedSearch, showInactive, onlyLowStock]);
  const lowStock = useMemo(() => lowStockSummary(products), [products]);

  const handleSaveProduct = async (form: ProductFormData) => {
    try {
      if (form._id) {
        // No enviar stockQuantity en edición: los ajustes van por adjustStock.
        // `images` llega como (File | string)[] a nivel de tipos, pero ProductModal
        // ya subió los File pendientes antes de llamar onSave — siempre son string[] acá.
        const { _id, stockQuantity: _stock, ...data } = form;
        void _stock;
        const updated = await updateProduct(_id, data as unknown as Partial<Product>);
        if (updated) {
          setProducts((prev) =>
            prev.map((p) => (p._id === _id ? updated : p))
          );
        }
      } else {
        const { _id, ...data } = form;
        void _id;
        const created = await createProduct(data as unknown as Omit<Product, "_id" | "organizationId" | "createdAt" | "updatedAt">);
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

  const openNew = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const thumb = (p: Product, size = 40) => (
    <Avatar
      src={p.imageUrl || null}
      alt=""
      size={size}
      radius="md"
      styles={{ root: { background: "var(--surface-hover)", flex: "none" }, placeholder: { color: "var(--ink-subtle)" } }}
    >
      <IconPackage size={18} stroke={1.75} />
    </Avatar>
  );

  const stockCell = (p: Product) =>
    p.trackStock ? (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
        <span className="ag-num" style={{ fontWeight: 600 }}>{p.stockQuantity}</span>
        {isLowStock(p) && (
          <span className="ag-badge ag-badge--warning" style={{ height: 20, fontSize: 11, padding: "0 8px" }}>
            <IconAlertTriangle size={12} stroke={2} /> Bajo
          </span>
        )}
      </span>
    ) : (
      <span className="ag-subtle">Sin control</span>
    );

  const Actions = ({ p }: { p: Product }) =>
    canManage ? (
      <Menu shadow="lg" withinPortal position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label={`Acciones de ${p.name}`} onClick={(e) => e.stopPropagation()}>
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
          <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => openEdit(p)}>
            Editar
          </Menu.Item>
          {p.trackStock && (
            <Menu.Item leftSection={<IconAdjustments size={16} />} onClick={() => setAdjustingProduct(p)}>
              Ajustar stock
            </Menu.Item>
          )}
          <Menu.Divider />
          <Menu.Item
            leftSection={p.active ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
            onClick={() => confirmDeactivate(p)}
          >
            {p.active ? "Desactivar" : "Activar"}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    ) : null;

  const headerActions = (
    <>
      {storeEnabled && !isMobile && (
        <Button
          variant="subtle"
          color="gray"
          leftSection={clipboard.copied ? <IconCheck size={16} /> : <IconLink size={16} />}
          onClick={() => clipboard.copy(`${window.location.origin}/tienda`)}
        >
          {clipboard.copied ? "Link copiado" : "Copiar link de la tienda"}
        </Button>
      )}
      {canSell && !isMobile && (
        <Button variant="default" leftSection={<IconShoppingCart size={16} />} onClick={() => setIsSaleModalOpen(true)}>
          Registrar venta
        </Button>
      )}
      {canManage && (
        <Button leftSection={<IconPlus size={16} />} onClick={openNew} size={isMobile ? "xs" : "sm"}>
          Nuevo producto
        </Button>
      )}
    </>
  );

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      <StoreTabs actions={headerActions} />

      {/* Filtros y estado de la tienda */}
      <div className="ag-row" style={{ gap: 12 }}>
        <div className="ag-search" style={{ flex: isMobile ? "1 1 100%" : "0 1 320px" }}>
          <input
            className="ag-input"
            type="search"
            placeholder="Buscar por nombre, categoría, marca o SKU"
            aria-label="Buscar productos"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <span aria-hidden="true">
            <IconSearch size={16} stroke={1.75} />
          </span>
        </div>
        <Switch label="Ver inactivos" checked={showInactive} onChange={(e) => setShowInactive(e.currentTarget.checked)} />
        <span style={{ flex: 1 }} />
        {canManage && (
          <button
            type="button"
            className="ag-chip"
            onClick={() => setStoreSettingsOpen(true)}
            aria-label="Ajustes de la tienda pública"
          >
            <IconSettings size={14} />
            Tienda pública:
            <b style={{ color: storeEnabled ? "var(--success)" : "var(--ink-muted)" }}>{storeEnabled ? "Activa" : "Apagada"}</b>
          </button>
        )}
      </div>

      {initialLoaded && !loadError && (lowStock || onlyLowStock) && (
        <div className="ag-alert ag-alert--warning" role="status">
          <IconAlertTriangle size={18} />
          <div style={{ flex: 1 }}>
            {onlyLowStock || !lowStock ? <b>Viendo solo los productos con stock bajo.</b> : lowStock.text} {!onlyLowStock && "Revisa si hay que pedir más."}
          </div>
          <Button size="xs" variant="default" onClick={() => setOnlyLowStock((v) => !v)}>
            {onlyLowStock ? "Ver todos" : "Ver solo esos"}
          </Button>
        </div>
      )}

      {loadError ? (
        <div className="ag-alert ag-alert--danger" role="alert">
          <IconAlertTriangle size={18} />
          <div style={{ flex: 1 }}>No se pudieron cargar los productos. Revisa tu conexión e inténtalo de nuevo.</div>
          <Button size="xs" variant="default" onClick={() => void loadProducts()}>
            Reintentar
          </Button>
        </div>
      ) : !initialLoaded ? (
        <div className="ag-card" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
              <span className="ag-skeleton" style={{ width: 40, height: 40, borderRadius: "var(--radius-md)" }} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="ag-skeleton" style={{ width: "35%" }} />
                <span className="ag-skeleton" style={{ width: "20%" }} />
              </span>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <div className="ag-empty__icon"><IconPackage size={22} /></div>
            <h3>Aún no tienes productos</h3>
            <p>Crea el primero para empezar a vender.</p>
            {canManage && <Button leftSection={<IconPlus size={16} />} onClick={openNew}>Nuevo producto</Button>}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <h3>No hay productos con estos filtros</h3>
            <Button variant="default" onClick={() => { setSearchTerm(""); setShowInactive(true); }}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      ) : isMobile ? (
        <div className="ag-card">
          {filtered.map((p) => (
            <div
              key={p._id}
              className="ag-list-row"
              role={canManage ? "button" : undefined}
              tabIndex={canManage ? 0 : undefined}
              onClick={() => canManage && openEdit(p)}
              style={{ padding: "var(--space-3)", cursor: canManage ? "pointer" : undefined, opacity: p.active ? 1 : 0.65 }}
            >
              {thumb(p, 44)}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <b style={{ fontSize: 15 }}>{p.name}</b>
                <span className="ag-subtle ag-num">
                  {money(p.salePrice)} · {p.trackStock ? `${p.stockQuantity} en stock` : "Sin control de stock"}
                </span>
                <div className="ag-row" style={{ gap: 4 }}>
                  {isLowStock(p) && (
                    <span className="ag-badge ag-badge--warning" style={{ height: 20, fontSize: 11, padding: "0 8px" }}>
                      <IconAlertTriangle size={12} stroke={2} /> Stock bajo
                    </span>
                  )}
                  <StateBadge info={publicationState(p)} small />
                </div>
              </div>
              <Actions p={p} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="num">Precio</th>
                <th className="num">Stock</th>
                <th>Comisión</th>
                <th>Publicación</th>
                {canManage && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p._id}
                  onClick={() => canManage && openEdit(p)}
                  style={{ cursor: canManage ? "pointer" : undefined, opacity: p.active ? 1 : 0.65 }}
                >
                  <td>
                    <div className="ag-who" style={{ minWidth: 0 }}>
                      {thumb(p)}
                      <div style={{ minWidth: 0 }}>
                        <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</b>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[p.brand, p.sku && `SKU ${p.sku}`].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{p.category || <span className="ag-subtle">—</span>}</td>
                  <td className="num"><b>{money(p.salePrice)}</b></td>
                  <td className="num">{stockCell(p)}</td>
                  <td>{productCommissionText(p.commissionType, p.commissionValue, money)}</td>
                  <td><StateBadge info={publicationState(p)} /></td>
                  {canManage && (
                    <td style={{ width: 48, textAlign: "right" }}>
                      <Actions p={p} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Móvil: «Registrar venta» flotante sobre la barra inferior */}
      {isMobile && canSell && (
        <Button
          size="lg"
          radius="xl"
          leftSection={<IconShoppingCart size={18} />}
          onClick={() => setIsSaleModalOpen(true)}
          style={{ position: "fixed", right: 16, bottom: "calc(var(--app-shell-footer-offset, 0px) + 16px)", zIndex: 150, boxShadow: "var(--shadow-lg)" }}
        >
          Registrar venta
        </Button>
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

      <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onSaleCreated={loadProducts} products={products} />

      <StoreSettingsDrawer opened={storeSettingsOpen} onClose={() => setStoreSettingsOpen(false)} />
    </div>
  );
};

export default InventoryPage;
