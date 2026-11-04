/**
 * Cara de la tarjeta virtual de fidelidad (servicios o referidos).
 * La usan la vista previa del editor (Información del negocio → Fidelidad) y la
 * página pública del cliente (/mi-tarjeta/:token).
 */
import React from "react";
import { Box, Group, Image, Text } from "@mantine/core";
import { IconCheck, IconGift } from "@tabler/icons-react";
import type { LoyaltyCardDesign, LoyaltyCardTemplate, LoyaltyTier } from "../../services/loyaltyCardService";
import { CARD_TEMPLATES, FALLBACK_COLOR, cardBackground } from "./loyaltyCardUtils";

const MAX_STAMPS = 12;

export interface LoyaltyCardFaceProps {
  kind: "service" | "referral";
  design?: LoyaltyCardDesign;
  orgName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  clientName: string;
  count: number;
  tiers: LoyaltyTier[];
}

const LoyaltyCardFace: React.FC<LoyaltyCardFaceProps> = ({
  kind,
  design = {},
  orgName,
  logoUrl,
  brandColor,
  clientName,
  count,
  tiers,
}) => {
  const template: LoyaltyCardTemplate = design.template || "classic";
  const color = design.primaryColor || brandColor || FALLBACK_COLOR;
  const imageUrl = kind === "service" ? design.serviceBackgroundUrl : design.referralBackgroundUrl;
  const defaultText = CARD_TEMPLATES.find((t) => t.value === template)?.defaultText ?? "light";
  const light = (design.textColor || defaultText) === "light";
  const fg = light ? "#ffffff" : "#1a1b1e";
  const fgMuted = light ? "rgba(255,255,255,0.78)" : "rgba(26,27,30,0.65)";
  const accent = template === "dark" ? "#f5c451" : light ? "#ffffff" : color;

  const max = tiers[tiers.length - 1]?.threshold ?? 0;
  const current = Math.min(count, max);
  const nextTier = tiers.find((t) => count < t.threshold);
  const tierAt = new Map(tiers.map((t) => [t.threshold, t]));
  const kindLabel = kind === "service" ? "Servicios" : "Referidos";
  const title = design.title?.trim() || (kind === "service" ? "Tarjeta de fidelidad" : "Plan de referidos");
  const unit = kind === "service" ? "servicio" : "referido";

  return (
    <Box
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1.586",
        borderRadius: 20,
        padding: "clamp(14px, 4.5%, 22px)",
        color: fg,
        overflow: "hidden",
        boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        ...cardBackground(template, color, imageUrl),
      }}
    >
      {/* Decoración (círculos translúcidos) */}
      {template !== "image" && template !== "minimal" && (
        <>
          <Box style={{ position: "absolute", width: "70%", aspectRatio: "1", borderRadius: "50%", right: "-25%", top: "-45%", background: light ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.45)", pointerEvents: "none" }} />
          <Box style={{ position: "absolute", width: "45%", aspectRatio: "1", borderRadius: "50%", left: "-15%", bottom: "-35%", background: light ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.35)", pointerEvents: "none" }} />
        </>
      )}

      {/* Encabezado */}
      <Group justify="space-between" wrap="nowrap" align="flex-start" style={{ position: "relative" }}>
        <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
          {design.showLogo !== false && logoUrl && (
            <Box style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", padding: 3, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
              <Image src={logoUrl} alt={orgName} w="100%" h="100%" fit="contain" radius="xl" />
            </Box>
          )}
          <Box style={{ minWidth: 0 }}>
            <Text fw={800} size="sm" c={fg} truncate="end" lh={1.2}>{orgName}</Text>
            <Text size="xs" c={fgMuted} truncate="end" lh={1.2}>{title}</Text>
          </Box>
        </Group>
        <Text size="10px" fw={700} tt="uppercase" c={fgMuted} style={{ letterSpacing: 1.5, flexShrink: 0 }}>
          {kindLabel}
        </Text>
      </Group>

      {/* Sellos o barra */}
      <Box style={{ position: "relative" }}>
        {max === 0 ? (
          <Text size="xs" c={fgMuted}>Programa sin niveles configurados.</Text>
        ) : max <= MAX_STAMPS ? (
          <Box style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(max, 6)}, 1fr)`, gap: 6, maxWidth: max <= 6 ? `${max * 15}%` : "100%" }}>
            {Array.from({ length: max }, (_, i) => {
              const n = i + 1;
              const filled = n <= current;
              const reward = tierAt.get(n);
              return (
                <Box
                  key={n}
                  title={reward ? reward.reward : undefined}
                  style={{
                    aspectRatio: "1",
                    maxHeight: 34,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: filled ? accent : light ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.06)",
                    border: `1.5px ${filled ? "solid" : "dashed"} ${filled ? accent : fgMuted}`,
                    color: filled ? (template === "dark" ? "#1a1b1e" : light ? color : "#fff") : fgMuted,
                    transition: "all .3s",
                  }}
                >
                  {reward ? <IconGift size={14} /> : filled ? <IconCheck size={14} stroke={3} /> : null}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box>
            <Box style={{ height: 10, borderRadius: 99, background: light ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <Box style={{ width: `${(current / max) * 100}%`, height: "100%", background: accent, borderRadius: 99, transition: "width .4s" }} />
            </Box>
            <Text size="xs" c={fgMuted} mt={4}>{current} / {max} {unit}s</Text>
          </Box>
        )}
      </Box>

      {/* Pie: cliente + siguiente premio */}
      <Group justify="space-between" wrap="nowrap" align="flex-end" style={{ position: "relative" }}>
        <Box style={{ minWidth: 0 }}>
          <Text size="10px" c={fgMuted} tt="uppercase" style={{ letterSpacing: 1.2 }}>Cliente</Text>
          <Text fw={700} size="sm" c={fg} tt="uppercase" truncate="end" style={{ letterSpacing: 1 }}>
            {clientName || "—"}
          </Text>
        </Box>
        {max > 0 && (
          <Box style={{ textAlign: "right", minWidth: 0, maxWidth: "55%" }}>
            {nextTier ? (
              <>
                <Text size="10px" c={fgMuted} lh={1.2}>
                  Te falta{nextTier.threshold - count === 1 ? "" : "n"} {nextTier.threshold - count} para
                </Text>
                <Text size="xs" fw={700} c={fg} truncate="end">{nextTier.reward || "tu premio"}</Text>
              </>
            ) : (
              <Text size="xs" fw={800} c={fg}>🎉 ¡Completaste todos los niveles!</Text>
            )}
          </Box>
        )}
      </Group>
    </Box>
  );
};

export default React.memo(LoyaltyCardFace);
