import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import {
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Group,
  Loader,
  Alert,
  Anchor,
  Box,
  Image,
  ThemeIcon,
  ActionIcon,
  Select,
  SimpleGrid,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "../../utils/zodResolver";
import { z } from "zod";
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconRocket,
  IconCalendar,
  IconArrowRight,
  IconUser,
  IconBuildingStore,
  IconLink,
  IconBrandWhatsapp,
  IconGlobe,
  IconClock,
  IconCurrencyDollar,
  IconCopy,
} from "@tabler/icons-react";
import { getAllCountries, getAllTimezones, getAllCurrencies } from "../../utils/geoData";
import { detectUserCountry } from "../../utils/phoneUtils";
import {
  checkSlugAvailability,
  registerOrganization,
} from "../../services/registrationService";
import { getPostSignupRedirectUrl } from "../../utils/domainUtils";

const signupSchema = z.object({
  slug: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(63, "Máximo 63 caracteres")
    .regex(
      /^[a-z]{3,63}$/,
      "Solo letras minúsculas, sin números, guiones ni espacios.",
    ),
  businessName: z.string().min(2, "Mínimo 2 caracteres"),
  ownerName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  phone: z.string().min(7, "Teléfono inválido"),
  default_country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  AR: "ARS", BO: "BOB", BR: "BRL", CL: "CLP", CO: "COP",
  CR: "CRC", CU: "CUP", DO: "DOP", EC: "USD", GT: "GTQ",
  HN: "HNL", MX: "MXN", NI: "NIO", PA: "PAB", PE: "PEN",
  PY: "PYG", SV: "USD", UY: "UYU", VE: "VES",
  CA: "CAD", US: "USD",
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR",
  ES: "EUR", FI: "EUR", FR: "EUR", GR: "EUR", HR: "EUR",
  IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR", LV: "EUR",
  MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
  GB: "GBP", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
  PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON",
  JP: "JPY", CN: "CNY", KR: "KRW", IN: "INR", SG: "SGD",
  HK: "HKD", TW: "TWD", TH: "THB", MY: "MYR", PH: "PHP",
  ID: "IDR", AE: "AED", SA: "SAR", IL: "ILS", TR: "TRY",
  AU: "AUD", NZ: "NZD", ZA: "ZAR", NG: "NGN", KE: "KES",
  EG: "EGP", GH: "GHS",
};

type SignupFormValues = z.infer<typeof signupSchema>;

const SUPPORT_WA_URL = "https://wa.me/573184345284";
const SUPPORT_AUTO_COLLAPSE_MS = 3000;

// Inputs compactos sobre panel oscuro
const INPUT_SM: React.CSSProperties = {
  background: "#FFFFFF",
  color: "#334155",
  borderColor: "rgba(255,255,255,0.18)",
  borderRadius: 7,
  fontSize: 13,
  height: 34,
};

const inputStyles = {
  input: INPUT_SM,
  label: { marginBottom: 3, color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600 },
} as const;

const selectStyles = {
  input: INPUT_SM,
  label: { marginBottom: 3, color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600 },
  dropdown: {
    background: "#16286b",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  option: { color: "rgba(255,255,255,0.88)", fontSize: 13 },
} as const;

function RLabel({ children }: { children: React.ReactNode }) {
  return (
    <Group gap={3} wrap="nowrap">
      <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600 }}>
        {children}
      </span>
      <span style={{ color: "#EF4444", fontWeight: 800, fontSize: 11 }}>*</span>
    </Group>
  );
}

function SecHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Group justify="space-between" align="center" mt={12} mb={2}>
      <Text
        size="xs"
        fw={700}
        tt="uppercase"
        style={{ color: "rgba(255,255,255,0.50)", letterSpacing: 1, fontSize: 10 }}
      >
        {label}
      </Text>
      <ThemeIcon size={26} radius="lg" variant="light" color="blue">
        {icon}
      </ThemeIcon>
    </Group>
  );
}

function detectRegionalDefaults() {
  const timezone = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota"; }
    catch { return "America/Bogota"; }
  })();
  const country = detectUserCountry();
  const currency = COUNTRY_CURRENCY_MAP[country] ?? "USD";
  return { timezone, country, currency };
}

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ displayUrl: string; redirectUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance>(null);
  const tokenResolverRef = useRef<((t: string) => void) | null>(null);

  const [supportState, setSupportState] = useState<"expanded" | "collapsed" | "hidden">("expanded");
  const supportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const countryData = useMemo(() => getAllCountries().map((c) => ({ value: c.value, label: c.label })), []);
  const timezoneData = useMemo(() => getAllTimezones().map((tz) => ({ value: tz.value, label: tz.label })), []);
  const currencyData = useMemo(() => getAllCurrencies().map((c) => ({ value: c.value, label: c.label })), []);
  const regionalDefaults = useMemo(() => detectRegionalDefaults(), []);

  const form = useForm<SignupFormValues>({
    validate: zodResolver(signupSchema),
    initialValues: {
      slug: "",
      businessName: "",
      ownerName: "",
      email: "",
      password: "",
      phone: "",
      default_country: regionalDefaults.country,
      timezone: regionalDefaults.timezone,
      currency: regionalDefaults.currency,
    },
  });

  const handleCountryChange = (value: string | null) => {
    form.setFieldValue("default_country", value ?? "");
    if (value && COUNTRY_CURRENCY_MAP[value] && !form.isDirty("currency")) {
      form.setFieldValue("currency", COUNTRY_CURRENCY_MAP[value]);
    }
  };

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugStatus("idle"); setSlugSuggestions([]); return; }
    setSlugStatus("checking");
    try {
      const result = await checkSlugAvailability(slug.toLowerCase());
      if (result.available) {
        setSlugStatus("available"); setSlugSuggestions([]);
      } else {
        setSlugStatus(result.reason === "invalid_format" ? "invalid" : "taken");
        setSlugSuggestions(result.suggestions || []);
      }
    } catch { setSlugStatus("idle"); }
  }, []);

  const handleBusinessNameChange = (value: string) => {
    form.setFieldValue("businessName", value);
    const currentAuto = slugifyName(form.values.businessName);
    if (!form.values.slug || form.values.slug === currentAuto) {
      const newSlug = slugifyName(value);
      form.setFieldValue("slug", newSlug);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => checkSlug(newSlug), 300);
    }
  };

  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
    form.setFieldValue("slug", normalized);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => checkSlug(normalized), 300);
  };

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  useEffect(() => {
    if (supportTimer.current) clearTimeout(supportTimer.current);
    if (supportState === "expanded") {
      supportTimer.current = setTimeout(() => setSupportState("collapsed"), SUPPORT_AUTO_COLLAPSE_MS);
    }
    return () => { if (supportTimer.current) clearTimeout(supportTimer.current); };
  }, [supportState]);

  useEffect(() => {
    if (!successInfo) return;
    if (countdown === 0) { window.location.href = successInfo.redirectUrl; return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [successInfo, countdown]);

  const handleSubmit = async (values: SignupFormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      let token = turnstileToken;
      if (!token && turnstileRef.current) {
        token = await new Promise<string>((resolve, reject) => {
          tokenResolverRef.current = resolve;
          const t = setTimeout(() => { tokenResolverRef.current = null; reject(new Error("turnstile_timeout")); }, 8000);
          tokenResolverRef.current = (tok: string) => { clearTimeout(t); resolve(tok); };
          turnstileRef.current?.execute();
        }).catch(() => "");
      }
      if (!token) {
        setError("Verificación de captcha fallida. Intenta de nuevo.");
        turnstileRef.current?.reset?.(); setTurnstileToken(""); setIsSubmitting(false); return;
      }
      const result = await registerOrganization({
        slug: values.slug.toLowerCase(), businessName: values.businessName,
        ownerName: values.ownerName, email: values.email, password: values.password,
        phone: values.phone, turnstileToken: token,
        default_country: values.default_country || undefined,
        timezone: values.timezone || undefined, currency: values.currency || undefined,
      });
      const redirectUrl = getPostSignupRedirectUrl(values.slug.toLowerCase(), result.exchangeCode);
      const displayUrl = `https://${values.slug.toLowerCase()}.agenditapp.com`;
      setSuccessInfo({ displayUrl, redirectUrl });
      setIsSubmitting(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Error al crear la cuenta. Intenta de nuevo.");
      setIsSubmitting(false); turnstileRef.current?.reset?.(); setTurnstileToken("");
    }
  };

  const slugRightSection = () => {
    if (slugStatus === "checking") return <Loader size="xs" color="white" />;
    if (slugStatus === "available") return <IconCheck size={14} style={{ color: "#10B981" }} />;
    if (slugStatus === "taken" || slugStatus === "invalid") return <IconX size={14} style={{ color: "#EF4444" }} />;
    return null;
  };

  const slugHelpText = form.values.slug && slugStatus !== "invalid" ? `${form.values.slug}.agenditapp.com` : "";

  return (
    <>
      <style>{`
        .sp-grid {
          display: flex;
          height: 100%;
        }
        .sp-left {
          width: 44%;
          flex-shrink: 0;
          overflow-y: auto;
          padding: 36px 40px;
          background: linear-gradient(155deg, #EEF4FF 0%, #DCE9FF 60%, #C3D4F8 100%);
          display: flex;
          flex-direction: column;
        }
        .sp-right {
          flex: 1;
          overflow-y: auto;
          padding: 28px 36px 48px;
          background: #192f6e;
        }
        .sp-features { display: flex; flex-direction: column; gap: 18px; flex: 1; }
        @media (max-width: 900px) {
          .sp-root  { overflow: hidden auto !important; }
          .sp-grid  { flex-direction: column; height: auto; min-height: 100%; }
          .sp-left  { width: 100%; height: auto; padding: 22px 18px; overflow-y: visible; }
          .sp-right { height: auto; padding: 22px 18px 48px; overflow-y: visible; }
          .sp-features { display: none; }
        }
      `}</style>

      <Box className="sp-root" style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden" }}>
        <div className="sp-grid">

          {/* ── LEFT ── */}
          <div className="sp-left">
            <Image src="/images/logo-text.png" alt="AgenditApp" w={130} fit="contain" style={{ marginBottom: 28 }} />

            <Title
              order={1}
              style={{ color: "#0F172A", letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 24, fontSize: "clamp(1.6rem, 2.6vw, 2.2rem)" }}
            >
              Crea tu panel con tu{" "}
              <span style={{ color: "#1D4ED8", fontWeight: 900 }}>dirección web</span>{" "}
              en minutos.
            </Title>

            {/* Features — ocultas en mobile */}
            <div className="sp-features">
              {[
                {
                  icon: <IconRocket size={18} />,
                  color: "blue" as const,
                  label: "Cómo funciona",
                  items: [
                    "Creas tu organización y eliges tu URL.",
                    "Te redirigimos automáticamente al panel de tu negocio.",
                    "Empiezas a gestionar y agendar clientes desde tu panel.",
                  ],
                },
                {
                  icon: <IconBrandWhatsapp size={18} />,
                  color: "green" as const,
                  label: "Mensajes y recordatorios",
                  text: "Envía mensajes y recordatorios a tus clientes desde tu WhatsApp Business.",
                },
                {
                  icon: <IconCalendar size={18} />,
                  color: "blue" as const,
                  label: "Listo para operar",
                  text: "Al finalizar, tu panel queda activo en tu URL para configurar servicios, horarios y reservas.",
                },
              ].map(({ icon, color, label, items, text }) => (
                <Group key={label} align="flex-start" gap={12} wrap="nowrap">
                  <ThemeIcon radius="xl" size={38} variant="light" color={color} style={{ flexShrink: 0, marginTop: 1 }}>
                    {icon}
                  </ThemeIcon>
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" style={{ color: "#64748B", letterSpacing: 0.7, marginBottom: 4 }}>
                      {label}
                    </Text>
                    {items ? (
                      <Stack gap={3}>
                        {items.map((item) => (
                          <Group key={item} gap={7} wrap="nowrap" align="flex-start">
                            <IconArrowRight size={11} style={{ color: "#1D4ED8", flexShrink: 0, marginTop: 4 }} />
                            <Text size="sm" c="#334155" lh={1.5}>{item}</Text>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" c="#334155" lh={1.5}>{text}</Text>
                    )}
                  </Box>
                </Group>
              ))}
            </div>

            {/* CTA */}
            <Box style={{ marginTop: 28 }}>
              <Text fw={600} style={{ color: "#0F172A", fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", lineHeight: 1.4, marginBottom: 4 }}>
                Al finalizar,{" "}
                <span style={{ color: "#1D4ED8", fontWeight: 800 }}>podrás entrar desde el enlace de tu negocio</span>
              </Text>
              <Text size="sm" c="#64748B" mb={16}>Si necesitas ayuda, contáctanos.</Text>

              <Anchor href={SUPPORT_WA_URL} target="_blank" style={{ textDecoration: "none" }}>
                <Group
                  gap={10}
                  style={{
                    display: "inline-flex",
                    background: "#0F172A",
                    borderRadius: 40,
                    padding: "7px 20px 7px 7px",
                    cursor: "pointer",
                  }}
                >
                  <Box
                    style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "#25D366",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <IconBrandWhatsapp size={18} color="#FFFFFF" />
                  </Box>
                  <Text size="xs" fw={900} tt="uppercase" style={{ color: "#FFFFFF", letterSpacing: 1 }}>
                    Estamos contigo
                  </Text>
                </Group>
              </Anchor>
            </Box>
          </div>

          {/* ── RIGHT ── */}
          <div className="sp-right">
            {successInfo ? (
              <Stack align="center" justify="center" style={{ minHeight: "100%", textAlign: "center" }} gap={24} py={40}>
                <ThemeIcon size={72} radius="xl" variant="light" color="green">
                  <IconCheck size={40} />
                </ThemeIcon>

                <Box>
                  <Title order={3} style={{ color: "#FFFFFF", marginBottom: 8 }}>¡Tu cuenta fue creada!</Title>
                  <Text size="sm" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
                    Este es tu <strong style={{ color: "rgba(255,255,255,0.85)" }}>enlace permanente</strong> para acceder a tu panel.
                    Guárdalo o agrégalo a tus favoritos — siempre entrarás desde aquí.
                  </Text>
                </Box>

                <Box
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(96,165,250,0.35)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    width: "100%",
                    maxWidth: 420,
                  }}
                >
                  <Text size="xs" fw={700} tt="uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: 0.9, marginBottom: 10 }}>
                    Tu enlace de acceso
                  </Text>
                  <Group justify="space-between" align="center" wrap="nowrap" gap={8}>
                    <Group gap={8} align="center" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <IconLink size={15} style={{ color: "#60A5FA", flexShrink: 0 }} />
                      <Text
                        fw={700}
                        style={{
                          color: "#93C5FD",
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {successInfo.displayUrl}
                      </Text>
                    </Group>
                    <ActionIcon
                      variant={copied ? "filled" : "subtle"}
                      color={copied ? "green" : "blue"}
                      size={36}
                      radius="md"
                      onClick={() => {
                        navigator.clipboard.writeText(successInfo.displayUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      }}
                      title="Copiar enlace"
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Group>
                  {copied && (
                    <Text size="xs" style={{ color: "#4ADE80", marginTop: 6, textAlign: "left" }}>
                      ¡Enlace copiado!
                    </Text>
                  )}
                </Box>

                <Button
                  size="md"
                  onClick={() => { window.location.href = successInfo.redirectUrl; }}
                  rightSection={<IconArrowRight size={16} />}
                  style={{ maxWidth: 420, width: "100%" }}
                  styles={{
                    root: {
                      backgroundColor: "#FFFFFF",
                      color: "#1D4ED8",
                      fontWeight: 900,
                      borderRadius: 10,
                      letterSpacing: 0.3,
                    },
                  }}
                >
                  Ingresar a mi panel
                </Button>

                <Text size="xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Redirigiendo automáticamente en {countdown}s…
                </Text>
              </Stack>
            ) : (
              <>
            {/* Top info */}
            <Group gap={20} mb={20} wrap="wrap">
              {[
                { icon: <IconLink size={12} />, label: "Acceso por enlace", desc: "Tu negocio tendrá una URL para entrar al panel." },
                { icon: <IconRocket size={12} />, label: "Crear panel", desc: "Completa los datos para generar tu URL." },
              ].map(({ icon, label, desc }) => (
                <Group key={label} gap={8} wrap="nowrap" align="flex-start">
                  <ThemeIcon size={24} radius="md" variant="light" color="blue">{icon}</ThemeIcon>
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" style={{ color: "rgba(255,255,255,0.85)", letterSpacing: 0.8, fontSize: 10 }}>{label}</Text>
                    <Text size="xs" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</Text>
                  </Box>
                </Group>
              ))}
            </Group>

            {/* Form */}
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack
                gap={8}
                style={{ "--mantine-color-placeholder": "rgba(100,116,139,0.9)" } as React.CSSProperties}
              >
                {error && (
                  <Alert icon={<IconAlertCircle size={14} />} title="Error" color="red" withCloseButton onClose={() => setError(null)} styles={{ root: { padding: "8px 12px" } }}>
                    {error}
                  </Alert>
                )}

                {/* ── Datos del negocio ── */}
                <SecHeader label="Datos del negocio" icon={<IconBuildingStore size={13} />} />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={8}>
                  <TextInput
                    label={<RLabel>Nombre del negocio</RLabel>}
                    placeholder="Mi Salón de Belleza"
                    value={form.values.businessName}
                    onChange={(e) => handleBusinessNameChange(e.currentTarget.value)}
                    error={form.errors.businessName}
                    styles={inputStyles}
                  />

                  <Box>
                    <TextInput
                      label={<RLabel>Dirección web</RLabel>}
                      placeholder="misalon"
                      value={form.values.slug}
                      onChange={(e) => handleSlugChange(e.currentTarget.value)}
                      error={
                        form.errors.slug ||
                        (slugStatus === "taken" && "Este nombre ya está en uso") ||
                        (slugStatus === "invalid" && "Solo letras minúsculas, sin números ni guiones")
                      }
                      rightSection={slugRightSection()}
                      styles={inputStyles}
                    />
                    {slugHelpText && (
                      <Box
                        mt={4} px={8} py={5}
                        style={{
                          background: slugStatus === "available" ? "rgba(16,185,129,0.10)" : "rgba(255,255,255,0.05)",
                          border: slugStatus === "available" ? "1px solid rgba(16,185,129,0.28)" : "1px solid rgba(255,255,255,0.10)",
                          borderRadius: 6,
                        }}
                      >
                        <Group gap={6} align="center">
                          {slugStatus === "available" && <IconCheck size={12} style={{ color: "#10B981", flexShrink: 0 }} />}
                          <Text size="xs" fw={700} style={{ color: "rgba(255,255,255,0.85)", fontSize: 11 }}>{slugHelpText}</Text>
                        </Group>
                      </Box>
                    )}
                    {slugSuggestions.length > 0 && (
                      <Group gap={6} mt={4} wrap="wrap">
                        <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Sugerencias:</Text>
                        {slugSuggestions.map((s) => (
                          <Anchor key={s} style={{ color: "#93C5FD", fontWeight: 700, fontSize: 11 }} onClick={() => { form.setFieldValue("slug", s); checkSlug(s); }}>
                            {s}
                          </Anchor>
                        ))}
                      </Group>
                    )}
                  </Box>
                </SimpleGrid>

                {/* ── Región ── */}
                <SecHeader label="Región" icon={<IconGlobe size={13} />} />

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={8}>
                  <Select
                    label={<RLabel>País</RLabel>}
                    placeholder="País"
                    leftSection={<IconGlobe size={13} style={{ color: "#64748B" }} />}
                    value={form.values.default_country ?? null}
                    onChange={handleCountryChange}
                    error={form.errors.default_country}
                    data={countryData}
                    searchable
                    comboboxProps={{ zIndex: 10001 }}
                    styles={selectStyles}
                  />
                  <Select
                    label={<RLabel>Zona horaria</RLabel>}
                    placeholder="Zona horaria"
                    leftSection={<IconClock size={13} style={{ color: "#64748B" }} />}
                    {...form.getInputProps("timezone")}
                    data={timezoneData}
                    searchable
                    comboboxProps={{ zIndex: 10001 }}
                    styles={selectStyles}
                  />
                  <Select
                    label={<RLabel>Moneda</RLabel>}
                    placeholder="Moneda"
                    leftSection={<IconCurrencyDollar size={13} style={{ color: "#64748B" }} />}
                    {...form.getInputProps("currency")}
                    data={currencyData}
                    searchable
                    comboboxProps={{ zIndex: 10001 }}
                    styles={selectStyles}
                  />
                </SimpleGrid>

                {/* ── Administrador ── */}
                <SecHeader label="Administrador" icon={<IconUser size={13} />} />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={8}>
                  <TextInput
                    label={<RLabel>Tu nombre</RLabel>}
                    placeholder="Juan Pérez"
                    leftSection={<IconUser size={13} style={{ color: "#64748B" }} />}
                    {...form.getInputProps("ownerName")}
                    styles={inputStyles}
                  />
                  <TextInput
                    label={<RLabel>Email</RLabel>}
                    placeholder="tu@email.com"
                    {...form.getInputProps("email")}
                    styles={inputStyles}
                  />
                  <TextInput
                    label={<RLabel>Teléfono</RLabel>}
                    placeholder="+57 300 123 4567"
                    {...form.getInputProps("phone")}
                    styles={inputStyles}
                  />
                  <PasswordInput
                    label={<RLabel>Contraseña</RLabel>}
                    placeholder="Mínimo 6 caracteres"
                    {...form.getInputProps("password")}
                    styles={inputStyles}
                  />
                </SimpleGrid>

                <Box mt={4}>
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    options={{ size: "invisible" }}
                    onSuccess={(token) => { setTurnstileToken(token); tokenResolverRef.current?.(token); tokenResolverRef.current = null; }}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  mt={6}
                  loading={isSubmitting}
                  disabled={slugStatus === "taken" || slugStatus === "invalid"}
                  styles={{
                    root: {
                      height: 40,
                      fontWeight: 900,
                      letterSpacing: 0.4,
                      backgroundColor: "#FFFFFF",
                      color: "#1D4ED8",
                      borderRadius: 9,
                    },
                  }}
                >
                  Crear cuenta
                </Button>

                <Text size="xs" ta="center" style={{ color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  Al finalizar podrás entrar desde el enlace de tu negocio.
                </Text>
              </Stack>
            </form>
            </>
            )}
          </div>
        </div>

        {/* Botón flotante WA — solo visible en mobile (panels apilados) */}
        {supportState !== "hidden" && (
          <Box style={{ position: "fixed", right: 14, bottom: 14, zIndex: 10 }}>
            {supportState === "collapsed" ? (
              <Group gap={6}>
                <ActionIcon
                  radius="xl" size={44} variant="filled" color="green"
                  component="a" href={SUPPORT_WA_URL} target="_blank"
                  aria-label="Soporte WhatsApp"
                >
                  <IconBrandWhatsapp size={22} />
                </ActionIcon>
                <ActionIcon
                  radius="xl" size={28} variant="subtle" color="gray"
                  style={{ background: "rgba(255,255,255,0.9)" }}
                  onClick={() => setSupportState("hidden")}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ) : null}
          </Box>
        )}
      </Box>
    </>
  );
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "")
    .slice(0, 63);
}
