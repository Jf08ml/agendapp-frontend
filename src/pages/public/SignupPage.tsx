// Registro de un negocio nuevo en la plataforma (rediseño, RegistroPlataforma):
// pantalla de AgenditApp sin marca de negocio (color --platform). Paso 1 «Tus
// datos», paso 2 «Tu negocio» con la dirección del panel validada en vivo y,
// al final, «Tu cuenta está lista» con el enlace de acceso. En escritorio, a la
// derecha, «Cómo funciona» y «Estamos contigo».
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { Button, Loader, PasswordInput, Select, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "../../utils/zodResolver";
import { suggestEmailFix } from "../../utils/emailTypo";
import { z } from "zod";
import { IconBrandWhatsapp, IconCheck, IconCopy, IconInfoCircle, IconLink, IconUserCheck, IconX } from "@tabler/icons-react";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import { type CountryCode } from "libphonenumber-js";
import {
  checkSlugAvailability,
  registerOrganization,
  captureSignupAttribution,
  clearSignupAttribution,
  getAgentPublicInfo,
} from "../../services/registrationService";
import { getPostSignupRedirectUrl } from "../../utils/domainUtils";
import { RECOVER_ACCESS_PATH, panelLoginUrl } from "../../utils/panelAccess";
import { detectSignupCountry, resolveSignupRegion } from "../../utils/signupRegion";
import { getCountryData } from "../../utils/geoData";
import { loadMetaPixel, registrationMetaEvent, trackRegistroIniciado, trackRegistroCompletado, trackContactApp } from "../../utils/metaPixel";

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
  referralCode: z.string().optional(),
  businessVertical: z.string().optional(),
});

// Rubros del negocio — pre-cargan un catálogo de servicios de ejemplo en el onboarding
const BUSINESS_VERTICALS = [
  { value: "barberia", label: "Barbería" },
  { value: "unas", label: "Uñas / Manicure" },
  { value: "salon", label: "Salón de belleza / Peluquería" },
  { value: "spa", label: "Spa / Masajes" },
  { value: "estetica", label: "Estética / Skincare" },
  { value: "consultorio", label: "Consultorio / Salud" },
  { value: "clases", label: "Clases / Academia" },
  { value: "mascotas", label: "Peluquería de mascotas" },
  { value: "otro", label: "Otro" },
];

// País/zona horaria/moneda se derivan del país del teléfono + la zona del
// navegador (utils/signupRegion.ts). Antes estaba fijo en Colombia.
const INITIAL_COUNTRY = detectSignupCountry();
const INITIAL_REGION = resolveSignupRegion(INITIAL_COUNTRY);

type SignupFormValues = z.infer<typeof signupSchema>;

const SUPPORT_WA_BASE = "https://wa.me/573506674686";

// Pantalla completa sobre el shell (la ruta /signup no carga negocio).
const SIGNUP_STYLES = `
  .su-root { position: fixed; inset: 0; z-index: 9999; overflow-y: auto; background: var(--surface-muted); color: var(--ink); }
  .su-top { height: 60px; display: flex; align-items: center; padding: 0 24px; background: var(--surface); border-bottom: 1px solid var(--line); }
  .su-main { max-width: 1000px; margin: 0 auto; padding: 32px 16px 48px; display: grid; gap: 24px; align-items: start; }
  @media (min-width: 62em) { .su-main { grid-template-columns: minmax(0, 520px) minmax(0, 1fr); padding-top: 48px; gap: 40px; } }
  .su-card { padding: 24px; box-shadow: var(--shadow-sm); }
  @media (min-width: 48em) { .su-card { padding: 32px; } }
  .su-h1 { margin: 0; font: 600 24px/30px var(--font-sans); letter-spacing: -.015em; }
  .su-aside { display: flex; flex-direction: column; gap: 16px; }
  .su-how { display: none; }
  @media (min-width: 62em) { .su-how { display: block; padding-top: 8px; } }
  .su-steps { list-style: none; counter-reset: su; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
  .su-steps li { counter-increment: su; display: grid; grid-template-columns: 32px 1fr; column-gap: 12px; font-size: 14px; line-height: 20px; }
  .su-steps li::before { content: counter(su); grid-row: span 2; width: 32px; height: 32px; border-radius: 999px; background: var(--surface-raised); border: 1px solid var(--line-strong); display: grid; place-items: center; font-weight: 600; font-variant-numeric: tabular-nums; }
  .su-steps b { font-size: 15px; }
  .su-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line-strong); border-radius: var(--radius-md); background: var(--surface-muted); font-size: 14px; }
  .su-suffix { font-size: 13px; color: var(--ink-subtle); white-space: nowrap; padding-right: 10px; }
  .su-textbtn { border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: var(--platform); cursor: pointer; }
  .su-textbtn--muted { color: var(--ink-muted); font-weight: 500; }
`;

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"personal" | "business">("personal");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  // Correo que la persona confirmó que está bien pese a la sugerencia.
  const [emailTypoAck, setEmailTypoAck] = useState<string | null>(null);
  const [emailTypoWarn, setEmailTypoWarn] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ displayUrl: string; redirectUrl: string; email: string } | null>(null);
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const [countdown, setCountdown] = useState(10);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance>(null);
  const tokenResolverRef = useRef<((t: string) => void) | null>(null);
  // Cloudflare pidió marcar la casilla: el widget queda visible y no se resetea.
  const turnstileInteractiveRef = useRef(false);

  const [agentName, setAgentName] = useState<string | null>(null);

  const supportWaUrl = useMemo(() => {
    if (!agentName) return SUPPORT_WA_BASE;
    const msg = `Hola, me estoy registrando en AgenditApp invitado por ${agentName}`;
    return `${SUPPORT_WA_BASE}?text=${encodeURIComponent(msg)}`;
  }, [agentName]);

  const form = useForm<SignupFormValues>({
    validate: zodResolver(signupSchema),
    initialValues: {
      slug: "",
      businessName: "",
      ownerName: "",
      email: "",
      password: "",
      phone: "",
      default_country: INITIAL_REGION.default_country,
      timezone: INITIAL_REGION.timezone,
      currency: INITIAL_REGION.currency,
      referralCode: "",
      businessVertical: "",
    },
  });

  const emailSuggestion = useMemo(() => suggestEmailFix(form.values.email), [form.values.email]);

  const personalStepSchema = z.object({
    ownerName: z.string().min(2, "Mínimo 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    phone: z.string().min(7, "Teléfono inválido"),
  });

  const goToBusinessStep = () => {
    const result = personalStepSchema.safeParse({
      ownerName: form.values.ownerName,
      email: form.values.email,
      password: form.values.password,
      phone: form.values.phone,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      form.setErrors(fieldErrors);
      return;
    }
    form.clearErrors();
    // Correo con el dominio mal escrito (gamil.com, hotmial.com…): la bienvenida
    // rebota y no podría recuperar su cuenta por correo. Se pregunta una vez.
    if (suggestEmailFix(form.values.email) && emailTypoAck !== form.values.email) {
      setEmailTypoWarn(true);
      return;
    }
    setStep("business");
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

  // Meta Pixel: Evento 2 "Registro Iniciado" al entrar a la página (solo Pixel, sin CAPI)
  useEffect(() => {
    loadMetaPixel();
    trackRegistroIniciado();
  }, []);

  // Auto-fill referral code from ?ref= URL param or sessionStorage + fetch agent name.
  // Se usa sessionStorage (no localStorage) para que la atribución dure solo la
  // sesión/visita actual y no quede un código viejo colgado indefinidamente.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get("ref");
    const code = refParam
      ? refParam.toUpperCase()
      : sessionStorage.getItem("signup_referral_code") ?? null;

    if (code) {
      form.setFieldValue("referralCode", code);
      if (refParam) sessionStorage.setItem("signup_referral_code", code);
      // Fetch agent name silently
      getAgentPublicInfo(code)
        .then((info) => { if (info.found && info.name) setAgentName(info.name); })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!successInfo) return;
    if (countdown === 0) { window.location.href = successInfo.redirectUrl; return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [successInfo, countdown]);

  // Atribución de campañas: UTM/fbclid con los que llegó desde la landing.
  const [attribution] = useState(() => captureSignupAttribution(window.location.search));

  const handleSubmit = async (values: SignupFormValues) => {
    setError(null);
    setEmailTaken(false);
    setIsSubmitting(true);
    try {
      let token = turnstileToken;
      if (!token && turnstileRef.current && !turnstileInteractiveRef.current) {
        token = await new Promise<string>((resolve, reject) => {
          tokenResolverRef.current = resolve;
          const t = setTimeout(() => { tokenResolverRef.current = null; reject(new Error("turnstile_timeout")); }, 8000);
          tokenResolverRef.current = (tok: string) => { clearTimeout(t); resolve(tok); };
          turnstileRef.current?.execute();
        }).catch(() => "");
      }
      if (!token) {
        if (turnstileInteractiveRef.current) {
          // Resetear borraría la casilla que la persona tiene que marcar.
          setError("Marca la casilla de verificación de abajo y vuelve a tocar Crear cuenta.");
        } else {
          setError("No pudimos verificar que eres una persona. Intenta de nuevo.");
          turnstileRef.current?.reset?.(); setTurnstileToken("");
        }
        setIsSubmitting(false); return;
      }
      // El backend envía el CompleteRegistration a Meta (CAPI) al crear la cuenta;
      // el Pixel usa el mismo event_id para que Meta lo cuente una sola vez.
      const metaEvent = registrationMetaEvent();
      const result = await registerOrganization({
        slug: values.slug.toLowerCase(), businessName: values.businessName,
        ownerName: values.ownerName, email: values.email, password: values.password,
        phone: values.phone, turnstileToken: token,
        default_country: values.default_country || undefined,
        timezone: values.timezone || undefined, currency: values.currency || undefined,
        referralCode: values.referralCode || undefined,
        businessVertical: values.businessVertical || undefined,
        attribution,
        metaEvent,
      });
      sessionStorage.removeItem("signup_referral_code");
      clearSignupAttribution();
      // Evento 3 "Registro Completado" — solo tras la confirmación del backend
      trackRegistroCompletado(metaEvent.event_id);
      const redirectUrl = getPostSignupRedirectUrl(values.slug.toLowerCase(), result.exchangeCode);
      // La raíz del subdominio es la página pública de reservas: el enlace que
      // se guarda para volver a entrar es el del login.
      const displayUrl = panelLoginUrl(values.slug.toLowerCase());
      setSuccessInfo({ displayUrl, redirectUrl, email: values.email.trim().toLowerCase() });
      setIsSubmitting(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; data?: { reason?: string } } } };
      if (axiosErr.response?.status === 409 && axiosErr.response.data?.data?.reason === "email_taken") {
        // La cuenta ya existe (a menudo: se registró, salió del navegador de
        // Instagram/Facebook y volvió a intentarlo). Explicar cómo entrar.
        setEmailTaken(true);
        setIsSubmitting(false); turnstileRef.current?.reset?.(); setTurnstileToken("");
        return;
      }
      setError(axiosErr.response?.data?.message || "No pudimos crear la cuenta. Intenta de nuevo.");
      setIsSubmitting(false); turnstileRef.current?.reset?.(); setTurnstileToken("");
    }
  };

  const slugRightSection = () => {
    if (slugStatus === "checking") return <Loader size={14} />;
    if (slugStatus === "available") return <IconCheck size={16} color="var(--success)" />;
    if (slugStatus === "taken" || slugStatus === "invalid") return <IconX size={16} color="var(--danger)" />;
    return null;
  };

  const slugError =
    form.errors.slug ||
    (slugStatus === "taken" ? "Este nombre ya está en uso" : slugStatus === "invalid" ? "Solo letras minúsculas, sin números, guiones ni espacios." : null);

  const copyLink = async () => {
    if (!successInfo) return;
    // Algunos navegadores integrados (WebView de Android) no exponen
    // navigator.clipboard o lo rechazan.
    try {
      await navigator.clipboard.writeText(successInfo.displayUrl);
      setCopied("ok");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(null), 4000);
  };

  const stepIdx = step === "personal" ? 0 : 1;

  const supportCard = (
    <div className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 15 }}>Estamos contigo</b>
      <div className="ag-muted" style={{ fontSize: 14 }}>
        ¿Dudas para registrarte? Escríbenos y te ayudamos a dejar tu agenda lista.
      </div>
      <Button
        component="a"
        href={supportWaUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="default"
        leftSection={<IconBrandWhatsapp size={16} />}
        onClick={() => trackContactApp()}
        style={{ alignSelf: "flex-start" }}
      >
        Escribir por WhatsApp
      </Button>
    </div>
  );

  return (
    <div className="su-root">
      <style>{SIGNUP_STYLES}</style>

      <header className="su-top">
        <img src="/images/logo-text.png" alt="AgenditApp" style={{ height: 28, width: "auto" }} />
      </header>

      <main className="su-main">
        <section className="ag-card su-card">
          {successInfo ? (
            <div className="ag-stack" style={{ gap: 16, alignItems: "center", textAlign: "center" }}>
              <span style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--success-soft)", color: "var(--success)" }}>
                <IconCheck size={28} />
              </span>
              <div>
                <h1 className="su-h1">Tu cuenta está lista</h1>
                <div className="ag-muted" style={{ fontSize: 14, marginTop: 6 }}>
                  Este es el enlace de tu panel. Para volver a entrar, ábrelo e inicia sesión con <b style={{ color: "var(--ink)" }}>{successInfo.email}</b> y la
                  contraseña que creaste. También te lo enviamos a tu correo y a tu WhatsApp.
                </div>
              </div>

              <div style={{ width: "100%", textAlign: "left" }}>
                <div className="ag-subtle" style={{ marginBottom: 6 }}>Tu enlace de acceso</div>
                <div className="su-link">
                  <IconLink size={16} style={{ flex: "none", color: "var(--ink-muted)" }} />
                  <span style={{ flex: 1, minWidth: 0, wordBreak: "break-all", userSelect: "text", fontWeight: 600 }}>{successInfo.displayUrl}</span>
                  <Button size="xs" variant="default" leftSection={copied === "ok" ? <IconCheck size={14} /> : <IconCopy size={14} />} onClick={copyLink}>
                    {copied === "ok" ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                {copied === "ok" && <div style={{ fontSize: 13, color: "var(--success)", marginTop: 6 }}>¡Enlace copiado!</div>}
                {copied === "failed" && <div style={{ fontSize: 13, color: "var(--warning)", marginTop: 6 }}>No se pudo copiar aquí. Mantén presionado el enlace para copiarlo.</div>}
              </div>

              <Button fullWidth size="md" color="var(--platform)" onClick={() => (window.location.href = successInfo.redirectUrl)}>
                Ingresar a mi panel
              </Button>
              <div className="ag-subtle">Te llevamos a tu panel en {countdown} s.</div>
            </div>
          ) : (
            <form onSubmit={form.onSubmit(handleSubmit)} className="ag-stack" style={{ gap: 16 }} noValidate>
              <div>
                <div className="ag-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                  <b>{stepIdx === 0 ? "Tus datos" : "Tu negocio"}</b>
                  <span className="ag-subtle">Paso {stepIdx + 1} de 2</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: "var(--surface-hover)", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ width: `${(stepIdx + 1) * 50}%`, height: "100%", background: "var(--platform)", transition: "width 160ms ease" }} />
                </div>
              </div>

              <div>
                <h1 className="su-h1">{stepIdx === 0 ? "Crea tu cuenta" : "Cuéntanos de tu negocio"}</h1>
                <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
                  {stepIdx === 0 ? "Empieza gratis. Tu agenda queda lista en minutos." : "Con esto armamos tu panel y su dirección."}
                </div>
              </div>

              {agentName && (
                <div className="ag-alert ag-alert--success">
                  <IconUserCheck size={20} />
                  <div>
                    <b>Invitado por {agentName}</b>
                    <div style={{ fontSize: 13 }}>Gracias por confiar en AgenditApp. Tu período de prueba está listo para comenzar.</div>
                  </div>
                </div>
              )}

              {emailTaken && (
                <div className="ag-alert ag-alert--warning">
                  <IconInfoCircle size={20} />
                  <div>
                    <b>Ya tienes una cuenta con este correo</b>
                    <div style={{ fontSize: 13 }}>
                      No necesitas registrarte de nuevo. Entra con el enlace del correo o del WhatsApp de bienvenida.{" "}
                      <Link to={RECOVER_ACCESS_PATH} className="ag-link">
                        Recuperar acceso
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {step === "personal" ? (
                <>
                  <TextInput label="Tu nombre" placeholder="Juan Pérez" required autoComplete="name" {...form.getInputProps("ownerName")} />
                  <div>
                    <TextInput
                      label="Correo electrónico"
                      placeholder="tu@correo.com"
                      type="email"
                      required
                      autoComplete="email"
                      {...form.getInputProps("email")}
                      onChange={(e) => {
                        form.getInputProps("email").onChange(e);
                        setEmailTypoWarn(false);
                      }}
                    />
                    {emailSuggestion && emailTypoAck !== form.values.email && (
                      <div className={emailTypoWarn ? "ag-alert ag-alert--warning" : undefined} style={{ marginTop: 6, fontSize: 13, padding: emailTypoWarn ? "8px 12px" : 0, display: "block" }}>
                        ¿Quisiste decir <b>{emailSuggestion}</b>?{" "}
                        <button
                          type="button"
                          className="su-textbtn"
                          onClick={() => {
                            form.setFieldValue("email", emailSuggestion);
                            setEmailTypoWarn(false);
                          }}
                        >
                          Sí, corregir
                        </button>
                        {" · "}
                        <button
                          type="button"
                          className="su-textbtn su-textbtn--muted"
                          onClick={() => {
                            setEmailTypoAck(form.values.email);
                            setEmailTypoWarn(false);
                          }}
                        >
                          No, está bien
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <InternationalPhoneInput
                      label="WhatsApp"
                      required
                      compact
                      placeholder="300 000 0000"
                      value={form.values.phone}
                      defaultCountry={INITIAL_COUNTRY as CountryCode}
                      onChange={(e164, phoneCountry) => {
                        form.setFieldValue("phone", e164 || "");
                        // El país del teléfono define la configuración regional del negocio
                        if (phoneCountry && phoneCountry !== form.values.default_country) {
                          const region = resolveSignupRegion(phoneCountry);
                          form.setFieldValue("default_country", region.default_country);
                          form.setFieldValue("timezone", region.timezone);
                          form.setFieldValue("currency", region.currency);
                        }
                      }}
                      error={form.errors.phone as string | undefined}
                    />
                    {form.values.phone && form.values.default_country && (
                      <div className="ag-subtle" style={{ marginTop: 4 }}>
                        {getCountryData(form.values.default_country)?.label ?? form.values.default_country} · {form.values.currency} ·{" "}
                        {form.values.timezone?.replace(/_/g, " ")}. Puedes cambiarlo después.
                      </div>
                    )}
                  </div>
                  <PasswordInput label="Contraseña" placeholder="Mínimo 6 caracteres" required autoComplete="new-password" {...form.getInputProps("password")} />

                  <Button type="button" fullWidth size="md" color="var(--platform)" onClick={goToBusinessStep}>
                    Continuar
                  </Button>
                  <div className="ag-subtle" style={{ textAlign: "center" }}>
                    ¿Ya tienes cuenta?{" "}
                    <Link to={RECOVER_ACCESS_PATH} className="ag-link">
                      Entrar a mi panel
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <TextInput
                    label="Nombre del negocio"
                    placeholder="Mi salón de belleza"
                    required
                    value={form.values.businessName}
                    onChange={(e) => handleBusinessNameChange(e.currentTarget.value)}
                    error={form.errors.businessName}
                  />
                  <Select
                    label="Tipo de negocio"
                    placeholder="Elige tu rubro"
                    description="Cargamos servicios de ejemplo de tu rubro para que arranques más rápido."
                    value={form.values.businessVertical || null}
                    onChange={(v) => form.setFieldValue("businessVertical", v ?? "")}
                    data={BUSINESS_VERTICALS}
                    comboboxProps={{ zIndex: 10001 }}
                  />
                  <div>
                    <TextInput
                      label="Dirección de tu panel"
                      description="Es la dirección para entrar a tu panel, no tu página pública."
                      placeholder="misalon"
                      required
                      value={form.values.slug}
                      onChange={(e) => handleSlugChange(e.currentTarget.value)}
                      error={slugError}
                      rightSection={<span className="su-suffix">.agenditapp.com</span>}
                      rightSectionWidth={128}
                    />
                    {form.values.slug && slugStatus !== "invalid" && slugStatus !== "taken" && (
                      <div className="ag-row" style={{ gap: 6, marginTop: 6, fontSize: 13 }}>
                        {slugRightSection()}
                        <span className="ag-num" style={{ fontWeight: 600 }}>{form.values.slug}.agenditapp.com</span>
                        {slugStatus === "available" && <span style={{ color: "var(--success)" }}>Disponible</span>}
                        {slugStatus === "checking" && <span className="ag-subtle">Revisando…</span>}
                      </div>
                    )}
                    {slugSuggestions.length > 0 && (
                      <div className="ag-row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        <span className="ag-subtle">Disponibles:</span>
                        {slugSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="ag-chip"
                            style={{ cursor: "pointer", height: 28 }}
                            onClick={() => {
                              form.setFieldValue("slug", s);
                              checkSlug(s);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Turnstile
                    ref={turnstileRef}
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    // Antes era size "invisible": un contenedor de 0×0 px. Cuando Cloudflare
                    // pedía marcar la casilla (VPN, navegador de Instagram/Facebook,
                    // varios intentos), nadie podía verla y el registro fallaba a los 8 s.
                    // "interaction-only" la muestra solo cuando hace falta.
                    options={{ size: "flexible", appearance: "interaction-only" }}
                    onBeforeInteractive={() => { turnstileInteractiveRef.current = true; }}
                    onAfterInteractive={() => { turnstileInteractiveRef.current = false; }}
                    onSuccess={(token) => {
                      turnstileInteractiveRef.current = false;
                      setTurnstileToken(token);
                      setError(null);
                      tokenResolverRef.current?.(token);
                      tokenResolverRef.current = null;
                    }}
                    onExpire={() => setTurnstileToken("")}
                    onError={(code) => { console.warn("Turnstile error", code); setTurnstileToken(""); }}
                  />

                  {error && (
                    <div className="ag-alert ag-alert--danger">
                      <IconInfoCircle size={20} />
                      <div>{error}</div>
                    </div>
                  )}

                  <div className="ag-row" style={{ gap: 8, flexWrap: "nowrap" }}>
                    <Button type="button" variant="subtle" color="gray" onClick={() => setStep("personal")} disabled={isSubmitting}>
                      Atrás
                    </Button>
                    <Button
                      type="submit"
                      size="md"
                      color="var(--platform)"
                      style={{ flex: 1 }}
                      loading={isSubmitting}
                      disabled={slugStatus === "taken" || slugStatus === "invalid"}
                    >
                      Crear cuenta
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </section>

        {/* Escritorio: cómo funciona + soporte. En móvil solo el soporte, debajo. */}
        <aside className="su-aside">
          <div className="su-how">
            <h2 className="ag-h" style={{ margin: "0 0 12px" }}>Cómo funciona</h2>
            <ol className="su-steps">
              <li>
                <b>Creas tu cuenta</b>
                <span className="ag-muted">Tus datos, tu negocio y la dirección de tu panel.</span>
              </li>
              <li>
                <b>Entras a tu panel</b>
                <span className="ag-muted">Te llevamos directo, con servicios de ejemplo de tu rubro.</span>
              </li>
              <li>
                <b>Empiezas a agendar</b>
                <span className="ag-muted">Configura horarios, conecta tu WhatsApp y comparte tu enlace de reservas.</span>
              </li>
            </ol>
          </div>
          {supportCard}
        </aside>
      </main>
    </div>
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
