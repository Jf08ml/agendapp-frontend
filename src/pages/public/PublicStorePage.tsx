// Tienda pública (rediseño, TiendaPublica): catálogo con búsqueda y categorías,
// pedido en un drawer (hoja inferior en móvil) y "Hacer pedido" con Mercado
// Pago, transferencia (comprobante) o pago contra entrega.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Collapse, Drawer, Loader, Modal, Skeleton, TextInput, Textarea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconCircleCheck,
  IconInfoCircle,
  IconMapPin,
  IconMinus,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconShoppingBag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { CountryCode } from "libphonenumber-js";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import AddressMapPicker from "../../components/AddressMapPicker";
import { formatCurrency } from "../../utils/formatCurrency";
import { storeImageSrc } from "../../utils/storeImage";
import { useStoreCart } from "../../hooks/useStoreCart";
import { getClientByIdentifier } from "../../services/clientService";
import {
  DEFAULT_STORE_FORM_CONFIG,
  BUILT_IN_FIELD_KEYS,
  type ClientFieldConfig,
} from "../../services/organizationService";
import DynamicFormFields from "../../components/DynamicFormFields";
import { type ReceiptPaymentMethod } from "../../services/collectionService";
import {
  getCatalog,
  createStoreCheckout,
  createStoreCodOrder,
  createReceiptStoreCheckout,
  type StoreProduct,
  type StoreCartItem,
  type StoreOrderPayload,
} from "../../services/storeService";

interface CustomerForm {
  name: string;
  phone: string;
  phone_e164: string;
  phone_country: string;
  email: string;
  documentId: string;
}

const emptyCustomer = (): CustomerForm => ({
  name: "",
  phone: "",
  phone_e164: "",
  phone_country: "CO",
  email: "",
  documentId: "",
});

const IDENTIFIER_LABELS: Record<string, string> = {
  phone: "Teléfono",
  email: "Correo electrónico",
  documentId: "Número de documento",
};

type PayMethod = "mp" | "receipt" | "cod";
type DeliveryMode = "pickup" | "delivery";

// Resumen del pedido confirmado contraentrega (snapshot para la pantalla final).
interface CodConfirmation {
  items: StoreCartItem[];
  total: number;
  deliveryMode: DeliveryMode;
  address?: string;
}

const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Búsqueda tolerante a tildes y mayúsculas.
const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Valor centinela del chip "Todas" (evita colisión con una categoría real).
const ALL_CATEGORIES = "__all__";

// Estilos propios de la tienda (grilla, tarjeta de producto, barra del pedido).
const STORE_STYLES = `
  .store-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  @media (min-width: 48em) { .store-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; } }
  .store-filters { display: flex; flex-direction: column; gap: 10px; position: sticky; top: 50px; z-index: 20; background: var(--mantine-color-body); padding: 6px 0; }
  @media (min-width: 48em) { .store-filters { flex-direction: row; align-items: center; gap: 12px; } }
  .store-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; min-width: 0; }
  .store-chips::-webkit-scrollbar { display: none; }
  .store-chips .ag-chip { cursor: pointer; }
  .store-card { display: flex; flex-direction: column; overflow: hidden; cursor: pointer; transition: border-color 120ms ease, box-shadow 120ms ease; }
  @media (hover: hover) { .store-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-sm); } }
  .store-card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  .store-card__img { position: relative; aspect-ratio: 1; }
  .store-card__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .store-card[data-soldout] .store-card__img > img, .store-card[data-soldout] .store-card__img > svg { opacity: .5; filter: grayscale(1); }
  .store-card[data-soldout] .store-card__body { opacity: .65; }
  .store-card__badges { position: absolute; top: 8px; left: 8px; display: flex; gap: 4px; }
  .store-card__badges .ag-badge:not(.ag-badge--danger) { background: var(--surface-raised); color: var(--ink); box-shadow: var(--shadow-sm); }
  .store-card__body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .store-card__brand { font: 600 11px/16px var(--font-sans); letter-spacing: .04em; text-transform: uppercase; color: var(--ink-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .store-card__name { font: 600 14px/20px var(--font-sans); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .store-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 8px; }
  .store-add { flex: none; width: 32px; height: 32px; border-radius: 999px; border: 1px solid var(--line-control); background: var(--surface-raised); color: var(--ink); display: grid; place-items: center; cursor: pointer; font: 600 13px/1 var(--font-sans); font-variant-numeric: tabular-nums; }
  .store-add[data-count] { background: var(--ink); border-color: var(--ink); color: var(--ink-inverse); }
  .store-stepper { display: inline-flex; align-items: center; border: 1px solid var(--line-control); border-radius: 999px; height: 30px; }
  .store-stepper button { width: 30px; height: 28px; border: 0; background: none; color: var(--ink); display: grid; place-items: center; cursor: pointer; border-radius: 999px; }
  .store-stepper button:hover { background: var(--surface-hover); }
  .store-stepper span { min-width: 22px; text-align: center; font-size: 14px; font-weight: 600; }
  .store-icon-btn { border: 0; background: none; color: var(--ink-subtle); padding: 4px; border-radius: 6px; cursor: pointer; display: grid; place-items: center; }
  .store-icon-btn:hover { background: var(--surface-hover); color: var(--ink); }
  .store-bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 150; display: flex; align-items: center; gap: 12px; background: var(--surface-raised); border-top: 1px solid var(--line); padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); }
  .store-fab { position: fixed; right: 24px; bottom: 24px; z-index: 150; display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 8px 0 16px; border-radius: 999px; border: 0; background: var(--ink); color: var(--ink-inverse); font: 600 14px/1 var(--font-sans); box-shadow: var(--shadow-lg); cursor: pointer; }
  .store-fab__count { min-width: 28px; height: 28px; padding: 0 8px; border-radius: 999px; background: var(--ink-inverse); color: var(--ink); display: grid; place-items: center; font-size: 13px; }
`;

export default function PublicStorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const orgCountry = (organization?.default_country || "CO") as CountryCode;
  const storeEnabled = !!organization?.storeEnabled;
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("COP");
  const [mpConnected, setMpConnected] = useState(false);
  const [receiptMethods, setReceiptMethods] = useState<ReceiptPaymentMethod[]>([]);
  const [codEnabled, setCodEnabled] = useState(false);
  const [deliveryModes, setDeliveryModes] = useState({ pickup: true, delivery: true });
  const [products, setProducts] = useState<StoreProduct[]>([]);

  // ── Búsqueda y filtro por categoría (client-side) ──────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);

  // ── Carrito (persistido en localStorage por organización — ver useStoreCart,
  // necesario para que sobreviva la navegación a /tienda/producto/:id) ───────
  const [cart, setCart] = useStoreCart(organization?._id);
  // El detalle de producto vuelve con { openCart: true } para abrir el pedido.
  const [cartOpen, setCartOpen] = useState(() => !!(location.state as { openCart?: boolean } | null)?.openCart);

  // ── Config del formulario de tienda (independiente del de reservas/citas) ──
  const rawConfig = organization?.storeFormConfig;
  const identifierField: "phone" | "email" | "documentId" =
    rawConfig?.identifierField ?? DEFAULT_STORE_FORM_CONFIG.identifierField;
  const configFields: ClientFieldConfig[] =
    rawConfig?.fields?.length ? rawConfig.fields : DEFAULT_STORE_FORM_CONFIG.fields;
  const fieldCfg = (key: ClientFieldConfig["key"]) =>
    configFields.find((f) => f.key === key) ?? { key, enabled: false, required: false };
  const phoneCfg = fieldCfg("phone");
  const emailCfg = fieldCfg("email");
  const documentIdCfg = fieldCfg("documentId");
  // Campos personalizados (fuera del set built-in), habilitados — la tienda no
  // crea Client, así que todos se tratan como "booking" (ligados al pedido).
  const customFields = configFields.filter(
    (f) => !(BUILT_IN_FIELD_KEYS as readonly string[]).includes(f.key) && f.enabled
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const handleCustomFieldChange = (key: string, value: string | number | Date | null) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  // ── Modal de checkout ──────────────────────────────────────────────────────
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyCustomer());
  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [foundName, setFoundName] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("pickup");
  const [address, setAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [deliveryLat, setDeliveryLat] = useState<number | undefined>(undefined);
  const [deliveryLng, setDeliveryLng] = useState<number | undefined>(undefined);
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Confirmación de pedido contraentrega ───────────────────────────────────
  const [codConfirmation, setCodConfirmation] = useState<CodConfirmation | null>(null);

  const setField = (field: keyof CustomerForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // La rama "tienda deshabilitada" se renderiza antes que el loader, así que
  // no hace falta apagar `loading` cuando storeEnabled es false.
  useEffect(() => {
    const orgId = organization?._id;
    if (!orgId || !storeEnabled) return;
    (async () => {
      setLoading(true);
      const res = await getCatalog(orgId);
      if (res) {
        setCurrency(res.currency);
        setMpConnected(res.mpConnected);
        setReceiptMethods(res.paymentMethods || []);
        setCodEnabled(res.codEnabled);
        setDeliveryModes(res.deliveryModes ?? { pickup: true, delivery: true });
        setProducts(res.products || []);
      }
      setLoading(false);
    })();
  }, [organization?._id, storeEnabled]);

  // ── Categorías únicas + productos filtrados ────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = normalizeText(search.trim());
    return products.filter((p) => {
      if (
        categoryFilter !== ALL_CATEGORIES &&
        (p.category?.trim() ?? "") !== categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return normalizeText(
        `${p.name} ${p.brand ?? ""} ${p.description ?? ""}`
      ).includes(q);
    });
  }, [products, search, categoryFilter]);

  // ── Carrito: helpers ───────────────────────────────────────────────────────
  const cartQty = (productId: string) =>
    cart.find((i) => i.product._id === productId)?.quantity ?? 0;

  const addToCart = (product: StoreProduct) => {
    // Sin aviso: la tarjeta muestra la cantidad y aparece la barra del pedido.
    setCart((prev) => {
      const existing = prev.find((i) => i.product._id === product._id);
      if (existing) {
        return prev.map((i) =>
          i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product._id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((i) => i.product._id !== productId));

  const total = cart.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0);
  const itemCount = cart.reduce((n, i) => n + i.quantity, 0);

  // ── Vías de pago disponibles ───────────────────────────────────────────────
  const hasMp = mpConnected;
  const hasReceipt = receiptMethods.length > 0;
  const hasCod = codEnabled;
  const canPay = hasMp || hasReceipt || hasCod;

  const openCheckout = () => {
    setForm(emptyCustomer());
    setPhoneValid(false);
    setPhoneError(null);
    setEmailError(null);
    setFoundName(null);
    setFormError(null);
    setDeliveryMode(deliveryModes.pickup ? "pickup" : "delivery");
    setAddress("");
    setDeliveryNotes("");
    setShowMap(false);
    setDeliveryLat(undefined);
    setDeliveryLng(undefined);
    setPayMethod(hasMp ? "mp" : hasReceipt ? "receipt" : hasCod ? "cod" : null);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (submitting) return;
    setCheckoutOpen(false);
  };

  // Autocompletar por el identificador configurado.
  const runLookup = async (field: typeof identifierField, value: string) => {
    const orgId = organization?._id;
    if (!value?.trim() || !orgId) return;
    setIsLookingUp(true);
    setFoundName(null);
    try {
      const client = await getClientByIdentifier(field, value, orgId);
      if (client) {
        setForm((prev) => ({
          ...prev,
          name: prev.name.trim() || client.name || "",
          email: prev.email.trim() || client.email || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          documentId: prev.documentId.trim() || (client as any).documentId || "",
        }));
        setFoundName(client.name || null);
      }
    } catch {
      // silencioso
    } finally {
      setIsLookingUp(false);
    }
  };

  const handlePhoneBlur = async () => {
    if (identifierField !== "phone") return;
    if (!phoneValid || !form.phone_e164) {
      if (form.phone) setPhoneError("Número de teléfono inválido");
      return;
    }
    await runLookup("phone", form.phone_e164);
  };

  const handleEmailBlur = async () => {
    const email = form.email.trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Correo no válido");
      return;
    }
    setEmailError(null);
    if (identifierField === "email" && email) await runLookup("email", email);
  };

  const handleDocumentIdBlur = async () => {
    if (identifierField !== "documentId") return;
    const val = form.documentId.trim();
    if (val) await runLookup("documentId", val);
  };

  const handleOrder = async () => {
    if (!organization?._id || cart.length === 0) return;
    if (!form.name.trim()) {
      setFormError("Ingresa tu nombre.");
      return;
    }
    // El teléfono siempre es obligatorio: el negocio necesita contactarte.
    if (!form.phone_e164 || !phoneValid) {
      setFormError("Ingresa un teléfono válido.");
      return;
    }
    if (identifierField === "email" && (!form.email.trim() || !isValidEmail(form.email))) {
      setFormError("Ingresa un correo válido.");
      return;
    }
    if (identifierField === "documentId" && !form.documentId.trim()) {
      setFormError("Ingresa tu número de documento.");
      return;
    }
    if (emailCfg.enabled && emailCfg.required && identifierField !== "email" && !form.email.trim()) {
      setFormError("Ingresa un correo válido.");
      return;
    }
    if (documentIdCfg.enabled && documentIdCfg.required && identifierField !== "documentId" && !form.documentId.trim()) {
      setFormError("Ingresa tu número de documento.");
      return;
    }
    if (form.email.trim() && !isValidEmail(form.email)) {
      setFormError("Ingresa un correo válido.");
      return;
    }
    if (deliveryMode === "delivery" && !address.trim()) {
      setFormError("Ingresa la dirección de entrega.");
      return;
    }
    if (!payMethod) {
      setFormError("Selecciona cómo quieres pagar.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload: StoreOrderPayload = {
        organizationId: organization._id,
        items: cart.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
        customer: {
          name: form.name.trim(),
          phone: form.phone_e164 || form.phone,
          email: form.email.trim() || undefined,
          documentId: form.documentId.trim() || undefined,
        },
        delivery: {
          mode: deliveryMode,
          address: deliveryMode === "delivery" ? address.trim() : undefined,
          notes: deliveryNotes.trim() || undefined,
          ...(deliveryMode === "delivery" && deliveryLat != null && deliveryLng != null
            ? { lat: deliveryLat, lng: deliveryLng }
            : {}),
        },
        ...(Object.keys(customFieldValues).length > 0 ? { customFieldValues } : {}),
      };

      if (payMethod === "mp") {
        const checkout = await createStoreCheckout(payload);
        if (checkout?.checkoutUrl) {
          window.location.href = checkout.checkoutUrl;
          return; // navegamos fuera; el webhook despacha la venta al pagar
        }
        setFormError("No se pudo iniciar el pago. Intenta de nuevo.");
        return;
      }

      if (payMethod === "receipt") {
        const checkout = await createReceiptStoreCheckout(payload);
        if (checkout) {
          navigate("/pago/comprobante", {
            state: {
              externalReference: checkout.externalReference,
              amount: checkout.amount,
              currency: checkout.currency,
              paymentMethods: checkout.paymentMethods,
              orderType: "store",
            },
          });
          return;
        }
        setFormError("No se pudo iniciar el pago. Intenta de nuevo.");
        return;
      }

      // Contra entrega
      const result = await createStoreCodOrder(payload);
      if (result?.externalReference) {
        setCodConfirmation({
          items: cart,
          total,
          deliveryMode,
          address: deliveryMode === "delivery" ? address.trim() : undefined,
        });
        setCheckoutOpen(false);
        setCartOpen(false);
        setCart([]);
        return;
      }
      setFormError("No se pudo registrar el pedido. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const LookupFeedback = () =>
    isLookingUp ? (
      <div className="ag-row ag-subtle" style={{ gap: 6 }}>
        <Loader size={12} /> Buscando por {IDENTIFIER_LABELS[identifierField].toLowerCase()}…
      </div>
    ) : foundName ? (
      <div className="ag-alert ag-alert--success" style={{ padding: "8px 12px" }}>
        <IconCircleCheck size={18} />
        <div style={{ fontSize: 13 }}>
          Cliente encontrado: <b>{foundName}</b>. Completamos tus datos.
        </div>
      </div>
    ) : null;

  // Vías de pago disponibles (nota del carrito).
  const payHints = [hasMp && "Mercado Pago", hasReceipt && "transferencia", hasCod && "contra entrega"].filter(Boolean) as string[];

  const countLabel = (n: number) => (n === 1 ? "1 producto" : `${n} productos`);
  const page = { maxWidth: 1120, margin: "0 auto", padding: isMobile ? "16px 16px 112px" : "24px 24px 64px" } as const;
  const h1 = { margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" } as const;

  const headerBlock = (
    <div>
      <h1 style={h1}>Tienda</h1>
      <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
        Elige tus productos, arma tu pedido y págalo en línea o al recibirlo.
      </div>
    </div>
  );

  const emptyState = (title: string, text: string, action?: ReactNode) => (
    <div className="ag-card" style={{ padding: "40px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <b style={{ fontSize: 15 }}>{title}</b>
      <div className="ag-muted" style={{ fontSize: 14, maxWidth: 360 }}>{text}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );

  const thumb = (p: StoreProduct, size: number) => (
    <span className="ag-photo" style={{ width: size, height: size, borderRadius: 8, overflow: "hidden", flex: "none" }}>
      {p.imageUrl ? (
        <img src={storeImageSrc(p.imageUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <IconPhoto size={size / 2.4} />
      )}
    </span>
  );

  const stepper = (productId: string, qty: number, name: string) => (
    <div className="store-stepper" role="group" aria-label={`Cantidad de ${name}`}>
      <button type="button" aria-label="Quitar uno" onClick={() => changeQty(productId, -1)}>
        <IconMinus size={14} />
      </button>
      <span className="ag-num">{qty}</span>
      <button type="button" aria-label="Agregar uno" onClick={() => changeQty(productId, 1)}>
        <IconPlus size={14} />
      </button>
    </div>
  );

  // ── Tienda deshabilitada ─────────────────────────────────────────────────
  if (organization && !storeEnabled) {
    return (
      <div style={{ ...page, maxWidth: 480, paddingTop: 48 }}>
        {emptyState(
          "La tienda no está disponible",
          "Este negocio no tiene la tienda en línea activa por el momento.",
          <Button variant="default" onClick={() => navigate("/")}>Volver al inicio</Button>
        )}
      </div>
    );
  }

  // ── Cargando ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={page}>
        <style>{STORE_STYLES}</style>
        <div className="ag-stack" style={{ gap: 16 }}>
          {headerBlock}
          <div className="store-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ag-card" style={{ overflow: "hidden" }}>
                <Skeleton radius={0} style={{ aspectRatio: "1", height: "auto" }} />
                <div style={{ padding: 12 }}>
                  <Skeleton height={12} width="70%" mb={8} />
                  <Skeleton height={16} width="45%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Pedido contra entrega confirmado ─────────────────────────────────────
  if (codConfirmation) {
    const n = codConfirmation.items.reduce((s, i) => s + i.quantity, 0);
    return (
      <div style={{ ...page, maxWidth: 520 }}>
        <div className="ag-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--success-soft)", color: "var(--success)" }}>
              <IconCircleCheck size={28} />
            </span>
            <h1 style={{ ...h1, fontSize: 22, lineHeight: "28px" }}>Recibimos tu pedido</h1>
            <div className="ag-muted" style={{ fontSize: 14, maxWidth: 380 }}>
              El negocio te contactará para coordinar la entrega. Pagas al {codConfirmation.deliveryMode === "delivery" ? "recibirlo" : "recogerlo"}.
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="ag-subtle" style={{ marginBottom: 6 }}>{countLabel(n)}</div>
            {codConfirmation.items.map((i) => (
              <div key={i.product._id} className="ag-row" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 8, fontSize: 14, padding: "3px 0" }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {i.quantity} × {i.product.name}
                </span>
                <span className="ag-num">{formatCurrency(i.product.salePrice * i.quantity, currency)}</span>
              </div>
            ))}
            <div className="ag-row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }}>
              <b>Total</b>
              <span className="ag-price">{formatCurrency(codConfirmation.total, currency)}</span>
            </div>
          </div>

          <dl className="ag-kv" style={{ margin: 0 }}>
            <dt>Entrega</dt>
            <dd>{codConfirmation.deliveryMode === "delivery" ? "Domicilio" : "Recoger en el local"}</dd>
            {codConfirmation.address && (
              <>
                <dt>Dirección</dt>
                <dd>{codConfirmation.address}</dd>
              </>
            )}
            <dt>Pago</dt>
            <dd>Contra entrega</dd>
          </dl>

          <Button variant="default" onClick={() => setCodConfirmation(null)}>
            Seguir comprando
          </Button>
        </div>
      </div>
    );
  }

  // ── Contenido del carrito (drawer en desktop, hoja inferior en móvil) ────
  const cartContent =
    cart.length === 0 ? (
      <div style={{ textAlign: "center", padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <b style={{ fontSize: 15 }}>Tu pedido está vacío</b>
        <div className="ag-muted" style={{ fontSize: 14 }}>Agrega productos del catálogo para armarlo.</div>
        <Button variant="default" mt={8} onClick={() => setCartOpen(false)}>Ver productos</Button>
      </div>
    ) : (
      <div className="ag-stack" style={{ gap: 16 }}>
        <div>
          {cart.map((i) => (
            <div key={i.product._id} className="ag-row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              {thumb(i.product, 48)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.product.name}</div>
                <div className="ag-subtle ag-num">{formatCurrency(i.product.salePrice, currency)} c/u</div>
                <div style={{ marginTop: 6 }}>{stepper(i.product._id, i.quantity, i.product.name)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span className="ag-num" style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(i.product.salePrice * i.quantity, currency)}</span>
                <button type="button" className="store-icon-btn" aria-label={`Quitar ${i.product.name}`} onClick={() => removeFromCart(i.product._id)}>
                  <IconTrash size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="ag-stack" style={{ gap: 6, fontSize: 14 }}>
          <div className="ag-row" style={{ justifyContent: "space-between" }}>
            <span className="ag-muted">Subtotal</span>
            <span className="ag-num">{formatCurrency(total, currency)}</span>
          </div>
          <div className="ag-row" style={{ justifyContent: "space-between" }}>
            <span className="ag-muted">Envío</span>
            <span className="ag-muted">Lo coordina el negocio</span>
          </div>
          <div className="ag-row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 2 }}>
            <b>Total</b>
            <span className="ag-price">{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <div className="ag-stack" style={{ gap: 6 }}>
          <Button
            fullWidth
            size="md"
            disabled={!canPay}
            onClick={() => {
              setCartOpen(false);
              openCheckout();
            }}
          >
            Hacer pedido
          </Button>
          <Button fullWidth variant="subtle" color="gray" onClick={() => setCartOpen(false)}>
            Seguir comprando
          </Button>
          {payHints.length > 0 && (
            <div className="ag-subtle" style={{ textAlign: "center" }}>
              Pagas con {payHints.length > 1 ? `${payHints.slice(0, -1).join(", ")} o ${payHints[payHints.length - 1]}` : payHints[0]}.
            </div>
          )}
        </div>
      </div>
    );

  // ── Opciones del checkout ────────────────────────────────────────────────
  const option = (checked: boolean, onSelect: () => void, title: string, desc: string, key: string) => (
    <div
      key={key}
      className="ag-opt"
      role="radio"
      tabIndex={0}
      aria-checked={checked}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
      style={{ cursor: "pointer", flex: 1 }}
    >
      <span className="ag-radio" />
      <div>
        <b>{title}</b>
        <div className="d">{desc}</div>
      </div>
    </div>
  );

  const submitLabel =
    payMethod === "cod" ? "Confirmar pedido" : payMethod === "receipt" ? "Continuar al pago" : `Pagar ${formatCurrency(total, currency)}`;

  const sectionTitle = (t: string) => (
    <h2 className="ag-h" style={{ margin: 0 }}>{t}</h2>
  );

  return (
    <div style={page}>
      <style>{STORE_STYLES}</style>

      <div className="ag-stack" style={{ gap: 16 }}>
        {headerBlock}

        {products.length > 0 && (
          <div className="store-filters">
            <TextInput
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              leftSection={<IconSearch size={16} />}
              rightSection={
                search ? (
                  <button type="button" className="store-icon-btn" aria-label="Borrar búsqueda" onClick={() => setSearch("")}>
                    <IconX size={14} />
                  </button>
                ) : null
              }
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: isMobile ? "100%" : 320, flex: "none" }}
            />
            {categories.length >= 2 && (
              <div className="store-chips" role="group" aria-label="Categorías">
                <button type="button" className="ag-chip" aria-pressed={categoryFilter === ALL_CATEGORIES} onClick={() => setCategoryFilter(ALL_CATEGORIES)}>
                  Todas <span className="count">{products.length}</span>
                </button>
                {categories.map((c) => (
                  <button key={c} type="button" className="ag-chip" aria-pressed={categoryFilter === c} onClick={() => setCategoryFilter(c)}>
                    {c} <span className="count">{products.filter((p) => p.category?.trim() === c).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!canPay && products.length > 0 && (
          <div className="ag-alert ag-alert--info">
            <IconInfoCircle size={20} />
            <div>Los pedidos en línea no están disponibles en este momento. Comunícate con el negocio para comprar.</div>
          </div>
        )}

        {/* ── Catálogo ── */}
        {products.length === 0 ? (
          emptyState("Aún no hay productos", "Vuelve pronto: el negocio está preparando su catálogo.")
        ) : filteredProducts.length === 0 ? (
          emptyState(
            "No encontramos productos",
            "Prueba con otra búsqueda o cambia de categoría.",
            <Button
              variant="default"
              size="xs"
              onClick={() => {
                setSearch("");
                setCategoryFilter(ALL_CATEGORIES);
              }}
            >
              Limpiar filtros
            </Button>
          )
        ) : (
          <div className="store-grid">
            {filteredProducts.map((product) => {
              const qty = cartQty(product._id);
              const soldOut = !!product.outOfStock;
              const open = () => navigate(`/tienda/producto/${product._id}`);
              return (
                <div
                  key={product._id}
                  className="ag-card store-card"
                  data-soldout={soldOut || undefined}
                  role="link"
                  tabIndex={0}
                  aria-label={product.name}
                  onClick={open}
                  onKeyDown={(e) => e.key === "Enter" && open()}
                >
                  <div className="store-card__img ag-photo">
                    {product.imageUrl ? (
                      <img src={storeImageSrc(product.imageUrl)} alt="" loading="lazy" />
                    ) : (
                      <IconPhoto size={32} />
                    )}
                    {(product.featured || soldOut) && (
                      <div className="store-card__badges">
                        {soldOut ? (
                          <span className="ag-badge ag-badge--danger">Agotado</span>
                        ) : (
                          <span className="ag-badge">Destacado</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="store-card__body">
                    {product.brand && <div className="store-card__brand">{product.brand}</div>}
                    <div className="store-card__name">{product.name}</div>
                    <div className="store-card__foot">
                      <span className="ag-price">{formatCurrency(product.salePrice, currency)}</span>
                      {!soldOut && canPay && (
                        <button
                          type="button"
                          className="store-add"
                          data-count={qty > 0 || undefined}
                          aria-label={qty > 0 ? `${qty} en tu pedido. Agregar otro ${product.name}` : `Agregar ${product.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                        >
                          {qty > 0 ? qty : <IconPlus size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Acceso al pedido: barra inferior en móvil, botón flotante en desktop ── */}
      {cart.length > 0 &&
        !cartOpen &&
        !checkoutOpen &&
        (isMobile ? (
          <div className="store-bottom-bar">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {countLabel(itemCount)} · <span className="ag-num">{formatCurrency(total, currency)}</span>
              </div>
              <div className="ag-subtle">Envío: lo coordina el negocio</div>
            </div>
            <Button onClick={() => setCartOpen(true)}>Ver pedido</Button>
          </div>
        ) : (
          <button type="button" className="store-fab" onClick={() => setCartOpen(true)}>
            <IconShoppingBag size={18} />
            Ver pedido
            <span className="store-fab__count ag-num">{itemCount}</span>
          </button>
        ))}

      {/* ── Pedido ── */}
      <Drawer
        opened={cartOpen}
        onClose={() => setCartOpen(false)}
        position={isMobile ? "bottom" : "right"}
        size={isMobile ? "auto" : 420}
        radius={isMobile ? "lg" : 0}
        title={
          <b style={{ fontSize: 16 }}>
            Tu pedido{itemCount > 0 && <span className="ag-muted" style={{ fontWeight: 400 }}> · {countLabel(itemCount)}</span>}
          </b>
        }
        styles={isMobile ? { content: { flex: "0 0 auto", height: "auto", maxHeight: "88dvh" } } : undefined}
      >
        {cartContent}
      </Drawer>

      {/* ── Hacer pedido ── */}
      <Modal
        opened={checkoutOpen}
        onClose={closeCheckout}
        title={<b style={{ fontSize: 16 }}>Hacer pedido</b>}
        centered
        size="lg"
        radius="lg"
        fullScreen={isMobile}
      >
        <div className="ag-stack" style={{ gap: 20 }}>
          <div className="ag-stack" style={{ gap: 10 }}>
            {sectionTitle("Tus datos")}

            {/* Identificador configurado por la organización (siempre primero) */}
            {identifierField === "phone" && (
              <>
                <InternationalPhoneInput
                  label={phoneCfg.label || IDENTIFIER_LABELS.phone}
                  value={form.phone_e164 || form.phone}
                  organizationDefaultCountry={orgCountry}
                  onChange={(e164, country, valid) => {
                    setField("phone_e164", e164 ?? "");
                    setField("phone", e164 ?? "");
                    setField("phone_country", country ?? "CO");
                    setPhoneValid(valid);
                    setPhoneError(null);
                  }}
                  onBlur={handlePhoneBlur}
                  error={phoneError}
                  required
                  compact
                />
                <LookupFeedback />
              </>
            )}
            {identifierField === "email" && (
              <>
                <TextInput
                  label={emailCfg.label || IDENTIFIER_LABELS.email}
                  placeholder="tu@correo.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.currentTarget.value)}
                  onBlur={handleEmailBlur}
                  error={emailError}
                  required
                  disabled={isLookingUp}
                />
                <LookupFeedback />
              </>
            )}
            {identifierField === "documentId" && (
              <>
                <TextInput
                  label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
                  placeholder="Cédula, pasaporte…"
                  value={form.documentId}
                  onChange={(e) => setField("documentId", e.currentTarget.value)}
                  onBlur={handleDocumentIdBlur}
                  required
                  disabled={isLookingUp}
                />
                <LookupFeedback />
              </>
            )}

            <TextInput
              label="Nombre completo"
              placeholder="Tu nombre"
              required
              value={form.name}
              onChange={(e) => setField("name", e.currentTarget.value)}
              disabled={isLookingUp}
            />

            {/* Teléfono: siempre obligatorio para coordinar el pedido */}
            {identifierField !== "phone" && (
              <InternationalPhoneInput
                label={phoneCfg.label || IDENTIFIER_LABELS.phone}
                value={form.phone_e164 || form.phone}
                organizationDefaultCountry={orgCountry}
                onChange={(e164, country, valid) => {
                  setField("phone_e164", e164 ?? "");
                  setField("phone", e164 ?? "");
                  setField("phone_country", country ?? "CO");
                  setPhoneValid(valid);
                }}
                required
                compact
              />
            )}
            {emailCfg.enabled && identifierField !== "email" && (
              <TextInput
                label={emailCfg.label || IDENTIFIER_LABELS.email}
                placeholder={emailCfg.required ? "tu@correo.com" : "Opcional"}
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.currentTarget.value)}
                onBlur={handleEmailBlur}
                error={emailError}
                required={emailCfg.required}
              />
            )}
            {documentIdCfg.enabled && identifierField !== "documentId" && (
              <TextInput
                label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
                placeholder={documentIdCfg.required ? "Cédula, pasaporte…" : "Opcional"}
                value={form.documentId}
                onChange={(e) => setField("documentId", e.currentTarget.value)}
                required={documentIdCfg.required}
              />
            )}

            <DynamicFormFields fields={customFields} values={customFieldValues} onChange={handleCustomFieldChange} disabled={isLookingUp} />
          </div>

          <div className="ag-stack" style={{ gap: 10 }}>
            {sectionTitle("Entrega")}
            <div role="radiogroup" aria-label="Entrega" style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
              {deliveryModes.pickup &&
                option(deliveryMode === "pickup", () => setDeliveryMode("pickup"), "Recoger en el local", "Pasas por tu pedido al negocio.", "pickup")}
              {deliveryModes.delivery &&
                option(deliveryMode === "delivery", () => setDeliveryMode("delivery"), "Domicilio", "Te lo llevan a tu dirección.", "delivery")}
            </div>
            {deliveryMode === "delivery" && (
              <>
                <Textarea
                  label="Dirección de entrega"
                  placeholder="Calle, número, barrio, referencias"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.currentTarget.value)}
                  minRows={2}
                  autosize
                />
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<IconMapPin size={14} />}
                  onClick={() => setShowMap((v) => !v)}
                  style={{ alignSelf: "flex-start" }}
                >
                  {showMap ? "Ocultar mapa" : "Ubicar en el mapa (opcional)"}
                </Button>
                <Collapse in={showMap}>
                  <AddressMapPicker
                    lat={deliveryLat}
                    lng={deliveryLng}
                    defaultCenter={organization?.location}
                    onChange={({ lat, lng, address: pickedAddress }) => {
                      setDeliveryLat(lat);
                      setDeliveryLng(lng);
                      if (pickedAddress) setAddress(pickedAddress);
                    }}
                  />
                </Collapse>
              </>
            )}
            <Textarea
              label="Notas para el pedido"
              placeholder="Opcional"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.currentTarget.value)}
              minRows={2}
              autosize
            />
          </div>

          <div className="ag-stack" style={{ gap: 10 }}>
            {sectionTitle("Pago")}
            <div role="radiogroup" aria-label="Pago" className="ag-stack" style={{ gap: 8 }}>
              {hasMp && option(payMethod === "mp", () => setPayMethod("mp"), "Pagar en línea", "Tarjeta, PSE o saldo con Mercado Pago.", "mp")}
              {hasReceipt &&
                option(payMethod === "receipt", () => setPayMethod("receipt"), "Transferencia", "Te mostramos los datos y subes tu comprobante.", "receipt")}
              {hasCod &&
                option(
                  payMethod === "cod",
                  () => setPayMethod("cod"),
                  "Contra entrega",
                  deliveryMode === "delivery" ? "Pagas al recibir tu pedido." : "Pagas al recoger tu pedido.",
                  "cod"
                )}
            </div>
          </div>

          <div className="ag-stack" style={{ gap: 10 }}>
            {sectionTitle("Resumen")}
            <div className="ag-card" style={{ padding: 14, background: "var(--surface-muted)" }}>
              {cart.map((i) => (
                <div key={i.product._id} className="ag-row" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 8, fontSize: 14, padding: "2px 0" }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {i.quantity} × {i.product.name}
                  </span>
                  <span className="ag-num">{formatCurrency(i.product.salePrice * i.quantity, currency)}</span>
                </div>
              ))}
              <div className="ag-row" style={{ justifyContent: "space-between", fontSize: 14, padding: "2px 0" }}>
                <span className="ag-muted">Envío</span>
                <span className="ag-muted">Lo coordina el negocio</span>
              </div>
              <div className="ag-row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }}>
                <b>Total</b>
                <span className="ag-price">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>

          {formError && (
            <div className="ag-alert ag-alert--danger">
              <IconInfoCircle size={20} />
              <div>{formError}</div>
            </div>
          )}

          <div className="ag-stack" style={{ gap: 6 }}>
            <Button fullWidth size="md" loading={submitting} onClick={handleOrder}>
              {submitLabel}
            </Button>
            <div className="ag-subtle" style={{ textAlign: "center" }}>
              {payMethod === "mp" && "Te llevamos a Mercado Pago para pagar de forma segura."}
              {payMethod === "receipt" && "En el siguiente paso verás los datos para pagar y subir tu comprobante."}
              {payMethod === "cod" && "El negocio te contactará para coordinar la entrega."}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
