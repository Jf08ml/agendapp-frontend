/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Mi plan (rediseño, MembresiaPanel; antes «Mi membresía»): aviso del estado con
// una sola acción, «Tu plan», uso con barras, qué incluye y cambiar de plan.
// Periodo de gracia con fecha de corte y «Quedan 2 de 3 días».
import { useEffect, useState } from "react";
import { Box, Button, Collapse, Progress, Skeleton } from "@mantine/core";
import { IconCheck, IconInfoCircle, IconSparkles, IconX } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { getCurrentMembership, getMyPlanInfo, Membership, MyPlanInfo } from "../../services/membershipService";
import { PaymentMethodsModal } from "../../components/PaymentMethodsModal";
import { ActivatePlanModal } from "../../components/ActivatePlanModal";
import { apiPlansPublic } from "../../services/axiosConfig";
import { billingShort } from "../../utils/billingCycle";
import WhatsappQuotaUsage from "../../components/WhatsappQuotaUsage";
import { STATUS_LABELS, daysUntil, graceInfo, statusNotice } from "./membershipModel";

interface PublicPlan {
  _id: string;
  displayName: string;
  billingCycle: string;
  domainType: string;
  price: number;
  currency: string;
  characteristics: string[];
  slug: string;
  paypalPlanId: string | null;
}

const FEATURES: [string, string][] = [
  ["whatsappIntegration", "WhatsApp automático"],
  ["autoReminders", "Recordatorios automáticos"],
  ["campaignsWhatsapp", "Campañas de WhatsApp"],
  ["loyaltyProgram", "Programa de fidelidad"],
  ["servicePackages", "Paquetes de sesiones"],
  ["classesModule", "Clases"],
  ["professionalLanding", "Página de inicio profesional"],
  ["customBranding", "Marca personalizada"],
  ["prioritySupport", "Soporte prioritario"],
];

const formatDate = (d: string | Date | number) => new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
const money = (price: number, currency: string) => `$ ${price.toLocaleString("es-CO")} ${currency}`;
const h1 = { margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" } as const;
const toneClass = (tone: string) => (tone === "neutral" ? "ag-badge" : `ag-badge ag-badge--${tone}`);

export default function MyMembership() {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [publicPlans, setPublicPlans] = useState<PublicPlan[]>([]);
  const [plansError, setPlansError] = useState(false);
  const [activatePlan, setActivatePlan] = useState<PublicPlan | null>(null);
  const [planInfo, setPlanInfo] = useState<MyPlanInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const organization = useSelector((state: RootState) => state.organization.organization);

  useEffect(() => {
    loadMembership();
  }, [organization?._id]);

  const loadMembership = async () => {
    if (!organization?._id) return;
    setLoading(true);
    try {
      const [membershipData, planInfoData] = await Promise.all([getCurrentMembership(organization._id), getMyPlanInfo()]);
      setMembership(membershipData);
      setPlanInfo(planInfoData);
    } catch (error) {
      console.error("Error al cargar membresía:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setPlansError(false);
    try {
      const res = await apiPlansPublic.get("/public");
      setPublicPlans(res.data?.data || []);
    } catch (e) {
      console.error("Error cargando planes:", e);
      setPlansError(true);
    }
  };

  const scrollToPlans = () => document.getElementById("planes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const paidPlans = publicPlans.filter((p) => p.slug !== "plan-demo" && p.price > 0);

  if (loading) {
    return (
      <Box p={{ base: "sm", md: "lg" }} maw={1000}>
        <Skeleton height={30} width={160} mb={16} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={140} radius="md" mb={12} />
        ))}
      </Box>
    );
  }

  // Sin membresía: solo elegir plan
  if (!membership) {
    return (
      <Box p={{ base: "sm", md: "lg" }} maw={1000}>
        <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
          <div>
            <h1 style={h1}>Mi plan</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>Elige un plan para empezar a usar AgenditApp.</div>
          </div>
          <PlansGrid plans={paidPlans} error={plansError} onRetry={loadPlans} actionLabel="Elegir este plan" onSelect={setActivatePlan} />
        </div>
        <ActivatePlanModal opened={!!activatePlan} onClose={() => setActivatePlan(null)} plan={activatePlan} modalTitle="Activar mi plan" />
      </Box>
    );
  }

  const plan = membership.planId;
  const status = membership.status;
  const isTrial = status === "trial";
  const isActive = status === "active";
  const statusLabel = STATUS_LABELS[status] ?? { label: status, tone: "neutral" as const };

  const now = Date.now();
  const end = new Date(membership.currentPeriodEnd);
  const daysLeft = daysUntil(end.getTime(), now);
  const trialTotalDays = Math.max(1, Math.ceil((end.getTime() - new Date(membership.startDate).getTime()) / 86_400_000));
  const canRenewCurrent = !isTrial && plan.price > 0;
  const notice = statusNotice(status, daysLeft, canRenewCurrent);
  const grace = status === "past_due" ? graceInfo(end.getTime(), now, (membership as any).accessEndsAt ? new Date((membership as any).accessEndsAt).getTime() : null) : null;

  const runAction = (action: string) => (action === "renew" ? setPaymentModalOpened(true) : scrollToPlans());
  const actionLabel = (action: string) =>
    action === "renew" ? (status === "active" ? "Renovar plan" : "Renovar") : isTrial ? "Activar mi plan" : "Elegir un plan";

  // Activas: otros planes (cambio). Resto: todos los planes de pago.
  const otherPlans = isActive ? paidPlans.filter((p) => p._id !== plan._id) : paidPlans;

  const plansSection = otherPlans.length > 0 && (
    <section className="ag-stack" style={{ gap: 12, scrollMarginTop: 80 }} id="planes">
      <div>
        <h2 className="ag-h" style={{ margin: 0 }}>{isTrial ? "Elige tu plan" : isActive ? "Cambiar de plan" : "Reactiva tu cuenta"}</h2>
        <div className="ag-muted" style={{ fontSize: 14 }}>
          {isTrial
            ? "Elige antes de que termine tu prueba para seguir sin interrupciones."
            : isActive
              ? "El nuevo plan se activa al completar el pago."
              : "Elige un plan para recuperar el acceso completo."}
        </div>
      </div>
      <PlansGrid
        plans={otherPlans}
        error={plansError}
        onRetry={loadPlans}
        actionLabel={isActive ? "Cambiar a este plan" : "Elegir este plan"}
        actionVariant={isActive ? "outline" : "filled"}
        onSelect={setActivatePlan}
      />
    </section>
  );

  return (
    <Box p={{ base: "sm", md: "lg" }} maw={1000}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <h1 style={h1}>Mi plan</h1>

        {/* Aviso del estado: una sola acción */}
        {notice && (
          <div className={`ag-alert ag-alert--${notice.tone}`} style={{ alignItems: "center", flexWrap: "wrap" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <b style={{ display: "block" }}>{notice.title}</b>
              {notice.text}
              {grace && (
                <div style={{ marginTop: 8, maxWidth: 360 }}>
                  <div className="ag-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                    <span>
                      Quedan {grace.left} de {grace.total} días
                    </span>
                    <span className="ag-subtle">Corte: {formatDate(grace.cutMs)}</span>
                  </div>
                  <Progress value={(grace.left / grace.total) * 100} color="orange" size="sm" mt={4} />
                </div>
              )}
            </div>
            {notice.action !== "none" && (
              <Button onClick={() => runAction(notice.action)} leftSection={notice.action === "choose" ? <IconSparkles size={16} /> : undefined}>
                {actionLabel(notice.action)}
              </Button>
            )}
          </div>
        )}

        {/* Tu plan */}
        <section className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ag-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div className="ag-subtle">Tu plan</div>
              <h2 className="ag-h" style={{ margin: 0 }}>{isTrial ? "Prueba gratuita" : plan.displayName}</h2>
            </div>
            <span className={toneClass(statusLabel.tone)}>{statusLabel.label}</span>
          </div>

          {isTrial ? (
            <div className="ag-stack" style={{ gap: 8 }}>
              <div className="ag-row" style={{ alignItems: "baseline", gap: 8 }}>
                <span className="ag-num" style={{ font: "600 40px/44px var(--font-sans)" }}>{Math.max(0, daysLeft)}</span>
                <span className="ag-muted">{daysLeft === 1 ? "día de prueba" : "días de prueba"} · termina el {formatDate(end)}</span>
              </div>
              <Progress value={Math.min(100, ((trialTotalDays - Math.max(0, daysLeft)) / trialTotalDays) * 100)} color={daysLeft <= 2 ? "orange" : "dark"} size="sm" />
              <div className="ag-subtle">Al terminar pasas al plan gratuito: 1 profesional, 5 servicios y sin WhatsApp.</div>
              {!notice && (
                <div>
                  <Button onClick={scrollToPlans} leftSection={<IconSparkles size={16} />}>
                    Activar mi plan
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <dl className="ag-kv" style={{ gridTemplateColumns: "140px 1fr" }}>
              <dt>Precio</dt>
              <dd className="ag-num">
                {money(plan.price, plan.currency)} {plan.billingCycle !== "lifetime" ? `por ${billingShort(plan.billingCycle)}` : "· pago único"}
              </dd>
              <dt>{daysLeft > 0 ? "Vence el" : "Venció el"}</dt>
              <dd>
                {formatDate(end)}
                {daysLeft > 0 && <span className="ag-subtle"> · faltan {daysLeft} {daysLeft === 1 ? "día" : "días"}</span>}
              </dd>
              {membership.lastPaymentDate && (
                <>
                  <dt>Último pago</dt>
                  <dd>{formatDate(membership.lastPaymentDate)}</dd>
                </>
              )}
              <dt>Renovación</dt>
              <dd>{(membership as any).autoRenew ? "Automática con PayPal" : "Manual"}</dd>
            </dl>
          )}

          {isActive && !notice && canRenewCurrent && (
            <div>
              <Button variant="default" onClick={() => setPaymentModalOpened(true)}>
                Renovar plan
              </Button>
            </div>
          )}
        </section>

        {/* En prueba o sin acceso, elegir plan es lo prioritario */}
        {!isActive && plansSection}

        {!isTrial && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
            <section className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 className="ag-h" style={{ margin: 0 }}>Uso del plan</h2>
              <UsageRow label="Profesionales" current={planInfo?.usage?.employees?.current} max={plan.limits?.maxEmployees} />
              <UsageRow label="Servicios" current={planInfo?.usage?.services?.current} max={plan.limits?.maxServices} />
              <WhatsappQuotaUsage usage={planInfo?.usage?.whatsappAppointmentsThisMonth} />
              <dl className="ag-kv" style={{ gridTemplateColumns: "1fr auto" }}>
                <dt>Almacenamiento</dt>
                <dd className="ag-num">{plan.limits?.maxStorageGB != null ? `${plan.limits.maxStorageGB} GB` : "Ilimitado"}</dd>
                <dt>Recordatorios por cita</dt>
                <dd className="ag-num">{plan.limits?.maxRemindersPerAppointment > 0 ? String(plan.limits.maxRemindersPerAppointment) : "—"}</dd>
              </dl>
            </section>

            <section className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 className="ag-h" style={{ margin: 0 }}>Qué incluye</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                {[...FEATURES]
                  .sort(([a], [b]) => Number(!!(plan.limits as any)?.[b]) - Number(!!(plan.limits as any)?.[a]))
                  .map(([key, label]) => {
                    const included = !!(plan.limits as any)?.[key];
                    return (
                      <div key={key} className="ag-row" style={{ gap: 8, flexWrap: "nowrap", fontSize: 14, color: included ? "var(--ink)" : "var(--ink-subtle)" }}>
                        {included ? <IconCheck size={16} color="var(--success)" style={{ flex: "none" }} /> : <IconX size={16} style={{ flex: "none" }} />}
                        <span style={{ textDecoration: included ? undefined : "line-through" }}>{label}</span>
                      </div>
                    );
                  })}
              </div>
              {plan.characteristics?.length > 0 && (
                <>
                  <button type="button" className="ag-link" style={{ alignSelf: "flex-start", background: "none", border: 0, padding: 0, fontSize: 13, cursor: "pointer" }} onClick={() => setShowDetails((v) => !v)}>
                    {showDetails ? "Ocultar detalle" : "Ver detalle del plan"}
                  </button>
                  <Collapse in={showDetails}>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--ink-muted)" }}>
                      {plan.characteristics.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </Collapse>
                </>
              )}
            </section>
          </div>
        )}

        {isActive && plansSection}
      </div>

      <PaymentMethodsModal opened={paymentModalOpened} onClose={() => setPaymentModalOpened(false)} membership={membership} />
      <ActivatePlanModal opened={!!activatePlan} onClose={() => setActivatePlan(null)} plan={activatePlan} modalTitle={isActive ? "Cambiar de plan" : "Activar mi plan"} />
    </Box>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function UsageRow({ label, current, max }: { label: string; current?: number; max?: number | null }) {
  const used = current ?? 0;
  const pct = max ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div>
      <div className="ag-row" style={{ justifyContent: "space-between", fontSize: 14 }}>
        <span>{label}</span>
        <b className="ag-num">
          {current ?? "—"} de {max != null ? max : "ilimitados"}
        </b>
      </div>
      {max != null && <Progress value={pct} size="sm" mt={6} color={used >= max ? "red" : pct >= 80 ? "orange" : "dark"} />}
    </div>
  );
}

function PlansGrid({
  plans,
  error,
  onRetry,
  actionLabel,
  actionVariant = "filled",
  onSelect,
}: {
  plans: PublicPlan[];
  error: boolean;
  onRetry: () => void;
  actionLabel: string;
  actionVariant?: "filled" | "outline";
  onSelect: (p: PublicPlan) => void;
}) {
  if (error) {
    return (
      <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
        <IconInfoCircle size={20} />
        <div style={{ flex: 1 }}>No pudimos cargar los planes.</div>
        <Button size="xs" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {plans.map((p) => (
        <div key={p._id} className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="ag-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <b style={{ fontSize: 16 }}>{p.displayName}</b>
              {p.domainType === "custom_domain" && <span className="ag-badge ag-badge--brand">Dominio propio</span>}
            </div>
            <div className="ag-num" style={{ marginTop: 4 }}>
              <span style={{ font: "600 22px/28px var(--font-sans)" }}>$ {p.price.toLocaleString("es-CO")}</span>{" "}
              <span className="ag-subtle">
                {p.currency}
                {p.billingCycle !== "lifetime" && ` / ${billingShort(p.billingCycle)}`}
              </span>
            </div>
          </div>
          {p.characteristics?.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {p.characteristics.slice(0, 5).map((c, i) => (
                <li key={i} className="ag-row" style={{ gap: 8, flexWrap: "nowrap", alignItems: "flex-start", fontSize: 14 }}>
                  <IconCheck size={16} color="var(--success)" style={{ flex: "none", marginTop: 2 }} />
                  {c}
                </li>
              ))}
              {p.characteristics.length > 5 && <li className="ag-subtle">+{p.characteristics.length - 5} más</li>}
            </ul>
          )}
          <Button fullWidth variant={actionVariant} onClick={() => onSelect(p)}>
            {actionLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}
