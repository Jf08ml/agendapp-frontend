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
  List,
  ThemeIcon,
  Loader,
  Center,
  Alert,
  Modal,
  TextInput,
  Textarea,
  Divider,
  SegmentedControl,
} from "@mantine/core";
import {
  IconCheck,
  IconPackage,
  IconClock,
  IconAlertCircle,
  IconShoppingCart,
  IconGift,
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
import {
  listPublicPackages,
  createPackageCheckout,
  createReceiptPackageCheckout,
  type PublicPackageItem,
  type ReceiptPaymentMethod,
} from "../../services/collectionService";

interface CustomerForm {
  name: string;
  phone: string;
  phone_e164: string;
  phone_country: string;
  email: string;
  documentId: string;
  birthDate: string;
  notes: string;
}

const emptyCustomer = (): CustomerForm => ({
  name: "",
  phone: "",
  phone_e164: "",
  phone_country: "CO",
  email: "",
  documentId: "",
  birthDate: "",
  notes: "",
});

const IDENTIFIER_LABELS: Record<string, string> = {
  phone: "Teléfono",
  email: "Correo electrónico",
  documentId: "Número de documento",
};

const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const hasTiers = (pkg: PublicPackageItem | null) => (pkg?.tiers?.length ?? 0) > 0;

const minTierPrice = (pkg: PublicPackageItem) =>
  Math.min(...(pkg.tiers || []).map((t) => t.price));

// Página pública para que un cliente compre un paquete y lo pague online (MP).
// El ClientPackage se crea cuando el webhook confirma el pago.
export default function PublicPackagePurchasePage() {
  const navigate = useNavigate();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const orgCountry = (organization?.default_country || "CO") as CountryCode;

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("COP");
  const [mpConnected, setMpConnected] = useState(false);
  const [receiptMethods, setReceiptMethods] = useState<ReceiptPaymentMethod[]>([]);
  const [packages, setPackages] = useState<PublicPackageItem[]>([]);

  // ── Config del formulario de cliente (igual que reservas/clases) ───────────
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
  const birthDateCfg = fieldCfg("birthDate");
  const notesCfg = fieldCfg("notes");

  // ── Modal de compra ────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<PublicPackageItem | null>(null);
  const [tierId, setTierId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyCustomer());
  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [foundName, setFoundName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const setField = (field: keyof CustomerForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!organization?._id) return;
    (async () => {
      setLoading(true);
      const res = await listPublicPackages(organization._id);
      if (res) {
        setCurrency(res.currency);
        setMpConnected(res.mpConnected);
        setReceiptMethods(res.paymentMethods || []);
        setPackages(res.packages || []);
      }
      setLoading(false);
    })();
  }, [organization?._id]);

  const selectedTier = selected?.tiers?.find((t) => t._id === tierId) || null;
  const selectedPrice = hasTiers(selected)
    ? selectedTier?.price ?? 0
    : selected?.price ?? 0;

  const openBuy = (pkg: PublicPackageItem) => {
    setSelected(pkg);
    setTierId(pkg.tiers?.[0]?._id || null);
    setForm(emptyCustomer());
    setPhoneValid(false);
    setPhoneError(null);
    setEmailError(null);
    setFoundName(null);
    setFormError(null);
  };

  const closeBuy = () => {
    if (submitting) return;
    setSelected(null);
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

  const handleBuy = async () => {
    if (!organization?._id || !selected) return;
    if (!form.name.trim()) {
      setFormError("Ingresa tu nombre.");
      return;
    }
    // Validar el identificador configurado.
    if (identifierField === "phone" && (!form.phone_e164 || !phoneValid)) {
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
    if (hasTiers(selected) && !tierId) {
      setFormError("Selecciona un nivel del paquete.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const checkoutPayload = {
        organizationId: organization._id,
        servicePackageId: selected._id,
        customerDetails: {
          name: form.name.trim(),
          phone: form.phone_e164 || form.phone,
          email: form.email.trim() || undefined,
          documentId: form.documentId.trim() || undefined,
          birthDate: form.birthDate || undefined,
          notes: form.notes.trim() || undefined,
        },
        ...(hasTiers(selected) ? { tierId: tierId! } : {}),
      };

      // MP (automático) si está conectado y no se prefiere transferencia; si no,
      // transferencia + comprobante.
      const prefersReceipt = organization.depositPreferredMethod === "receipt";
      const goMp = mpConnected && !(prefersReceipt && receiptMethods.length > 0);
      if (goMp) {
        const checkout = await createPackageCheckout(checkoutPayload);
        if (checkout?.checkoutUrl) {
          window.location.href = checkout.checkoutUrl;
          return; // navegamos fuera; el webhook activa el paquete al pagar
        }
        setFormError("No se pudo iniciar el pago. Intenta de nuevo.");
        return;
      }

      const checkout = await createReceiptPackageCheckout(checkoutPayload);
      if (checkout) {
        navigate("/pago/comprobante", {
          state: {
            externalReference: checkout.externalReference,
            amount: checkout.amount,
            currency: checkout.currency,
            paymentMethods: checkout.paymentMethods,
            orderType: "package",
          },
        });
        return;
      }
      setFormError("No se pudo iniciar el pago. Intenta de nuevo.");
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

  if (loading) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    );
  }

  const canPay = mpConnected || receiptMethods.length > 0;
  const willUseMp =
    mpConnected &&
    !(organization?.depositPreferredMethod === "receipt" && receiptMethods.length > 0);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xs" mb="lg" align="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="violet">
          <IconPackage size={32} />
        </ThemeIcon>
        <Title order={2} ta="center">
          Paquetes disponibles
        </Title>
        <Text c="dimmed" ta="center" maw={520}>
          Compra un paquete de sesiones y págalo en línea. Lo activamos
          automáticamente al confirmar tu pago.
        </Text>
      </Stack>

      {!canPay && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="yellow"
          variant="light"
          mb="md"
        >
          La compra en línea no está disponible en este momento. Comunícate con el
          negocio para adquirir un paquete.
        </Alert>
      )}

      {packages.length === 0 ? (
        <Center mih="30vh">
          <Text c="dimmed">No hay paquetes disponibles por ahora.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {packages.map((pkg) => {
            const tiered = hasTiers(pkg);
            return (
              <Card key={pkg._id} withBorder radius="md" padding="lg">
                <Stack gap="sm" h="100%">
                  <Stack gap={4}>
                    <Text fw={600} size="lg">
                      {pkg.name}
                    </Text>
                    {pkg.description && (
                      <Text size="sm" c="dimmed" lineClamp={3}>
                        {pkg.description}
                      </Text>
                    )}
                  </Stack>

                  <Group gap="xs">
                    <Text fw={700} size="xl">
                      {tiered
                        ? `Desde ${formatCurrency(minTierPrice(pkg), currency)}`
                        : formatCurrency(pkg.price ?? 0, currency)}
                    </Text>
                  </Group>

                  {tiered && (
                    <Group gap={6}>
                      {pkg.tiers!.map((t) => (
                        <Badge key={t._id} variant="outline" color="violet" size="sm">
                          {t.label}
                        </Badge>
                      ))}
                    </Group>
                  )}

                  <Badge
                    variant="light"
                    color="gray"
                    leftSection={<IconClock size={12} />}
                  >
                    Vigencia {pkg.validityDays} días
                  </Badge>

                  <List
                    spacing={4}
                    size="sm"
                    center
                    icon={
                      <ThemeIcon color="teal" size={16} radius="xl">
                        <IconCheck size={11} />
                      </ThemeIcon>
                    }
                  >
                    {(pkg.services || []).map((s, i) => (
                      <List.Item key={`s-${i}`}>
                        {tiered
                          ? s.serviceId?.name || "Servicio"
                          : `${s.sessionsIncluded}× ${s.serviceId?.name || "Servicio"}`}
                      </List.Item>
                    ))}
                    {(pkg.classes || []).map((c, i) => (
                      <List.Item key={`c-${i}`}>
                        {tiered
                          ? c.classId?.name || "Clase"
                          : `${c.sessionsIncluded}× ${c.classId?.name || "Clase"}`}
                      </List.Item>
                    ))}
                  </List>

                  <Button
                    mt="auto"
                    fullWidth
                    leftSection={<IconShoppingCart size={16} />}
                    disabled={!canPay}
                    onClick={() => openBuy(pkg)}
                  >
                    Comprar
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Modal opened={!!selected} onClose={closeBuy} title="Completar compra" centered>
        {selected && (
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>{selected.name}</Text>
              <Text fw={700}>{formatCurrency(selectedPrice, currency)}</Text>
            </Group>

            {hasTiers(selected) && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>Nivel</Text>
                <SegmentedControl
                  fullWidth
                  value={tierId || undefined}
                  onChange={setTierId}
                  data={(selected.tiers || []).map((t) => ({
                    value: t._id,
                    label: t.label,
                  }))}
                />
                {selectedTier && (
                  <Group gap={6} align="center">
                    <Text size="xs" c="dimmed">
                      {selectedTier.sessionsIncluded} sesiones
                      {!!selectedTier.courtesySessions &&
                        ` + ${selectedTier.courtesySessions} de cortesía`}
                    </Text>
                    {!!selectedTier.courtesySessions && (
                      <IconGift size={14} color="var(--mantine-color-violet-6)" />
                    )}
                  </Group>
                )}
              </Stack>
            )}

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

            {/* Campos secundarios habilitados (distintos al identificador) */}
            {phoneCfg.enabled && identifierField !== "phone" && (
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
                required={phoneCfg.required}
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
            {documentIdCfg.enabled && identifierField !== "documentId" && (
              <TextInput
                label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
                placeholder="Cédula, pasaporte, etc."
                value={form.documentId}
                onChange={(e) => setField("documentId", e.currentTarget.value)}
                required={documentIdCfg.required}
              />
            )}
            {birthDateCfg.enabled && (
              <TextInput
                label={birthDateCfg.label || "Fecha de nacimiento"}
                type="date"
                value={form.birthDate}
                onChange={(e) => setField("birthDate", e.currentTarget.value)}
                required={birthDateCfg.required}
              />
            )}
            {notesCfg.enabled && (
              <Textarea
                label={notesCfg.label || "Notas"}
                placeholder="Información adicional..."
                value={form.notes}
                onChange={(e) => setField("notes", e.currentTarget.value)}
                required={notesCfg.required}
                minRows={2}
                autosize
              />
            )}

            {formError && (
              <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
                {formError}
              </Alert>
            )}

            <Button
              fullWidth
              loading={submitting}
              leftSection={<IconShoppingCart size={16} />}
              onClick={handleBuy}
            >
              Pagar {formatCurrency(selectedPrice, currency)}
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              {willUseMp
                ? "Serás redirigido a Mercado Pago para completar el pago de forma segura."
                : "A continuación verás los datos para realizar tu pago y subir el comprobante."}
            </Text>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
