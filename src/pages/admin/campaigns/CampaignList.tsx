/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Campañas (rediseño, CampanasPanel): pestaña de WhatsApp. Chips por estado con
// su conteo, tabla (tarjetas en móvil) y aviso de que salen por la API de Meta.
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ActionIcon, Box, Button, Menu, Pagination, Skeleton, TextInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconDots, IconEye, IconInfoCircle, IconPlus, IconSearch } from "@tabler/icons-react";
import { useAppSelector } from "../../../app/store";
import campaignService from "../../../services/campaignService";
import type { Campaign } from "../../../types/campaign";
import WhatsappTabs from "../../../components/whatsapp/WhatsappTabs";
import { CAMPAIGN_CHIPS, campaignStatus } from "./campaignsModel";

const toneClass = (tone: string) => (tone === "neutral" ? "ag-badge" : `ag-badge ag-badge--${tone}`);

const formatDate = (dateString: string) =>
  new Date(dateString)
    .toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(/\s?a\.?\s?m\.?/i, " a. m.")
    .replace(/\s?p\.?\s?m\.?/i, " p. m.");

export default function CampaignList() {
  const navigate = useNavigate();
  const organization = useAppSelector((state) => state.organization.organization);
  const orgId = organization?._id || "";
  const isMeta = organization?.waConnectionType === "meta";
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const loadCampaigns = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await campaignService.listCampaigns(orgId, {
        page,
        limit: 10,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setCampaigns(result.campaigns || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.message || "No pudimos cargar las campañas.");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // Conteo de cada chip: una consulta liviana por estado (solo el total)
  const loadCounts = async () => {
    if (!orgId) return;
    const entries = await Promise.all(
      CAMPAIGN_CHIPS.map(async (c) => {
        try {
          const r = await campaignService.listCampaigns(orgId, { page: 1, limit: 1, status: c.value === "all" ? undefined : c.value });
          return [c.value, r.pagination?.total ?? 0] as const;
        } catch {
          return [c.value, -1] as const;
        }
      })
    );
    setCounts(Object.fromEntries(entries.filter(([, n]) => n >= 0)));
  };

  useEffect(() => {
    loadCampaigns();
  }, [page, statusFilter, orgId]);

  useEffect(() => {
    loadCounts();
  }, [orgId]);

  const filteredCampaigns = (campaigns || []).filter(
    (c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const newButton = isMeta ? (
    <Button leftSection={<IconPlus size={16} />} onClick={() => navigate("/admin/campaigns/new")}>
      Nueva campaña
    </Button>
  ) : (
    <Button component={Link} to="/gestionar-whatsapp" variant="outline">
      Conectar con Meta
    </Button>
  );

  const renderStatus = (c: Campaign) => {
    const s = campaignStatus(c.status);
    return (
      <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <span className={toneClass(s.tone)}>{s.label}</span>
        {c.isDryRun && c.status !== "dry-run" && <span className="ag-badge ag-badge--outline">Simulación</span>}
      </div>
    );
  };

  const renderProgress = (c: Campaign) => (
    <div>
      <span className="ag-num">
        {c.stats.sent} de {c.stats.total}
      </span>
      {c.stats.failed > 0 && <div className="ag-subtle" style={{ color: "var(--danger)" }}>{c.stats.failed} fallidos</div>}
    </div>
  );

  const rowMenu = (c: Campaign) => (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="Más opciones" onClick={(e) => e.stopPropagation()}>
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconEye size={14} />} onClick={() => navigate(`/admin/campaigns/${c._id}`)}>
          Ver detalle
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <Box p={{ base: "sm", md: "lg" }}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <WhatsappTabs subtitle="Mensajes masivos a tus clientes: promociones, novedades y recordatorios." />

        {isMeta ? (
          <div className="ag-alert ag-alert--info">
            <IconInfoCircle size={20} />
            <div>Las campañas salen por la API oficial de Meta, con una plantilla aprobada. Meta cobra cada mensaje enviado.</div>
          </div>
        ) : (
          <div className="ag-alert ag-alert--warning" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>
              <b style={{ display: "block" }}>Necesitas la API oficial de Meta</b>
              Las campañas solo se envían con tu número conectado a Meta. Puedes ver aquí las que ya enviaste.
            </div>
          </div>
        )}

        <div className="ag-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Estado">
            {CAMPAIGN_CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="ag-chip"
                aria-pressed={statusFilter === c.value}
                onClick={() => {
                  setStatusFilter(c.value);
                  setPage(1);
                }}
              >
                {c.label}
                {typeof counts[c.value] === "number" && <span className="count">{counts[c.value]}</span>}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", gap: 8, width: isMobile ? "100%" : undefined }}>
            <TextInput
              placeholder="Buscar por nombre"
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 200 }}
              aria-label="Buscar campaña"
            />
            {newButton}
          </div>
        </div>

        {error && (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>{error}</div>
            <Button size="xs" variant="outline" onClick={loadCampaigns}>
              Reintentar
            </Button>
          </div>
        )}

        {loading ? (
          <div className="ag-card" style={{ padding: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={40} radius="sm" mb={i < 4 ? 10 : 0} />
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="ag-card" style={{ padding: "40px 20px", textAlign: "center" }}>
            <b style={{ display: "block", marginBottom: 4 }}>
              {statusFilter === "all" && !searchQuery ? "Aún no tienes campañas" : "No hay campañas con este filtro"}
            </b>
            <div className="ag-muted" style={{ fontSize: 14, marginBottom: 12 }}>
              {isMeta ? "Envía una promoción o novedad a tus clientes con una plantilla aprobada." : "Conecta tu número con Meta para empezar."}
            </div>
            {statusFilter === "all" && !searchQuery ? (
              newButton
            ) : (
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
              >
                Quitar filtros
              </Button>
            )}
          </div>
        ) : isMobile ? (
          <div className="ag-stack" style={{ gap: 8 }}>
            {filteredCampaigns.map((c) => (
              <div
                key={c._id}
                className="ag-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/campaigns/${c._id}`)}
                style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer" }}
              >
                <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <b>{c.title}</b>
                  {renderStatus(c)}
                </div>
                {c.metaTemplateName && <div className="ag-subtle">Plantilla: {c.metaTemplateName}</div>}
                <div className="ag-row" style={{ justifyContent: "space-between" }}>
                  {renderProgress(c)}
                  <span className="ag-subtle">{formatDate(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ag-card" style={{ padding: 0, overflow: "auto" }}>
            <table className="ag-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Estado</th>
                  <th>Progreso</th>
                  <th>Fecha</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => (
                  <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/campaigns/${c._id}`)}>
                    <td>
                      <b>{c.title}</b>
                      {c.metaTemplateName && <div className="ag-subtle">Plantilla: {c.metaTemplateName}</div>}
                    </td>
                    <td>{renderStatus(c)}</td>
                    <td>{renderProgress(c)}</td>
                    <td className="ag-subtle" style={{ whiteSpace: "nowrap" }}>{formatDate(c.createdAt)}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      {rowMenu(c)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </div>
        )}
      </div>
    </Box>
  );
}
