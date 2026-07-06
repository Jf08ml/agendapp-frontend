import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Stack,
  Group,
  Badge,
  Button,
  ThemeIcon,
  Loader,
  Center,
  Alert,
  Modal,
  TextInput,
  Textarea,
  Divider,
  ActionIcon,
  Radio,
  Image,
  AspectRatio,
  Drawer,
  Affix,
  Chip,
  Skeleton,
  Paper,
  Box,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCash,
  IconCircleCheck,
  IconCreditCard,
  IconMinus,
  IconPlus,
  IconReceipt2,
  IconSearch,
  IconSearchOff,
  IconShoppingCart,
  IconTrash,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { CountryCode } from "libphonenumber-js";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import { formatCurrency } from "../../utils/formatCurrency";
import { getClientByIdentifier } from "../../services/clientService";
import {
  DEFAULT_CLIENT_FORM_CONFIG,
  type ClientFieldConfig,
} from "../../services/organizationService";
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

// Miniatura optimizada vía transformaciones de ImageKit (encaja en 600×600 sin
// recortar; el recorte visual final lo hace el CSS del contenedor 1:1). Si la
// URL ya trae parámetros o no es de ImageKit, se usa tal cual.
const storeImageSrc = (url: string) =>
  url.includes("ik.imagekit.io") && !url.includes("?")
    ? `${url}?tr=w-600,h-600,c-at_max`
    : url;

// Búsqueda tolerante a tildes y mayúsculas.
const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Valor centinela del chip "Todas" (evita colisión con una categoría real).
const ALL_CATEGORIES = "__all__";

// Estilos de presentación: hover de tarjetas de producto y estado activo de las
// tarjetas de opción del checkout. Solo CSS, sin listeners de JS.
const STORE_STYLES = `
  .store-product-card {
    transition: transform 160ms ease, box-shadow 160ms ease;
  }
  .store-product-img {
    transition: transform 300ms ease;
  }
  @media (hover: hover) {
    .store-product-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--mantine-shadow-md);
    }
    .store-product-card:hover .store-product-img {
      transform: scale(1.04);
    }
  }
  .store-option-card {
    transition: border-color 120ms ease, background-color 120ms ease;
  }
  .store-option-card[data-checked] {
    border-color: var(--mantine-primary-color-filled);
    background-color: var(--mantine-primary-color-light);
  }
`;

// Tienda pública de productos: catálogo + carrito local + checkout con
// Mercado Pago, transferencia (comprobante) o pago contra entrega.
export default function PublicStorePage() {
  const navigate = useNavigate();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const orgCountry = (organization?.default_country || "CO") as CountryCode;
  const storeEnabled = !!organization?.storeEnabled;
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("COP");
  const [mpConnected, setMpConnected] = useState(false);
  const [receiptMethods, setReceiptMethods] = useState<ReceiptPaymentMethod[]>([]);
  const [codEnabled, setCodEnabled] = useState(false);
  const [products, setProducts] = useState<StoreProduct[]>([]);

  // ── Búsqueda y filtro por categoría (client-side) ──────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);

  // ── Carrito (estado local) ─────────────────────────────────────────────────
  const [cart, setCart] = useState<StoreCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // ── Config del formulario de cliente (igual que reservas/paquetes) ─────────
  const rawConfig = organization?.clientFormConfig;
  const identifierField: "phone" | "email" | "documentId" =
    rawConfig?.identifierField ?? DEFAULT_CLIENT_FORM_CONFIG.identifierField;
  const configFields: ClientFieldConfig[] =
    rawConfig?.fields?.length ? rawConfig.fields : DEFAULT_CLIENT_FORM_CONFIG.fields;
  const fieldCfg = (key: ClientFieldConfig["key"]) =>
    configFields.find((f) => f.key === key) ?? { key, enabled: false, required: false };
  const phoneCfg = fieldCfg("phone");
  const emailCfg = fieldCfg("email");
  const documentIdCfg = fieldCfg("documentId");

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
    // Feedback al agregar el primer ítem: guía hacia el botón flotante.
    if (cart.length === 0) {
      notifications.show({
        message: "Producto agregado. Revisa tu pedido en el botón del carrito.",
        icon: <IconShoppingCart size={16} />,
        autoClose: 2500,
        withBorder: true,
      });
    }
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
    setDeliveryMode("pickup");
    setAddress("");
    setDeliveryNotes("");
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
        },
        delivery: {
          mode: deliveryMode,
          address: deliveryMode === "delivery" ? address.trim() : undefined,
          notes: deliveryNotes.trim() || undefined,
        },
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
      <Group gap="xs">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">
          Buscando por {IDENTIFIER_LABELS[identifierField]}...
        </Text>
      </Group>
    ) : foundName ? (
      <Group gap="xs">
        <Text size="xs" c="dimmed">
          Cliente encontrado:
        </Text>
        <Badge variant="light" size="sm">
          {foundName}
        </Badge>
      </Group>
    ) : null;

  // Vías de pago disponibles (nota informativa del carrito).
  const payHints: { Icon: typeof IconCreditCard; label: string }[] = [];
  if (hasMp) payHints.push({ Icon: IconCreditCard, label: "Mercado Pago" });
  if (hasReceipt) payHints.push({ Icon: IconReceipt2, label: "Transferencia" });
  if (hasCod) payHints.push({ Icon: IconCash, label: "Contraentrega" });

  // Encabezado de la tienda (se reutiliza en el estado de carga).
  const headerBlock = (
    <Stack gap={6} align="center">
      <ThemeIcon size={56} radius="xl" variant="light">
        <IconBuildingStore size={32} />
      </ThemeIcon>
      {organization?.name && (
        <Text size="sm" fw={600} c="dimmed" tt="uppercase" lts={1} ta="center">
          {organization.name}
        </Text>
      )}
      <Title order={1} size="h2" ta="center">
        Tienda
      </Title>
      <Text c="dimmed" ta="center" maw={520}>
        Elige tus productos, arma tu pedido y págalo en línea o al recibirlo.
      </Text>
    </Stack>
  );

  // ── Tienda deshabilitada ─────────────────────────────────────────────────
  if (organization && !storeEnabled) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="md" mt={60}>
          <ThemeIcon size={72} radius="xl" variant="light" color="gray">
            <IconBuildingStore size={44} />
          </ThemeIcon>
          <Title order={3} ta="center">
            La tienda no está disponible
          </Title>
          <Text c="dimmed" ta="center">
            Este negocio no tiene la tienda en línea activa por el momento.
          </Text>
          <Button variant="light" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </Stack>
      </Container>
    );
  }

  // ── Cargando: skeletons de tarjetas ──────────────────────────────────────
  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {headerBlock}
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing={{ base: "sm", sm: "lg" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} withBorder radius="lg" padding={isMobile ? "sm" : "lg"}>
                <Card.Section>
                  <AspectRatio ratio={1}>
                    <Skeleton radius={0} />
                  </AspectRatio>
                </Card.Section>
                <Stack gap="xs" mt="md">
                  <Skeleton height={14} width="75%" radius="sm" />
                  <Skeleton height={10} width="95%" radius="sm" />
                  <Skeleton height={22} width="55%" radius="sm" />
                  <Skeleton height={34} radius="md" />
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  // ── Pedido contraentrega confirmado ──────────────────────────────────────
  if (codConfirmation) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="lg" mt={40}>
          <ThemeIcon size={96} radius="xl" color="teal" variant="light">
            <IconCircleCheck size={60} />
          </ThemeIcon>
          <Stack align="center" gap="xs">
            <Title order={2} ta="center">
              ¡Pedido recibido!
            </Title>
            <Text c="dimmed" ta="center" maw={440}>
              El negocio te contactará para coordinar la entrega. Pagas al
              recibir tu pedido.
            </Text>
          </Stack>

          <Paper withBorder radius="lg" p="lg" w="100%">
            <Text fw={700} mb="sm">
              Resumen del pedido
            </Text>
            <Stack gap={6}>
              {codConfirmation.items.map((i) => (
                <Group key={i.product._id} justify="space-between" wrap="nowrap">
                  <Text size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>
                    {i.quantity}× {i.product.name}
                  </Text>
                  <Text size="sm" fw={500}>
                    {formatCurrency(i.product.salePrice * i.quantity, currency)}
                  </Text>
                </Group>
              ))}
              <Divider my={4} />
              <Group justify="space-between">
                <Text fw={700}>Total</Text>
                <Text fw={800} size="lg">
                  {formatCurrency(codConfirmation.total, currency)}
                </Text>
              </Group>
              <Group gap="xs" mt={4}>
                <Badge
                  variant="light"
                  leftSection={
                    codConfirmation.deliveryMode === "delivery" ? (
                      <IconTruckDelivery size={12} />
                    ) : (
                      <IconBuildingStore size={12} />
                    )
                  }
                >
                  {codConfirmation.deliveryMode === "delivery"
                    ? "Envío a domicilio"
                    : "Recoger en el local"}
                </Badge>
                <Badge variant="light" color="orange">
                  Pago contra entrega
                </Badge>
              </Group>
              {codConfirmation.address && (
                <Text size="sm" c="dimmed">
                  Dirección: {codConfirmation.address}
                </Text>
              )}
            </Stack>
          </Paper>

          <Button
            variant="light"
            size="md"
            leftSection={<IconBuildingStore size={18} />}
            onClick={() => setCodConfirmation(null)}
          >
            Seguir comprando
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <style>{STORE_STYLES}</style>

      <Stack gap="xl">
        {/* ── Encabezado + búsqueda + categorías ── */}
        <Stack gap="md">
          {headerBlock}

          {products.length > 0 && (
            <Stack gap="sm">
              <TextInput
                placeholder="Buscar productos..."
                aria-label="Buscar productos"
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                radius="md"
                size="md"
                maw={480}
                w="100%"
                mx="auto"
              />
              {categories.length >= 2 && (
                <Chip.Group
                  multiple={false}
                  value={categoryFilter}
                  onChange={(v) => setCategoryFilter(v || ALL_CATEGORIES)}
                >
                  <Group gap="xs" justify="center">
                    <Chip value={ALL_CATEGORIES} size="sm" radius="xl">
                      Todas
                    </Chip>
                    {categories.map((c) => (
                      <Chip key={c} value={c} size="sm" radius="xl">
                        {c}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              )}
            </Stack>
          )}
        </Stack>

        {!canPay && products.length > 0 && (
          <Alert icon={<IconAlertCircle size={18} />} color="yellow" variant="light">
            Los pedidos en línea no están disponibles en este momento. Comunícate
            con el negocio para comprar.
          </Alert>
        )}

        {/* ── Catálogo ── */}
        {products.length === 0 ? (
          <Center mih="30vh">
            <Stack align="center" gap="sm">
              <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                <IconBuildingStore size={36} />
              </ThemeIcon>
              <Text fw={600}>Aún no hay productos disponibles</Text>
              <Text size="sm" c="dimmed" ta="center">
                Vuelve pronto: el negocio está preparando su catálogo.
              </Text>
            </Stack>
          </Center>
        ) : filteredProducts.length === 0 ? (
          <Center mih="30vh">
            <Stack align="center" gap="sm">
              <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                <IconSearchOff size={36} />
              </ThemeIcon>
              <Text fw={600}>No encontramos productos</Text>
              <Text size="sm" c="dimmed" ta="center">
                Prueba con otra búsqueda o cambia de categoría.
              </Text>
              <Button
                variant="light"
                size="xs"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter(ALL_CATEGORIES);
                }}
              >
                Limpiar filtros
              </Button>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing={{ base: "sm", sm: "lg" }}>
            {filteredProducts.map((product) => {
              const qty = cartQty(product._id);
              return (
                <Card
                  key={product._id}
                  withBorder
                  radius="lg"
                  padding={isMobile ? "sm" : "lg"}
                  className="store-product-card"
                >
                  {/* Imagen (o placeholder) siempre presente: mantiene las
                      tarjetas alineadas aunque solo algunos productos la tengan.
                      Área 1:1 (estándar de producto) para minimizar recortes. */}
                  <Card.Section style={{ position: "relative", overflow: "hidden" }}>
                    <AspectRatio ratio={1}>
                      {product.imageUrl ? (
                        <Image
                          className="store-product-img"
                          src={storeImageSrc(product.imageUrl)}
                          alt={product.name}
                          fit="cover"
                          style={
                            product.outOfStock
                              ? { filter: "grayscale(1) opacity(0.6)" }
                              : undefined
                          }
                        />
                      ) : (
                        <Center
                          className="store-product-img"
                          bg="var(--mantine-color-gray-1)"
                          style={
                            product.outOfStock
                              ? { filter: "grayscale(1) opacity(0.6)" }
                              : undefined
                          }
                        >
                          <IconBuildingStore
                            size={44}
                            color="var(--mantine-color-gray-5)"
                          />
                        </Center>
                      )}
                    </AspectRatio>
                    {product.category && (
                      <Badge
                        size="sm"
                        variant="white"
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          boxShadow: "var(--mantine-shadow-xs)",
                        }}
                      >
                        {product.category}
                      </Badge>
                    )}
                    {product.outOfStock && (
                      <Center style={{ position: "absolute", inset: 0 }}>
                        <Badge size="lg" color="dark" variant="filled">
                          Agotado
                        </Badge>
                      </Center>
                    )}
                  </Card.Section>

                  <Stack gap={6} mt="md" style={{ flexGrow: 1 }}>
                    {product.brand && (
                      <Text
                        size="xs"
                        c="dimmed"
                        tt="uppercase"
                        fw={600}
                        lts={0.5}
                        lineClamp={1}
                      >
                        {product.brand}
                      </Text>
                    )}
                    <Text fw={600} lineClamp={1}>
                      {product.name}
                    </Text>
                    {product.description && (
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {product.description}
                      </Text>
                    )}

                    <Text size="xl" fw={800} mt="auto" pt={6}>
                      {formatCurrency(product.salePrice, currency)}
                    </Text>

                    {qty === 0 ? (
                      <Button
                        fullWidth
                        variant="light"
                        radius="md"
                        leftSection={<IconShoppingCart size={16} />}
                        disabled={!!product.outOfStock || !canPay}
                        onClick={() => addToCart(product)}
                      >
                        Agregar
                      </Button>
                    ) : (
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="light"
                          size="lg"
                          radius="md"
                          aria-label="Quitar uno"
                          onClick={() => changeQty(product._id, -1)}
                        >
                          <IconMinus size={16} />
                        </ActionIcon>
                        <Text fw={700} ta="center" style={{ flex: 1 }}>
                          {qty}
                        </Text>
                        <ActionIcon
                          variant="light"
                          size="lg"
                          radius="md"
                          aria-label="Agregar uno"
                          onClick={() => changeQty(product._id, 1)}
                        >
                          <IconPlus size={16} />
                        </ActionIcon>
                      </Group>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>

      {/* ── Botón flotante del carrito ── */}
      {cart.length > 0 && (
        <Affix position={{ bottom: 20, right: 20 }} zIndex={150}>
          <Button
            size="md"
            radius="xl"
            leftSection={<IconShoppingCart size={18} />}
            rightSection={
              <Badge size="sm" variant="white" circle>
                {itemCount}
              </Badge>
            }
            style={{ boxShadow: "var(--mantine-shadow-lg)" }}
            onClick={() => setCartOpen(true)}
          >
            {formatCurrency(total, currency)}
          </Button>
        </Affix>
      )}

      {/* ── Carrito (Drawer) ── */}
      <Drawer
        opened={cartOpen}
        onClose={() => setCartOpen(false)}
        position="right"
        size={isMobile ? "100%" : 420}
        title={
          <Group gap="xs">
            <IconShoppingCart size={20} />
            <Text fw={700}>Tu pedido</Text>
          </Group>
        }
      >
        {cart.length === 0 ? (
          <Stack align="center" gap="sm" py="xl">
            <ThemeIcon size={64} radius="xl" variant="light" color="gray">
              <IconShoppingCart size={36} />
            </ThemeIcon>
            <Text fw={600}>Tu carrito está vacío</Text>
            <Text size="sm" c="dimmed" ta="center">
              Agrega productos del catálogo para armar tu pedido.
            </Text>
            <Button variant="light" size="xs" onClick={() => setCartOpen(false)}>
              Ver productos
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            <Stack gap="sm">
              {cart.map((i) => (
                <Group key={i.product._id} wrap="nowrap" align="flex-start" gap="sm">
                  {i.product.imageUrl ? (
                    <Image
                      src={storeImageSrc(i.product.imageUrl)}
                      alt={i.product.name}
                      w={48}
                      h={48}
                      radius="md"
                      fit="cover"
                      style={{ flexShrink: 0 }}
                    />
                  ) : (
                    <Center
                      w={48}
                      h={48}
                      bg="var(--mantine-color-gray-1)"
                      style={{
                        borderRadius: "var(--mantine-radius-md)",
                        flexShrink: 0,
                      }}
                    >
                      <IconBuildingStore
                        size={22}
                        color="var(--mantine-color-gray-5)"
                      />
                    </Center>
                  )}
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {i.product.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatCurrency(i.product.salePrice, currency)} c/u
                    </Text>
                    <Group gap={6} mt={6} wrap="nowrap">
                      <ActionIcon
                        variant="light"
                        size="sm"
                        radius="md"
                        aria-label="Quitar uno"
                        onClick={() => changeQty(i.product._id, -1)}
                      >
                        <IconMinus size={12} />
                      </ActionIcon>
                      <Text size="sm" fw={600} w={24} ta="center">
                        {i.quantity}
                      </Text>
                      <ActionIcon
                        variant="light"
                        size="sm"
                        radius="md"
                        aria-label="Agregar uno"
                        onClick={() => changeQty(i.product._id, 1)}
                      >
                        <IconPlus size={12} />
                      </ActionIcon>
                    </Group>
                  </Box>
                  <Stack gap={4} align="flex-end">
                    <Text size="sm" fw={700}>
                      {formatCurrency(i.product.salePrice * i.quantity, currency)}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      aria-label="Quitar del carrito"
                      onClick={() => removeFromCart(i.product._id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Stack>
                </Group>
              ))}
            </Stack>

            <Divider />

            <Group justify="space-between" align="center">
              <Text fw={600}>Total</Text>
              <Text fw={800} size="xl">
                {formatCurrency(total, currency)}
              </Text>
            </Group>

            <Button
              fullWidth
              size="md"
              leftSection={<IconShoppingCart size={18} />}
              disabled={!canPay}
              onClick={() => {
                setCartOpen(false);
                openCheckout();
              }}
            >
              Hacer pedido
            </Button>

            {payHints.length > 0 && (
              <Group gap="md" justify="center">
                {payHints.map(({ Icon, label }) => (
                  <Group key={label} gap={4} wrap="nowrap">
                    <Icon size={14} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                      {label}
                    </Text>
                  </Group>
                ))}
              </Group>
            )}
          </Stack>
        )}
      </Drawer>

      {/* ── Modal de checkout ── */}
      <Modal
        opened={checkoutOpen}
        onClose={closeCheckout}
        title={<Text fw={700}>Completar pedido</Text>}
        centered
        size="lg"
        radius="lg"
      >
        <Stack gap="md">
          <Divider label="Tus datos" labelPosition="left" />

          {/* Identificador configurado por la organización (siempre primero) */}
          {identifierField === "phone" && (
            <Stack gap={6}>
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
            </Stack>
          )}
          {identifierField === "email" && (
            <Stack gap={6}>
              <TextInput
                label={emailCfg.label || IDENTIFIER_LABELS.email}
                placeholder="Ingresa tu correo"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.currentTarget.value)}
                onBlur={handleEmailBlur}
                error={emailError}
                required
                disabled={isLookingUp}
              />
              <LookupFeedback />
            </Stack>
          )}
          {identifierField === "documentId" && (
            <Stack gap={6}>
              <TextInput
                label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
                placeholder="Cédula, pasaporte, etc."
                value={form.documentId}
                onChange={(e) => setField("documentId", e.currentTarget.value)}
                onBlur={handleDocumentIdBlur}
                required
                disabled={isLookingUp}
              />
              <LookupFeedback />
            </Stack>
          )}

          {/* Nombre (siempre) */}
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
              placeholder="opcional"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.currentTarget.value)}
              onBlur={handleEmailBlur}
              error={emailError}
              required={emailCfg.required}
            />
          )}

          <Divider label="Entrega" labelPosition="left" />

          {/* Modalidad de entrega */}
          <Radio.Group
            value={deliveryMode}
            onChange={(v) => setDeliveryMode(v as DeliveryMode)}
            aria-label="Modalidad de entrega"
          >
            <Group grow gap="sm" align="stretch">
              <Radio.Card
                value="pickup"
                radius="md"
                p="sm"
                className="store-option-card"
              >
                <Stack gap={6} align="center" ta="center">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    <IconBuildingStore size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={600}>
                      Retiro en local
                    </Text>
                    <Text size="xs" c="dimmed">
                      Recoges tu pedido en el negocio
                    </Text>
                  </div>
                </Stack>
              </Radio.Card>
              <Radio.Card
                value="delivery"
                radius="md"
                p="sm"
                className="store-option-card"
              >
                <Stack gap={6} align="center" ta="center">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    <IconTruckDelivery size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={600}>
                      Domicilio
                    </Text>
                    <Text size="xs" c="dimmed">
                      Te lo llevamos a tu dirección
                    </Text>
                  </div>
                </Stack>
              </Radio.Card>
            </Group>
          </Radio.Group>
          {deliveryMode === "delivery" && (
            <Textarea
              label="Dirección de entrega"
              placeholder="Calle, número, barrio, referencias..."
              required
              value={address}
              onChange={(e) => setAddress(e.currentTarget.value)}
              minRows={2}
              autosize
            />
          )}
          <Textarea
            label="Notas para el pedido"
            placeholder="Información adicional (opcional)"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.currentTarget.value)}
            minRows={2}
            autosize
          />

          <Divider label="Pago" labelPosition="left" />

          {/* Vía de pago (solo las disponibles) */}
          <Radio.Group
            value={payMethod ?? ""}
            onChange={(v) => setPayMethod(v as PayMethod)}
            aria-label="Vía de pago"
          >
            <Stack gap="xs">
              {hasMp && (
                <Radio.Card
                  value="mp"
                  radius="md"
                  p="sm"
                  className="store-option-card"
                >
                  <Group wrap="nowrap" gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md">
                      <IconCreditCard size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={600}>
                        Mercado Pago
                      </Text>
                      <Text size="xs" c="dimmed">
                        Paga online con tarjeta o saldo
                      </Text>
                    </div>
                    <Radio.Indicator />
                  </Group>
                </Radio.Card>
              )}
              {hasReceipt && (
                <Radio.Card
                  value="receipt"
                  radius="md"
                  p="sm"
                  className="store-option-card"
                >
                  <Group wrap="nowrap" gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md">
                      <IconReceipt2 size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={600}>
                        Transferencia
                      </Text>
                      <Text size="xs" c="dimmed">
                        Sube tu comprobante
                      </Text>
                    </div>
                    <Radio.Indicator />
                  </Group>
                </Radio.Card>
              )}
              {hasCod && (
                <Radio.Card
                  value="cod"
                  radius="md"
                  p="sm"
                  className="store-option-card"
                >
                  <Group wrap="nowrap" gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md">
                      <IconCash size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={600}>
                        Contraentrega
                      </Text>
                      <Text size="xs" c="dimmed">
                        Paga al recibir o recoger
                      </Text>
                    </div>
                    <Radio.Indicator />
                  </Group>
                </Radio.Card>
              )}
            </Stack>
          </Radio.Group>

          <Divider label="Resumen" labelPosition="left" />

          {/* Resumen compacto del pedido */}
          <Paper withBorder radius="md" p="sm">
            <Stack gap={4}>
              {cart.map((i) => (
                <Group key={i.product._id} justify="space-between" wrap="nowrap">
                  <Text size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>
                    {i.quantity}× {i.product.name}
                  </Text>
                  <Text size="sm" fw={500}>
                    {formatCurrency(i.product.salePrice * i.quantity, currency)}
                  </Text>
                </Group>
              ))}
              <Divider my={4} />
              <Group justify="space-between">
                <Text fw={700}>Total</Text>
                <Text fw={800}>{formatCurrency(total, currency)}</Text>
              </Group>
            </Stack>
          </Paper>

          {formError && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
              {formError}
            </Alert>
          )}

          <Button
            fullWidth
            size="md"
            loading={submitting}
            leftSection={<IconShoppingCart size={16} />}
            onClick={handleOrder}
          >
            {payMethod === "cod"
              ? "Confirmar pedido"
              : `Pagar ${formatCurrency(total, currency)}`}
          </Button>
          <Text size="xs" c="dimmed" ta="center">
            {payMethod === "mp" &&
              "Serás redirigido a Mercado Pago para completar el pago de forma segura."}
            {payMethod === "receipt" &&
              "A continuación verás los datos para realizar tu pago y subir el comprobante."}
            {payMethod === "cod" &&
              "Pagas al recibir tu pedido. El negocio te contactará para coordinar la entrega."}
          </Text>
        </Stack>
      </Modal>
    </Container>
  );
}
