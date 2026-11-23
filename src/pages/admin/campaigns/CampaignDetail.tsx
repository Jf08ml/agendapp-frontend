/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Detalle de una campaña (rediseño, CampanasPanel): progreso, cifras (Enviados,
// Pendientes, Fallidos), filtro por resultado, una fila por número con el error en
// palabras y «Detener campaña». Se refresca cada 5 s mientras se envía.
import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Box, Button, Modal, Progress, Skeleton } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconArrowLeft, IconInfoCircle, IconPlayerStop, IconSend } from "@tabler/icons-react";
import { useAppSelector } from "../../../app/store";
import campaignService from "../../../services/campaignService";
import type { Campaign } from "../../../types/campaign";
import { ITEM_STATUS, campaignStatus, humanizeSendError } from "./campaignsModel";

const toneClass = (tone: string) => (tone === "neutral" ? "ag-badge" : `ag-badge ag-badge--${tone}`);

const formatDate = (dateString: string) =>
  new Date(dateString)
    .toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(/\s?a\.?\s?m\.?/i, " a. m.")
    .replace(/\s?p\.?\s?m\.?/i, " p. m.");

type ItemFilter = "all" | "sent" | "pending" | "failed" | "skipped";

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const organization = useAppSelector((state) => state.organization.organization);
  const orgId = organization?._id || "";
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [converting, setConverting] = useState(false);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");

  const loadCampaign = async () => {
    if (!campaignId) return;
    try {
      const data = await campaignService.getCampaignDetail(orgId, campaignId);
      setCampaign(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "No pudimos cargar la campaña.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
    const interval = setInterval(() => {
      if (campaign && campaign.status === "running") loadCampaign();
    }, 5000);
    return () => clearInterval(interval);
  }, [campaignId, campaign?.status]);

  const handleCancelCampaign = async () => {
    if (!campaignId) return;
    setCancelling(true);
    try {
      await campaignService.cancelCampaign(orgId, campaignId);
      setCancelModalOpen(false);
      await loadCampaign();
    } catch (err: any) {
      showNotification({ color: "red", message: `No pudimos detener la campaña: ${err.message}. Inténtalo de nuevo.` });
    } finally {
      setCancelling(false);
    }
  };

  const handleConvertToReal = () => {
    if (!campaignId || !campaign) return;
    modals.openConfirmModal({
      title: "Enviar la campaña de verdad",
      children: `Se enviará a los ${campaign.stats.total} destinatarios de esta simulación. El envío no se puede deshacer y Meta cobra cada mensaje.`,
      labels: { confirm: "Enviar ahora", cancel: "Volver" },
      onConfirm: async () => {
        setConverting(true);
        try {
          const newCampaign = await campaignService.convertDryRunToReal(orgId, campaignId);
          showNotification({ color: "green", message: "Campaña creada: el envío empezó." });
          navigate(`/admin/campaigns/${newCampaign._id}`);
        } catch (err: any) {
          showNotification({ color: "red", message: `No pudimos crear la campaña: ${err.message}. Inténtalo de nuevo.` });
        } finally {
          setConverting(false);
        }
      },
    });
  };

  const items = useMemo(() => {
    const list = campaign?.items ?? [];
    return itemFilter === "all" ? list : list.filter((i) => i.status === itemFilter);
  }, [campaign?.items, itemFilter]);

  const back = (
    <Button component={Link} to="/admin/campaigns" variant="subtle" color="gray" size="compact-sm" leftSection={<IconArrowLeft size={16} />}>
      Campañas
    </Button>
  );

  if (loading) {
    return (
      <Box p={{ base: "sm", md: "lg" }}>
        <Skeleton height={28} width={260} mb={16} />
        <Skeleton height={90} mb={16} />
        <Skeleton height={240} />
      </Box>
    );
  }

  if (error || !campaign) {
    return (
      <Box p={{ base: "sm", md: "lg" }} maw={760}>
        <div className="ag-stack" style={{ gap: 12 }}>
          {back}
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>{error || "No encontramos esta campaña."}</div>
            <Button size="xs" variant="outline" onClick={() => { setLoading(true); loadCampaign(); }}>
              Reintentar
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  const status = campaignStatus(campaign.status);
  const { total, sent, pending, failed, skipped } = campaign.stats;
  const processed = sent + failed + (skipped || 0);
  const progressPercent = total > 0 ? (processed / total) * 100 : 0;
  const counts: Record<ItemFilter, number> = {
    all: campaign.items?.length ?? 0,
    sent,
    pending,
    failed,
    skipped: skipped || 0,
  };
  const filterLabels: Record<ItemFilter, string> = { all: "Todos", sent: "Enviados", pending: "Pendientes", failed: "Fallidos", skipped: "Omitidos" };

  return (
    <Box p={{ base: "sm", md: "lg" }} maw={1100}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <div>
          {back}
          <div className="ag-row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
            <div>
              <div className="ag-row" style={{ gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>{campaign.title}</h1>
                <span className={toneClass(status.tone)}>{status.label}</span>
                {campaign.isDryRun && campaign.status !== "dry-run" && <span className="ag-badge ag-badge--outline">Simulación</span>}
              </div>
              <div className="ag-subtle" style={{ marginTop: 4 }}>
                Creada el {formatDate(campaign.createdAt)}
                {campaign.metaTemplateName ? ` · Plantilla ${campaign.metaTemplateName}` : ""}
              </div>
            </div>
            <div className="ag-row" style={{ gap: 8 }}>
              {campaign.status === "running" && (
                <Button variant="outline" color="red" leftSection={<IconPlayerStop size={16} />} onClick={() => setCancelModalOpen(true)}>
                  Detener campaña
                </Button>
              )}
              {campaign.isDryRun && campaign.status === "completed" && (
                <Button leftSection={<IconSend size={16} />} onClick={handleConvertToReal} loading={converting}>
                  Enviar de verdad
                </Button>
              )}
            </div>
          </div>
        </div>

        {campaign.isDryRun && (
          <div className="ag-alert ag-alert--info">
            <IconInfoCircle size={20} />
            <div>Esto fue una simulación: no se envió ningún mensaje. Revisa los resultados y, si todo está bien, envíala de verdad.</div>
          </div>
        )}

        {campaign.cancelReason && (
          <div className="ag-alert ag-alert--warning">
            <IconInfoCircle size={20} />
            <div>
              <b style={{ display: "block" }}>Campaña detenida</b>
              {campaign.cancelReason}
              {campaign.cancelledAt ? ` · ${formatDate(campaign.cancelledAt)}` : ""}
            </div>
          </div>
        )}

        <div className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="ag-row" style={{ justifyContent: "space-between" }}>
            <b>
              {processed} de {total} procesados
            </b>
            <span className="ag-subtle ag-num">{progressPercent.toFixed(0)} %</span>
          </div>
          <Progress
            value={progressPercent}
            color={campaign.status === "failed" || campaign.status === "cancelled" ? "red" : "dark"}
            size="md"
            animated={campaign.status === "running"}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            {[
              { label: "Enviados", value: sent, color: "var(--success)" },
              { label: "Pendientes", value: pending, color: "var(--ink)" },
              { label: "Fallidos", value: failed, color: failed > 0 ? "var(--danger)" : "var(--ink)" },
              { label: "Omitidos", value: skipped || 0, color: "var(--ink-muted)" },
            ].map((s) => (
              <div key={s.label}>
                <div className="ag-subtle">{s.label}</div>
                <div className="ag-num" style={{ font: "600 22px/28px var(--font-sans)", color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {campaign.items && campaign.items.length > 0 && (
          <div className="ag-stack" style={{ gap: 10 }}>
            <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Resultado">
              {(Object.keys(filterLabels) as ItemFilter[])
                .filter((k) => k === "all" || counts[k] > 0)
                .map((k) => (
                  <button key={k} type="button" className="ag-chip" aria-pressed={itemFilter === k} onClick={() => setItemFilter(k)}>
                    {filterLabels[k]} <span className="count">{counts[k]}</span>
                  </button>
                ))}
            </div>
            <div className="ag-card" style={{ padding: 0, overflow: "auto", maxHeight: 520 }}>
              {items.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center" }} className="ag-muted">
                  No hay números con este resultado.
                </div>
              ) : (
                items.map((item, idx) => {
                  const s = ITEM_STATUS[item.status] ?? ITEM_STATUS.pending;
                  return (
                    <div key={`${item.phone}-${idx}`} className="ag-list-row" style={{ padding: "10px 16px", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>
                          <span className="ag-num">{item.phone}</span>
                          {item.name && <span className="ag-muted"> · {item.name}</span>}
                        </div>
                        {item.errorMessage && (
                          <div className="ag-subtle" style={{ color: "var(--danger)" }} title={item.errorMessage}>
                            {humanizeSendError(item.errorMessage)}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={toneClass(s.tone)}>{s.label}</span>
                        {item.sentAt && <div className="ag-subtle" style={{ marginTop: 2 }}>{formatDate(item.sentAt)}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <Modal opened={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Detener la campaña" centered>
        <p style={{ margin: "0 0 16px", fontSize: 14 }}>
          Se dejan de enviar los mensajes pendientes. Los que ya salieron no se pueden borrar.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="default" onClick={() => setCancelModalOpen(false)} disabled={cancelling}>
            Volver
          </Button>
          <Button color="red" onClick={handleCancelCampaign} loading={cancelling}>
            Detener campaña
          </Button>
        </div>
      </Modal>
    </Box>
  );
}
