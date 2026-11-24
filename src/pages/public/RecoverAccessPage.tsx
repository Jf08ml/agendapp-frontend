import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { Button, Loader, PasswordInput, PinInput, TextInput } from "@mantine/core";
import { IconBrandWhatsapp, IconCheck, IconChevronRight, IconInfoCircle, IconMail } from "@tabler/icons-react";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import {
  AccessAccount,
  AccessChannel,
  SendCodeResult,
  accessErrorMessage,
  completeAccess,
  lookupAccounts,
  sendAccessCode,
  verifyAccessCode,
} from "../../services/accountAccessService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { extractTenantFromHost } from "../../utils/domainUtils";
import { detectSignupCountry } from "../../utils/signupRegion";
import type { CountryCode } from "libphonenumber-js";
import { AGENDITAPP_SUPPORT_WA_URL, recoveryExchangeUrl } from "../../utils/panelAccess";
import AuthCard from "../../components/auth/AuthCard";
import { IndeterminateBar, StatusIcon } from "../../components/auth/AccessStatus";

/**
 * /recuperar-acceso — el dueño entra a su panel sin la contraseña:
 * correo o celular → canal (destinos enmascarados) → código de 6 dígitos (o
 * enlace del correo) → contraseña nueva opcional → entra por /exchange, como
 * tras el registro.
 *
 * En el dominio o subdominio de un negocio todo pasa ahí mismo y la búsqueda
 * se limita a ese negocio (sin captcha). En app.agenditapp.com busca en todos
 * los negocios, con Turnstile.
 * Solo dueños; los empleados piden a su negocio que les cambie la contraseña.
 */

type Step = "identify" | "choose" | "code" | "password" | "redirecting";

const MIN_PASSWORD = 6;
const RESEND_SECONDS = 60;

export default function RecoverAccessPage() {
  const [searchParams] = useSearchParams();
  // Si se llega con el enlace del correo, se arranca verificándolo.
  const [fromLink] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return Boolean(q.get("c") && q.get("t"));
  });
  const [step, setStep] = useState<Step>(fromLink ? "password" : "identify");
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accounts, setAccounts] = useState<AccessAccount[] | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [sent, setSent] = useState<SendCodeResult | null>(null);
  const [code, setCode] = useState("");
  const [completion, setCompletion] = useState<{ challengeId: string; token: string; businessName: string; email: string } | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(fromLink);
  const [resendIn, setResendIn] = useState(0);

  const turnstileRef = useRef<TurnstileInstance>(null);
  const tokenResolverRef = useRef<((t: string) => void) | null>(null);
  // Cloudflare pidió marcar la casilla: el widget queda visible y no se resetea.
  const turnstileInteractiveRef = useRef(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const linkHandled = useRef(false);

  const identifier = mode === "email" ? email.trim() : phone;

  // Página de un negocio (subdominio, dominio propio o local con ?slug=): la
  // búsqueda se limita a ese negocio. En app.agenditapp.com, a todos.
  const organization = useSelector((s: RootState) => s.organization.organization);
  const isGlobal = extractTenantFromHost().type === "signup";
  const scopedOrgId = !isGlobal ? organization?._id ?? null : null;
  // País del selector: el del negocio en su página; el del navegador (zona
  // horaria, como en el registro) en app.agenditapp.com.
  const phoneDefaultCountry = (
    (!isGlobal && organization?.default_country) || detectSignupCountry()
  ).toUpperCase() as CountryCode;

  // Cuenta regresiva para "Reenviar código".
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Enlace del correo: /recuperar-acceso?c=<challengeId>&t=<token>
  useEffect(() => {
    const c = searchParams.get("c");
    const t = searchParams.get("t");
    if (!c || !t || linkHandled.current) return;
    linkHandled.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    setLoading(true);
    verifyAccessCode({ challengeId: c, token: t })
      .then((r) => {
        setCompletion({ challengeId: c, token: r.completionToken, businessName: r.businessName, email: r.email });
        setStep("password");
      })
      .catch((err) => setError(accessErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const getTurnstileToken = useCallback(async (): Promise<string> => {
    if (turnstileToken) return turnstileToken;
    if (!turnstileRef.current || turnstileInteractiveRef.current) return "";
    return new Promise<string>((resolve) => {
      const timer = setTimeout(() => {
        tokenResolverRef.current = null;
        resolve("");
      }, 8000);
      tokenResolverRef.current = (tok: string) => {
        clearTimeout(timer);
        resolve(tok);
      };
      turnstileRef.current?.execute();
    });
  }, [turnstileToken]);

  const handleLookup = async () => {
    setError(null);
    if (!identifier) {
      setError(mode === "email" ? "Escribe tu correo." : "Escribe tu número de celular.");
      return;
    }
    if (!isGlobal && !scopedOrgId) {
      setError("No pudimos cargar los datos del negocio. Recarga la página.");
      return;
    }
    setLoading(true);
    try {
      // El captcha solo aplica a la búsqueda general de app.agenditapp.com.
      const token = isGlobal ? await getTurnstileToken() : "";
      if (isGlobal && !token && turnstileInteractiveRef.current) {
        // No resetear: borraría la casilla que hay que marcar.
        setError("Marca la casilla de verificación y vuelve a tocar Buscar mi cuenta.");
        setLoading(false);
        return;
      }
      const found = await lookupAccounts(identifier, {
        organizationId: scopedOrgId ?? undefined,
        turnstileToken: token || undefined,
      });
      setAccounts(found);
      setSelectedOrg(found.length === 1 ? found[0].organizationId : null);
      setStep("choose");
    } catch (err) {
      setError(accessErrorMessage(err));
    } finally {
      // El token de Turnstile sirve una sola vez (pero no borrar la casilla
      // que la persona aún tiene que marcar).
      if (!turnstileInteractiveRef.current) {
        turnstileRef.current?.reset?.();
        setTurnstileToken("");
      }
      setLoading(false);
    }
  };

  const handleSend = async (organizationId: string, channel: AccessChannel) => {
    setError(null);
    setLoading(true);
    try {
      const result = await sendAccessCode({ identifier, organizationId, channel });
      setSelectedOrg(organizationId);
      setSent(result);
      setCode("");
      setResendIn(RESEND_SECONDS);
      setStep("code");
    } catch (err) {
      const e = err as { response?: { data?: { data?: { waitSeconds?: number } } } };
      const wait = e?.response?.data?.data?.waitSeconds;
      if (wait) setResendIn(wait);
      setError(accessErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (value = code) => {
    if (!sent || value.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const r = await verifyAccessCode({ challengeId: sent.challengeId, code: value });
      setCompletion({ challengeId: sent.challengeId, token: r.completionToken, businessName: r.businessName, email: r.email });
      setStep("password");
    } catch (err) {
      setError(accessErrorMessage(err));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (withPassword: boolean) => {
    if (!completion) return;
    setError(null);
    if (withPassword) {
      if (password.length < MIN_PASSWORD) {
        setError(`La contraseña debe tener mínimo ${MIN_PASSWORD} caracteres.`);
        return;
      }
      if (password !== password2) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }
    setLoading(true);
    try {
      const r = await completeAccess({
        challengeId: completion.challengeId,
        completionToken: completion.token,
        newPassword: withPassword ? password : undefined,
      });
      setStep("redirecting");
      const target = recoveryExchangeUrl({
        hostname: window.location.hostname,
        scoped: !isGlobal,
        exchangeCode: r.exchangeCode,
        slug: r.slug,
        domain: r.domain,
      });
      if (!target) {
        setStep("password");
        setError("No encontramos la dirección de tu panel. Escríbenos y te ayudamos.");
        return;
      }
      window.location.href = target;
    } catch (err) {
      setError(accessErrorMessage(err));
      setLoading(false);
    }
  };

  const restart = () => {
    setStep("identify");
    setAccounts(null);
    setSent(null);
    setCode("");
    setCompletion(null);
    setError(null);
  };

  // Botón principal: color de la plataforma en app.agenditapp.com; el del
  // negocio dentro de su dominio.
  const primaryColor = isGlobal ? "var(--platform)" : undefined;

  const errorAlert = error && (
    <div className="ag-alert ag-alert--danger">
      <IconInfoCircle size={20} />
      <div>{error}</div>
    </div>
  );

  const supportLink = (
    <div className="ag-subtle" style={{ textAlign: "center" }}>
      ¿No puedes recibir el código?{" "}
      <a href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" className="ag-link">
        Escríbenos por WhatsApp
      </a>
    </div>
  );

  const heading = (title: string, text?: React.ReactNode) => (
    <div>
      <h1>{title}</h1>
      {text && (
        <p className="ag-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          {text}
        </p>
      )}
    </div>
  );

  const textBtn = (label: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="ag-link"
      style={{ border: 0, background: "none", padding: 0, cursor: disabled ? "default" : "pointer", color: disabled ? "var(--ink-subtle)" : undefined }}
    >
      {label}
    </button>
  );

  return (
    // AuthCard (rediseño): tarjeta clara sobre surface-muted con el logo del negocio;
    // en app.agenditapp.com, sin marca de negocio.
    <AuthCard platform={isGlobal} subtitle="" maxWidth={440}>
      {step === "identify" && (
        <>
          {heading(
            !isGlobal && organization?.name ? `Entra al panel de ${organization.name}` : "Entra a tu panel",
            isGlobal
              ? "¿Olvidaste tu contraseña o el enlace de tu negocio? Escribe el correo o el celular con el que lo registraste y te enviamos un código."
              : "¿Olvidaste tu contraseña? Escribe el correo o el celular con el que registraste el negocio y te enviamos un código."
          )}
          <div className="ag-segment" role="group" aria-label="Buscar con" style={{ display: "flex" }}>
            {(
              [
                ["email", "Con mi correo"],
                ["phone", "Con mi celular"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "email" ? (
            <TextInput
              label="Correo"
              placeholder="tu@correo.com"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          ) : (
            <InternationalPhoneInput
              label="Celular"
              compact
              defaultCountry={phoneDefaultCountry}
              value={phone}
              onChange={(e164) => setPhone(e164 || "")}
              placeholder="300 000 0000"
            />
          )}
          {isGlobal && (
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              // "invisible" era una caja de 0×0 px: si Cloudflare pedía marcar la
              // casilla nadie la veía. Así se muestra solo cuando hace falta.
              options={{ size: "flexible", appearance: "interaction-only" }}
              onBeforeInteractive={() => { turnstileInteractiveRef.current = true; }}
              onAfterInteractive={() => { turnstileInteractiveRef.current = false; }}
              onSuccess={(token) => {
                turnstileInteractiveRef.current = false;
                setTurnstileToken(token);
                tokenResolverRef.current?.(token);
                tokenResolverRef.current = null;
              }}
              onExpire={() => setTurnstileToken("")}
              onError={(code) => { console.warn("Turnstile error", code); setTurnstileToken(""); }}
            />
          )}
          {errorAlert}
          <Button fullWidth size="md" color={primaryColor} onClick={handleLookup} loading={loading}>
            Buscar mi cuenta
          </Button>
          <div className="ag-subtle" style={{ textAlign: "center" }}>
            ¿Eres empleado de un negocio? Pídele al administrador que te cambie la contraseña.
          </div>
        </>
      )}

      {step === "choose" &&
        accounts &&
        (accounts.length === 0 ? (
          <>
            {heading(
              "No encontramos tu cuenta",
              <>
                {isGlobal
                  ? `No hay ningún negocio registrado con ${mode === "email" ? "ese correo" : "ese celular"}.`
                  : `${mode === "email" ? "Ese correo" : "Ese celular"} no es el del dueño de ${organization?.name ?? "este negocio"}.`}{" "}
                Revisa que esté bien escrito o intenta con {mode === "email" ? "tu celular" : "tu correo"}.
              </>
            )}
            <div className="ag-stack" style={{ gap: 8 }}>
              <Button fullWidth color={primaryColor} onClick={restart}>
                Usar otro correo o celular
              </Button>
              <Button fullWidth variant="default" component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" leftSection={<IconBrandWhatsapp size={16} />}>
                Escríbenos por WhatsApp
              </Button>
            </div>
          </>
        ) : (
          <>
            {heading(
              accounts.length > 1 ? "Elige tu negocio" : "¿A dónde te enviamos el código?",
              accounts.length > 1 ? "Encontramos varios negocios. Elige el tuyo y por dónde quieres recibir el código." : "Elige por dónde quieres recibir el código."
            )}
            {accounts.map((acc) => (
              <div key={acc.organizationId} className="ag-stack" style={{ gap: 8 }}>
                {accounts.length > 1 && <b style={{ fontSize: 14 }}>{acc.businessName}</b>}
                {acc.channels.map((ch) => {
                  const busy = loading && selectedOrg === acc.organizationId;
                  return (
                    <div key={ch.channel}>
                      <button
                        type="button"
                        className="ag-opt"
                        disabled={!ch.available || loading}
                        onClick={() => {
                          setSelectedOrg(acc.organizationId);
                          handleSend(acc.organizationId, ch.channel);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          alignItems: "center",
                          cursor: ch.available && !loading ? "pointer" : "default",
                          opacity: ch.available ? 1 : 0.55,
                          font: "inherit",
                          color: "inherit",
                        }}
                      >
                        <span style={{ color: "var(--ink-muted)", display: "grid" }}>
                          {ch.channel === "whatsapp" ? <IconBrandWhatsapp size={20} /> : <IconMail size={20} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <b>{ch.channel === "whatsapp" ? "WhatsApp" : "Correo"}</b>
                          <span className="d ag-num" style={{ display: "block" }}>
                            {ch.masked}
                          </span>
                        </span>
                        {busy ? <Loader size={16} /> : <IconChevronRight size={18} style={{ color: "var(--ink-subtle)" }} />}
                      </button>
                      {!ch.available && ch.reason === "bounced" && (
                        <div style={{ fontSize: 13, color: "var(--warning)", marginTop: 4 }}>
                          Los correos a esta dirección no están llegando. Usa WhatsApp y, ya dentro, corrige tu correo en Mi negocio.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {errorAlert}
            <div style={{ textAlign: "center" }}>{textBtn("Usar otro correo o celular", restart)}</div>
          </>
        ))}

      {step === "code" && sent && (
        <>
          {heading(
            "Escribe el código",
            <>
              Te enviamos un código de 6 dígitos {sent.channel === "whatsapp" ? "por WhatsApp" : "por correo"} a <b style={{ color: "var(--ink)" }}>{sent.masked}</b>.
              Vence en {sent.expiresInMinutes} minutos.
              {sent.channel === "email" && " También puedes tocar el botón del correo."}
            </>
          )}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PinInput length={6} type="number" oneTimeCode autoFocus value={code} onChange={setCode} onComplete={(v) => handleVerify(v)} disabled={loading} size="md" />
          </div>
          {errorAlert}
          <Button fullWidth size="md" color={primaryColor} onClick={() => handleVerify()} loading={loading} disabled={code.length !== 6}>
            Verificar
          </Button>
          <div className="ag-row" style={{ justifyContent: "space-between" }}>
            {textBtn(resendIn > 0 ? `Reenviar en ${resendIn} s` : "Reenviar código", () => selectedOrg && handleSend(selectedOrg, sent.channel), resendIn > 0 || loading)}
            {textBtn("Usar otro medio", () => {
              setError(null);
              setStep("choose");
            })}
          </div>
          {supportLink}
        </>
      )}

      {step === "password" &&
        (loading && !completion ? (
          <>
            {heading("Verificando el enlace…", "Un momento.")}
            <IndeterminateBar />
          </>
        ) : completion ? (
          <>
            <StatusIcon tone="success">
              <IconCheck size={26} />
            </StatusIcon>
            {heading(
              "Listo, ya puedes entrar",
              <>
                Panel de <b style={{ color: "var(--ink)" }}>{completion.businessName}</b>. Tu correo de ingreso es{" "}
                <b style={{ color: "var(--ink)" }}>{completion.email}</b>. Si no recuerdas tu contraseña, crea una nueva.
              </>
            )}
            <PasswordInput label="Contraseña nueva" placeholder={`Mínimo ${MIN_PASSWORD} caracteres`} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
            <PasswordInput
              label="Repite la contraseña"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComplete(true)}
            />
            {errorAlert}
            <div className="ag-stack" style={{ gap: 8 }}>
              <Button fullWidth size="md" color={primaryColor} onClick={() => handleComplete(true)} loading={loading} disabled={!password}>
                Guardar contraseña y entrar
              </Button>
              <Button fullWidth variant="default" onClick={() => handleComplete(false)} disabled={loading}>
                Entrar sin cambiarla
              </Button>
            </div>
          </>
        ) : (
          <>
            {heading("No pudimos abrir el enlace")}
            {errorAlert}
            <Button fullWidth color={primaryColor} onClick={restart}>
              Pedir un código nuevo
            </Button>
          </>
        ))}

      {step === "redirecting" && (
        <>
          {heading("Abriendo tu panel…", "Un momento.")}
          <IndeterminateBar />
        </>
      )}
    </AuthCard>
  );
}
