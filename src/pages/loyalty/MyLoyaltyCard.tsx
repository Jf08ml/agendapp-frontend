/**
 * /mi-tarjeta/:token — tarjeta virtual de fidelidad del cliente.
 *
 * Pública (el token del enlace es la llave). Muestra las tarjetas de servicios
 * y referidos con el diseño del negocio, los premios por reclamar y un QR. Si
 * quien la abre es el negocio (sesión iniciada en esta organización, p. ej. al
 * escanear el QR), aparece el panel para registrar el servicio o el referido.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Drawer, Skeleton } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { QRCodeSVG } from "qrcode.react";
import {
  IconCirclePlus,
  IconDeviceMobile,
  IconGift,
  IconShieldCheck,
  IconUserPlus,
} from "@tabler/icons-react";
import { useAppSelector } from "../../app/store";
import LoyaltyCardFace from "../../components/loyaltyCard/LoyaltyCardFace";
import { normalizeTiers } from "../../components/loyaltyCard/loyaltyCardUtils";
import {
  getClientByLoyaltyCardToken,
  getPublicLoyaltyCard,
  savedCardKey,
  type PublicLoyaltyCard,
} from "../../services/loyaltyCardService";
import { registerReferral, registerService, type Client } from "../../services/clientService";

type Kind = "service" | "referral";

// Evento "beforeinstallprompt" (Chrome/Android); no está en los tipos del DOM.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function MyLoyaltyCard() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [card, setCard] = useState<PublicLoyaltyCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<Kind>("service");
  const [adminClient, setAdminClient] = useState<Client | null>(null);
  const [registering, setRegistering] = useState<Kind | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);

  const load = useCallback(async () => {
    const data = await getPublicLoyaltyCard(token);
    setCard(data);
    setLoading(false);
    // Recordar la tarjeta en este dispositivo (no en el del negocio, que abre
    // tarjetas de muchos clientes).
    if (data && !isAuthenticated) {
      try {
        localStorage.setItem(savedCardKey(data.organization._id), token);
      } catch {
        /* almacenamiento no disponible */
      }
    }
    return data;
  }, [token, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  // Vista del negocio: solo si hay sesión y la tarjeta es de un cliente de esta org.
  useEffect(() => {
    if (!isAuthenticated || !card) return;
    getClientByLoyaltyCardToken(token).then(setAdminClient);
  }, [isAuthenticated, card, token]);

  // Manifest con start_url = esta tarjeta, para que el ícono de la pantalla de
  // inicio abra la tarjeta (el backend solo acepta /mi-tarjeta/<token>).
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link || !token) return;
    const original = link.getAttribute("href") || "/manifest.webmanifest";
    link.setAttribute("href", `/manifest.webmanifest?start=${encodeURIComponent(`/mi-tarjeta/${token}`)}`);
    return () => link.setAttribute("href", original);
  }, [token]);

  // Android/Chrome: botón "Agregar a la pantalla de inicio".
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const org = card?.organization;
  const serviceTiers = useMemo(
    () => normalizeTiers(org?.serviceTiers, org?.serviceCount, org?.serviceReward),
    [org]
  );
  const referralTiers = useMemo(
    () => normalizeTiers(org?.referralTiers, org?.referredCount, org?.referredReward),
    [org]
  );
  const hasService = serviceTiers.length > 0;
  const hasReferral = referralTiers.length > 0;
  const activeKind: Kind = hasService && hasReferral ? kind : hasReferral ? "referral" : "service";

  const handleRegister = async (k: Kind) => {
    if (!adminClient) return;
    setRegistering(k);
    try {
      if (k === "service") await registerService(adminClient._id);
      else await registerReferral(adminClient._id);
      await load();
      showNotification({
        title: k === "service" ? "Servicio registrado" : "Referido registrado",
        message: `Se sumó a la tarjeta de ${adminClient.name}.`,
        color: "green",
      });
    } catch (e) {
      showNotification({ color: "red", message: `No se pudo registrar: ${(e as Error).message}. Intenta de nuevo.` });
    } finally {
      setRegistering(null);
    }
  };

  const shell = { maxWidth: 480, margin: "0 auto", padding: "24px 16px 48px" } as const;

  if (loading) {
    return (
      <div style={shell}>
        <Skeleton radius={20} style={{ aspectRatio: "1.586", height: "auto" }} mb={16} />
        <Skeleton height={200} radius="md" />
      </div>
    );
  }

  if (!card || !org) {
    return (
      <div style={shell}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center" }}>
          <h1 style={{ margin: "0 0 6px", font: "600 20px/26px var(--mantine-font-family)" }}>No pudimos abrir tu tarjeta</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginBottom: 14 }}>El enlace no es válido o el programa de fidelidad no está activo.</div>
          <Button onClick={() => navigate("/search-client")}>Consultar con mi número</Button>
        </div>
      </div>
    );
  }

  const design = org.loyaltyCard || {};
  const pendingRewards = card.client.rewardHistory.filter((r) => !r.redeemed);
  const cardUrl = window.location.href.split("?")[0];
  const count = activeKind === "service" ? card.client.servicesTaken : card.client.referralsMade;
  const tiers = activeKind === "service" ? serviceTiers : referralTiers;

  return (
    <div style={shell}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Mi tarjeta</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>Tu programa de fidelidad en {org.name}.</div>
        </div>

        {hasService && hasReferral && (
          <div className="ag-segment" role="group" aria-label="Tarjeta" style={{ alignSelf: "flex-start" }}>
            <button type="button" aria-pressed={activeKind === "service"} onClick={() => setKind("service")}>
              Servicios
            </button>
            <button type="button" aria-pressed={activeKind === "referral"} onClick={() => setKind("referral")}>
              Referidos
            </button>
          </div>
        )}

        {hasService || hasReferral ? (
          <LoyaltyCardFace
            kind={activeKind}
            design={design}
            orgName={org.name}
            logoUrl={org.branding.logoUrl}
            brandColor={org.branding.primaryColor}
            clientName={card.client.name}
            count={count}
            tiers={tiers}
          />
        ) : (
          <div className="ag-card" style={{ padding: 16, textAlign: "center" }}>
            <div className="ag-muted" style={{ fontSize: 14 }}>Este plan aún no tiene niveles configurados.</div>
          </div>
        )}

        {design.message && <div className="ag-muted" style={{ fontSize: 14, textAlign: "center" }}>{design.message}</div>}

        {/* Panel del negocio (sesión iniciada en esta organización) */}
        {adminClient && (
          <div className="ag-card" style={{ padding: 16 }}>
            <div className="ag-row" style={{ gap: 6, marginBottom: 10 }}>
              <IconShieldCheck size={16} />
              <b style={{ fontSize: 14 }}>Vista del negocio · {adminClient.name}</b>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Button variant="default" leftSection={<IconCirclePlus size={16} />} loading={registering === "service"} disabled={!!registering} onClick={() => handleRegister("service")}>
                Registrar servicio
              </Button>
              <Button variant="default" leftSection={<IconUserPlus size={16} />} loading={registering === "referral"} disabled={!!registering} onClick={() => handleRegister("referral")}>
                Registrar referido
              </Button>
            </div>
          </div>
        )}

        {pendingRewards.length > 0 && (
          <div className="ag-card" style={{ padding: 16 }}>
            <div className="ag-row" style={{ gap: 6, marginBottom: 8 }}>
              <IconGift size={16} />
              <b style={{ fontSize: 14 }}>Premios por reclamar</b>
            </div>
            {pendingRewards.map((r) => (
              <div key={r._id} className="ag-row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "nowrap", padding: "4px 0" }}>
                <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reward}</span>
                <span className="ag-badge">{r.type === "service" ? "Servicios" : "Referidos"}</span>
              </div>
            ))}
            <div className="ag-subtle" style={{ marginTop: 6 }}>Muestra esta tarjeta en tu próxima visita para reclamarlos.</div>
          </div>
        )}

        <div className="ag-card" style={{ padding: 16, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ padding: 8, background: "#fff", borderRadius: 12 }}>
            <QRCodeSVG value={cardUrl} size={168} level="M" />
          </div>
          <b style={{ fontSize: 14 }}>Muéstralo en tu cita</b>
          <div className="ag-subtle" style={{ maxWidth: 320 }}>El negocio lo escanea para registrar tu servicio o tus referidos.</div>
        </div>

        {!adminClient && (
          <div className="ag-stack" style={{ gap: 6 }}>
            <Button
              variant="default"
              fullWidth
              leftSection={<IconDeviceMobile size={16} />}
              onClick={async () => {
                if (installPrompt) {
                  installPrompt.prompt();
                  await installPrompt.userChoice;
                  setInstallPrompt(null);
                } else {
                  setInstallHelp(true);
                }
              }}
            >
              Agregar a la pantalla de inicio
            </Button>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => {
                try {
                  localStorage.removeItem(savedCardKey(org._id));
                } catch {
                  /* almacenamiento no disponible */
                }
                navigate("/search-client");
              }}
            >
              ¿No es tu tarjeta? Consultar con otro número
            </Button>
          </div>
        )}
      </div>

      <Drawer opened={installHelp} onClose={() => setInstallHelp(false)} position="bottom" size="auto" radius="lg" title={<b>Tenla siempre a la mano</b>}>
        <div className="ag-muted" style={{ fontSize: 14, paddingBottom: 12 }}>
          {isIos()
            ? "En Safari toca Compartir y luego «Agregar a inicio». También puedes guardar este enlace en tus favoritos."
            : "Abre el menú del navegador (⋮) y elige «Agregar a la pantalla de inicio», o guarda este enlace en tus favoritos."}
        </div>
      </Drawer>
    </div>
  );
}
