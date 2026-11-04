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
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
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
      showNotification({ title: "Error", message: (e as Error).message, color: "red" });
    } finally {
      setRegistering(null);
    }
  };

  if (loading) {
    return (
      <Center mih={360}>
        <Loader />
      </Center>
    );
  }

  if (!card || !org) {
    return (
      <Center mih={360} px="md">
        <Stack align="center" gap="xs" maw={360}>
          <Title order={4} ta="center">Tarjeta no encontrada</Title>
          <Text c="dimmed" ta="center" size="sm">
            El enlace no es válido o el programa de fidelidad no está activo. Pide al negocio que te
            envíe tu tarjeta de nuevo.
          </Text>
        </Stack>
      </Center>
    );
  }

  const design = org.loyaltyCard || {};
  const pendingRewards = card.client.rewardHistory.filter((r) => !r.redeemed);
  const cardUrl = window.location.href.split("?")[0];
  const count = activeKind === "service" ? card.client.servicesTaken : card.client.referralsMade;
  const tiers = activeKind === "service" ? serviceTiers : referralTiers;

  return (
    <Box maw={480} mx="auto" px="md" py="lg">
      <Stack gap="md">
        {hasService && hasReferral && (
          <SegmentedControl
            fullWidth
            radius="xl"
            value={activeKind}
            onChange={(v) => setKind(v as Kind)}
            data={[
              { value: "service", label: "Servicios" },
              { value: "referral", label: "Referidos" },
            ]}
          />
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
          <Alert color="gray">Este negocio aún no configuró los niveles de su programa.</Alert>
        )}

        {design.message && (
          <Text size="sm" c="dimmed" ta="center">{design.message}</Text>
        )}

        {/* Panel del negocio (sesión iniciada en esta organización) */}
        {adminClient && (
          <Paper withBorder radius="md" p="md" style={{ borderLeft: "3px solid var(--mantine-color-green-6)" }}>
            <Group gap={6} mb="xs">
              <IconShieldCheck size={16} color="var(--mantine-color-green-7)" />
              <Text size="sm" fw={700}>Vista del negocio · {adminClient.name}</Text>
            </Group>
            <SimpleGrid cols={2} spacing="sm">
              <Button
                variant="light"
                color="green"
                leftSection={<IconCirclePlus size={16} />}
                loading={registering === "service"}
                disabled={!!registering}
                onClick={() => handleRegister("service")}
              >
                Registrar servicio
              </Button>
              <Button
                variant="light"
                color="grape"
                leftSection={<IconUserPlus size={16} />}
                loading={registering === "referral"}
                disabled={!!registering}
                onClick={() => handleRegister("referral")}
              >
                Registrar referido
              </Button>
            </SimpleGrid>
          </Paper>
        )}

        {/* Premios por reclamar */}
        {pendingRewards.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Group gap={6} mb="xs">
              <IconGift size={16} />
              <Text size="sm" fw={700}>Premios por reclamar</Text>
            </Group>
            <Stack gap={6}>
              {pendingRewards.map((r) => (
                <Group key={r._id} justify="space-between" wrap="nowrap">
                  <Text size="sm" truncate="end">🏅 {r.reward}</Text>
                  <Badge size="sm" variant="light" color={r.type === "service" ? "blue" : "grape"}>
                    {r.type === "service" ? "Servicios" : "Referidos"}
                  </Badge>
                </Group>
              ))}
            </Stack>
            <Text size="xs" c="dimmed" mt="xs">Muestra esta tarjeta en tu próxima visita para reclamarlos.</Text>
          </Paper>
        )}

        {/* QR para que el negocio abra la tarjeta */}
        <Paper withBorder radius="md" p="md">
          <Stack align="center" gap={6}>
            <Box p={8} style={{ background: "#fff", borderRadius: 12 }}>
              <QRCodeSVG value={cardUrl} size={168} level="M" />
            </Box>
            <Text size="sm" fw={600} ta="center">Muestra este código al llegar</Text>
            <Text size="xs" c="dimmed" ta="center" maw={320}>
              El negocio lo escanea para registrar tu servicio o tus referidos.
            </Text>
          </Stack>
        </Paper>

        {/* Guardar en el teléfono */}
        {!adminClient && (
          <Paper withBorder radius="md" p="md">
            <Group gap={6} mb={4}>
              <IconDeviceMobile size={16} />
              <Text size="sm" fw={700}>Tenla siempre a la mano</Text>
            </Group>
            {installPrompt ? (
              <Button
                fullWidth
                variant="light"
                mt="xs"
                onClick={async () => {
                  installPrompt.prompt();
                  await installPrompt.userChoice;
                  setInstallPrompt(null);
                }}
              >
                Agregar a la pantalla de inicio
              </Button>
            ) : (
              <Text size="xs" c="dimmed">
                {isIos()
                  ? "En Safari toca Compartir y luego «Agregar a inicio». También puedes guardar este enlace en tus favoritos."
                  : "Abre el menú del navegador (⋮) y elige «Agregar a la pantalla de inicio», o guarda este enlace en tus favoritos."}
              </Text>
            )}
          </Paper>
        )}

        {!adminClient && (
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
        )}
      </Stack>
    </Box>
  );
}
