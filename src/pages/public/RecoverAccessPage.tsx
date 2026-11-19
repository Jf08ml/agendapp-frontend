import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  PasswordInput,
  PinInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconBrandWhatsapp, IconMail } from "@tabler/icons-react";
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
import { AGENDITAPP_SUPPORT_WA_URL, recoveryExchangeUrl } from "../../utils/panelAccess";

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
  const [turnstileToken, setTurnstileToken] = useState("");
  const linkHandled = useRef(false);

  const identifier = mode === "email" ? email.trim() : phone;

  // Página de un negocio (subdominio, dominio propio o local con ?slug=): la
  // búsqueda se limita a ese negocio. En app.agenditapp.com, a todos.
  const organization = useSelector((s: RootState) => s.organization.organization);
  const isGlobal = extractTenantFromHost().type === "signup";
  const scopedOrgId = !isGlobal ? organization?._id ?? null : null;

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
    if (!turnstileRef.current) return "";
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
      // El token de Turnstile sirve una sola vez.
      turnstileRef.current?.reset?.();
      setTurnstileToken("");
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

  const errorAlert = error && (
    <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
      {error}
    </Alert>
  );

  const supportLink = (
    <Text size="xs" c="dimmed" ta="center">
      ¿No puedes recibir el código?{" "}
      <Anchor href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" size="xs">
        Escríbenos por WhatsApp
      </Anchor>
    </Text>
  );

  return (
    <Container size={460} my={60} px="md">
      <Paper withBorder shadow="md" p={{ base: "lg", sm: 30 }} radius="md">
        {step === "identify" && (
          <Stack gap="md">
            <div>
              <Title order={3}>
                {!isGlobal && organization?.name ? `Entra al panel de ${organization.name}` : "Entra a tu panel"}
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                {isGlobal
                  ? "¿Olvidaste tu contraseña o el enlace de tu negocio? Escribe el correo o el celular con el que registraste tu negocio y te enviamos un código."
                  : "¿Olvidaste tu contraseña? Escribe el correo o el celular con el que registraste el negocio y te enviamos un código."}
              </Text>
            </div>
            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(v) => {
                setMode(v as "email" | "phone");
                setError(null);
              }}
              data={[
                { label: "Con mi correo", value: "email" },
                { label: "Con mi celular", value: "phone" },
              ]}
            />
            {mode === "email" ? (
              <TextInput
                label="Correo"
                placeholder="tu@email.com"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
            ) : (
              <InternationalPhoneInput
                label="Celular"
                value={phone}
                onChange={(e164) => setPhone(e164 || "")}
                placeholder="300 000 0000"
              />
            )}
            {isGlobal && (
              <Turnstile
                ref={turnstileRef}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                options={{ size: "invisible" }}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  tokenResolverRef.current?.(token);
                  tokenResolverRef.current = null;
                }}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
              />
            )}
            {errorAlert}
            <Button fullWidth onClick={handleLookup} loading={loading}>
              Buscar mi cuenta
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              ¿Eres empleado de un negocio? Pídele al administrador que te cambie la contraseña.
            </Text>
          </Stack>
        )}

        {step === "choose" && accounts && (
          <Stack gap="md">
            {accounts.length === 0 ? (
              <>
                <Title order={3}>No encontramos tu cuenta</Title>
                <Text size="sm" c="dimmed">
                  {isGlobal
                    ? `No hay ningún negocio registrado con ${mode === "email" ? "ese correo" : "ese celular"}.`
                    : `${mode === "email" ? "Ese correo" : "Ese celular"} no es el del dueño de ${organization?.name ?? "este negocio"}.`}{" "}
                  Revisa que esté bien escrito o intenta con {mode === "email" ? "tu celular" : "tu correo"}.
                </Text>
                <Button variant="light" onClick={restart}>
                  Intentar de nuevo
                </Button>
                {supportLink}
              </>
            ) : (
              <>
                <div>
                  <Title order={3}>¿A dónde te enviamos el código?</Title>
                  <Text size="sm" c="dimmed" mt={4}>
                    {accounts.length > 1 ? "Encontramos varios negocios. Elige el tuyo y " : "Elige "}
                    por dónde quieres recibir el código.
                  </Text>
                </div>
                {accounts.map((acc) => (
                  <Card key={acc.organizationId} withBorder radius="md" p="md">
                    <Text fw={600} mb="xs">
                      {acc.businessName}
                    </Text>
                    <Stack gap={8}>
                      {acc.channels.map((ch) => (
                        <div key={ch.channel}>
                          <Button
                            fullWidth
                            variant={ch.channel === "whatsapp" ? "filled" : "light"}
                            color={ch.channel === "whatsapp" ? "green" : "blue"}
                            leftSection={ch.channel === "whatsapp" ? <IconBrandWhatsapp size={18} /> : <IconMail size={18} />}
                            disabled={!ch.available || loading}
                            loading={loading && selectedOrg === acc.organizationId}
                            onClick={() => {
                              setSelectedOrg(acc.organizationId);
                              handleSend(acc.organizationId, ch.channel);
                            }}
                            styles={{ label: { whiteSpace: "normal" } }}
                            h="auto"
                            py={8}
                          >
                            {ch.channel === "whatsapp" ? `WhatsApp a ${ch.masked}` : `Correo a ${ch.masked}`}
                          </Button>
                          {!ch.available && ch.reason === "bounced" && (
                            <Text size="xs" c="orange.7" mt={4}>
                              Los correos a esta dirección no están llegando. Usa WhatsApp y, ya dentro, corrige tu
                              correo en Mi negocio.
                            </Text>
                          )}
                        </div>
                      ))}
                    </Stack>
                  </Card>
                ))}
                {errorAlert}
                <Anchor component="button" type="button" size="sm" onClick={restart}>
                  Usar otro correo o celular
                </Anchor>
              </>
            )}
          </Stack>
        )}

        {step === "code" && sent && (
          <Stack gap="md" align="stretch">
            <div>
              <Title order={3}>Escribe el código</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Te enviamos un código de 6 dígitos {sent.channel === "whatsapp" ? "por WhatsApp" : "por correo"} a{" "}
                <strong>{sent.masked}</strong>. Vence en {sent.expiresInMinutes} minutos.
                {sent.channel === "email" && " También puedes tocar el botón del correo."}
              </Text>
            </div>
            <Group justify="center">
              <PinInput
                length={6}
                type="number"
                oneTimeCode
                autoFocus
                value={code}
                onChange={setCode}
                onComplete={(v) => handleVerify(v)}
                disabled={loading}
                size="md"
              />
            </Group>
            {errorAlert}
            <Button fullWidth onClick={() => handleVerify()} loading={loading} disabled={code.length !== 6}>
              Verificar
            </Button>
            <Group justify="space-between">
              <Anchor
                component="button"
                type="button"
                size="sm"
                disabled={resendIn > 0 || loading}
                c={resendIn > 0 ? "dimmed" : undefined}
                onClick={() => selectedOrg && handleSend(selectedOrg, sent.channel)}
              >
                {resendIn > 0 ? `Reenviar en ${resendIn} s` : "Reenviar código"}
              </Anchor>
              <Anchor
                component="button"
                type="button"
                size="sm"
                onClick={() => {
                  setError(null);
                  setStep("choose");
                }}
              >
                Usar otro medio
              </Anchor>
            </Group>
            {supportLink}
          </Stack>
        )}

        {step === "password" && (
          <Stack gap="md">
            {loading && !completion ? (
              <Stack align="center" py="lg">
                <Loader />
                <Text size="sm" c="dimmed">
                  Verificando el enlace…
                </Text>
              </Stack>
            ) : completion ? (
              <>
                <div>
                  <Title order={3}>¡Listo! Ya puedes entrar</Title>
                  <Text size="sm" c="dimmed" mt={4}>
                    Panel de <strong>{completion.businessName}</strong>. Tu correo de ingreso es{" "}
                    <strong>{completion.email}</strong>. Si no recuerdas tu contraseña, crea una nueva:
                  </Text>
                </div>
                <PasswordInput
                  label="Contraseña nueva"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Repite la contraseña"
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComplete(true)}
                />
                {errorAlert}
                <Button fullWidth onClick={() => handleComplete(true)} loading={loading} disabled={!password}>
                  Guardar contraseña y entrar
                </Button>
                <Button fullWidth variant="subtle" onClick={() => handleComplete(false)} disabled={loading}>
                  Entrar sin cambiarla
                </Button>
              </>
            ) : (
              <>
                {errorAlert}
                <Button variant="light" onClick={restart}>
                  Pedir un código nuevo
                </Button>
              </>
            )}
          </Stack>
        )}

        {step === "redirecting" && (
          <Stack align="center" gap="md" py="lg">
            <Loader size="lg" />
            <Text c="dimmed" size="sm">
              Abriendo tu panel…
            </Text>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
