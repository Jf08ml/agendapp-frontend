import { useEffect, useState } from "react";
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
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCircleCheck,
  IconMinus,
  IconPlus,
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

// Tienda pública de productos: catálogo + carrito local + checkout con
// Mercado Pago, transferencia (comprobante) o pago contra entrega.
export default function PublicStorePage() {
  const navigate = useNavigate();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const orgCountry = (organization?.default_country || "CO") as CountryCode;
  const storeEnabled = !!organization?.storeEnabled;

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("COP");
  const [mpConnected, setMpConnected] = useState(false);
  const [receiptMethods, setReceiptMethods] = useState<ReceiptPaymentMethod[]>([]);
  const [codEnabled, setCodEnabled] = useState(false);
  const [products, setProducts] = useState<StoreProduct[]>([]);

  // ── Carrito (estado local) ─────────────────────────────────────────────────
  const [cart, setCart] = useState<StoreCartItem[]>([]);

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

  // ── Carrito: helpers ───────────────────────────────────────────────────────
  const cartQty = (productId: string) =>
    cart.find((i) => i.product._id === productId)?.quantity ?? 0;

  const addToCart = (product: StoreProduct) => {
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

  if (loading) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    );
  }

  // ── Pedido contraentrega confirmado ──────────────────────────────────────
  if (codConfirmation) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="lg" mt={40}>
          <ThemeIcon size={80} radius="xl" color="teal" variant="light">
            <IconCircleCheck size={52} />
          </ThemeIcon>
          <Stack align="center" gap="xs">
            <Title order={2} ta="center">
              ¡Pedido recibido!
            </Title>
            <Text c="dimmed" ta="center">
              El negocio te contactará para coordinar la entrega. Pagas al
              recibir tu pedido.
            </Text>
          </Stack>

          <Card withBorder radius="md" p="md" w="100%">
            <Text fw={600} mb="sm">
              Resumen del pedido
            </Text>
            <Stack gap={6}>
              {codConfirmation.items.map((i) => (
                <Group key={i.product._id} justify="space-between" wrap="nowrap">
                  <Text size="sm">
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
                <Text fw={700}>{formatCurrency(codConfirmation.total, currency)}</Text>
              </Group>
              <Group gap="xs" mt={4}>
                <Badge
                  variant="light"
                  leftSection={<IconTruckDelivery size={12} />}
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
          </Card>

          <Button variant="light" onClick={() => setCodConfirmation(null)}>
            Volver a la tienda
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xs" mb="lg" align="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="teal">
          <IconBuildingStore size={32} />
        </ThemeIcon>
        <Title order={2} ta="center">
          Tienda
        </Title>
        <Text c="dimmed" ta="center" maw={520}>
          Elige tus productos, arma tu pedido y págalo en línea o al recibirlo.
        </Text>
      </Stack>

      {!canPay && products.length > 0 && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="yellow"
          variant="light"
          mb="md"
        >
          Los pedidos en línea no están disponibles en este momento. Comunícate
          con el negocio para comprar.
        </Alert>
      )}

      {products.length === 0 ? (
        <Center mih="30vh">
          <Text c="dimmed">No hay productos disponibles por ahora.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {products.map((product) => {
            const qty = cartQty(product._id);
            return (
              <Card key={product._id} withBorder radius="md" padding="lg">
                {/* Imagen (o placeholder) siempre presente: mantiene las
                    tarjetas alineadas aunque solo algunos productos la tengan.
                    Área 1:1 (estándar de producto) para minimizar recortes. */}
                <Card.Section>
                  <AspectRatio ratio={1}>
                    {product.imageUrl ? (
                      <Image
                        src={storeImageSrc(product.imageUrl)}
                        alt={product.name}
                        fit="cover"
                      />
                    ) : (
                      <Center bg="var(--mantine-color-gray-1)">
                        <IconBuildingStore
                          size={44}
                          color="var(--mantine-color-gray-5)"
                        />
                      </Center>
                    )}
                  </AspectRatio>
                </Card.Section>
                <Stack gap="sm" h="100%" mt="md">
                  <Stack gap={4}>
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Text fw={600} size="lg">
                        {product.name}
                      </Text>
                      {product.outOfStock && (
                        <Badge color="red" variant="light">
                          Agotado
                        </Badge>
                      )}
                    </Group>
                    <Group gap={6}>
                      {product.brand && (
                        <Badge variant="light" color="gray">
                          {product.brand}
                        </Badge>
                      )}
                      {product.category && (
                        <Badge variant="light" color="blue">
                          {product.category}
                        </Badge>
                      )}
                    </Group>
                    {product.description && (
                      <Text size="sm" c="dimmed" lineClamp={3}>
                        {product.description}
                      </Text>
                    )}
                  </Stack>

                  <Text fw={700} size="xl">
                    {formatCurrency(product.salePrice, currency)}
                  </Text>

                  {qty === 0 ? (
                    <Button
                      mt="auto"
                      fullWidth
                      leftSection={<IconShoppingCart size={16} />}
                      disabled={!!product.outOfStock || !canPay}
                      onClick={() => addToCart(product)}
                    >
                      Agregar
                    </Button>
                  ) : (
                    <Group mt="auto" justify="center" gap="sm">
                      <ActionIcon
                        variant="light"
                        size="lg"
                        aria-label="Quitar uno"
                        onClick={() => changeQty(product._id, -1)}
                      >
                        <IconMinus size={16} />
                      </ActionIcon>
                      <Text fw={600} w={32} ta="center">
                        {qty}
                      </Text>
                      <ActionIcon
                        variant="light"
                        size="lg"
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

      {/* ── Resumen del carrito ── */}
      {cart.length > 0 && (
        <Card withBorder radius="md" p="md" mt="xl">
          <Group gap="xs" mb="sm">
            <IconShoppingCart size={18} />
            <Text fw={600}>Tu pedido</Text>
          </Group>
          <Stack gap={8}>
            {cart.map((i) => (
              <Group key={i.product._id} justify="space-between" wrap="nowrap">
                <Text size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>
                  {i.quantity}× {i.product.name}
                </Text>
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500}>
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
                </Group>
              </Group>
            ))}
            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Total</Text>
              <Text fw={700} size="lg">
                {formatCurrency(total, currency)}
              </Text>
            </Group>
            <Button
              fullWidth
              size="md"
              leftSection={<IconShoppingCart size={18} />}
              disabled={!canPay}
              onClick={openCheckout}
            >
              Hacer pedido
            </Button>
          </Stack>
        </Card>
      )}

      {/* ── Modal de checkout ── */}
      <Modal opened={checkoutOpen} onClose={closeCheckout} title="Completar pedido" centered>
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>
              {cart.reduce((n, i) => n + i.quantity, 0)} producto(s)
            </Text>
            <Text fw={700}>{formatCurrency(total, currency)}</Text>
          </Group>
          <Divider />

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

          {/* Modalidad de entrega */}
          <Radio.Group
            label="Entrega"
            value={deliveryMode}
            onChange={(v) => setDeliveryMode(v as DeliveryMode)}
          >
            <Stack gap={6} mt={6}>
              <Radio value="pickup" label="Recoger en el local" />
              <Radio value="delivery" label="Envío a domicilio" />
            </Stack>
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

          {/* Vía de pago (solo las disponibles) */}
          <Radio.Group
            label="¿Cómo quieres pagar?"
            value={payMethod ?? ""}
            onChange={(v) => setPayMethod(v as PayMethod)}
          >
            <Stack gap={6} mt={6}>
              {hasMp && (
                <Radio value="mp" label="Pagar en línea con Mercado Pago" />
              )}
              {hasReceipt && (
                <Radio
                  value="receipt"
                  label="Transferencia (subes el comprobante)"
                />
              )}
              {hasCod && <Radio value="cod" label="Pago contra entrega" />}
            </Stack>
          </Radio.Group>

          {formError && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
              {formError}
            </Alert>
          )}

          <Button
            fullWidth
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
