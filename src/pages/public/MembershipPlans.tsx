// Elegir plan de la plataforma (rediseño, RegistroPlataforma): una tarjeta por
// plan con tipo de dominio, precio, ciclo y características. «Activar plan»
// abre el modal de pago actual (PayPal).
import { useCallback, useEffect, useState } from "react";
import { Button, Skeleton } from "@mantine/core";
import { IconBrandWhatsapp, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { apiPlansPublic } from "../../services/axiosConfig";
import { billingLabel } from "../../utils/billingCycle";
import { formatCurrency } from "../../utils/formatCurrency";
import { AGENDITAPP_SUPPORT_WA_URL } from "../../utils/panelAccess";
import { ActivatePlanModal } from "../../components/ActivatePlanModal";

interface PlanPublic {
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  billingCycle: string;
  domainType: string;
  characteristics: string[];
  limits: Record<string, unknown>;
  price?: number;
  currency?: string;
  paypalPlanId?: string | null;
}

export default function MembershipPlans() {
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [selectedPlan, setSelectedPlan] = useState<PlanPublic | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    apiPlansPublic
      .get("/public")
      .then((res) => {
        setPlans(res.data?.data || []);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const support = (
    <Button component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" variant="default" leftSection={<IconBrandWhatsapp size={16} />}>
      Escribir a soporte
    </Button>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px 64px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0, font: "600 28px/34px var(--mantine-font-family)", letterSpacing: "-0.02em" }}>Elige tu plan</h1>
        <div className="ag-muted" style={{ fontSize: 15, marginTop: 6 }}>Activa tu plan y sigue usando tu agenda sin interrupciones.</div>
      </div>

      {status === "loading" ? (
        <div className="pl-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ag-card" style={{ padding: 24 }}>
              <Skeleton height={18} width="50%" mb={12} />
              <Skeleton height={32} width="60%" mb={16} />
              <Skeleton height={12} mb={8} />
              <Skeleton height={12} mb={8} />
              <Skeleton height={12} width="70%" mb={20} />
              <Skeleton height={36} />
            </div>
          ))}
        </div>
      ) : status === "error" ? (
        <div className="ag-alert ag-alert--danger" style={{ maxWidth: 520, margin: "0 auto", alignItems: "center" }}>
          <IconInfoCircle size={20} />
          <div style={{ flex: 1 }}>No pudimos cargar los planes.</div>
          <Button size="xs" variant="default" onClick={load}>
            Reintentar
          </Button>
        </div>
      ) : plans.length === 0 ? (
        <div className="ag-card" style={{ maxWidth: 440, margin: "0 auto", padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 15 }}>No hay planes disponibles ahora</b>
          <div className="ag-muted" style={{ fontSize: 14 }}>Escríbenos y te ayudamos a activar tu cuenta.</div>
          {support}
        </div>
      ) : (
        <div className="pl-grid">
          {plans.map((p) => (
            <div key={p._id} className="ag-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <b style={{ fontSize: 17, lineHeight: "24px" }}>{p.displayName}</b>
                <span className="ag-badge ag-badge--outline">{p.domainType === "custom_domain" ? "Dominio propio" : "Subdominio"}</span>
              </div>
              <div>
                <span className="ag-num" style={{ font: "600 30px/36px var(--mantine-font-family)", letterSpacing: "-0.02em" }}>
                  {formatCurrency(p.price ?? 0, p.currency || "USD")}
                </span>
                <span className="ag-muted" style={{ fontSize: 14 }}> · {billingLabel(p.billingCycle)}</span>
              </div>
              {p.characteristics.length > 0 && (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.characteristics.slice(0, 6).map((c, i) => (
                    <li key={i} className="ag-row" style={{ gap: 8, alignItems: "flex-start", flexWrap: "nowrap", fontSize: 14, lineHeight: "20px" }}>
                      <IconCheck size={16} style={{ flex: "none", marginTop: 2, color: "var(--success)" }} />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                mt="auto"
                color="var(--platform)"
                onClick={() => {
                  setSelectedPlan(p);
                  setModalOpen(true);
                }}
              >
                Activar plan
              </Button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .pl-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 48em) { .pl-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 340px)); justify-content: center; } }
      `}</style>

      <ActivatePlanModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        plan={
          selectedPlan
            ? {
                _id: selectedPlan._id,
                displayName: selectedPlan.displayName,
                price: selectedPlan.price ?? 0,
                currency: String(selectedPlan.currency ?? "USD"),
                billingCycle: selectedPlan.billingCycle,
                paypalPlanId: selectedPlan.paypalPlanId ?? null,
              }
            : null
        }
      />
    </div>
  );
}
