// «Así se calcula» (design system, AjustesCobros · Fase 2): el abono de ejemplo
// con un servicio real del negocio y la regla que se está editando.
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { IconCalculator } from "@tabler/icons-react";
import { RootState } from "../../../../app/store";
import { getServicesByOrganizationId, type Service } from "../../../../services/serviceService";
import { computeServiceDeposit, resolveDepositRule, type OrgDepositConfig } from "../../../../utils/deposit";
import { formatCurrency } from "../../../../utils/formatCurrency";

/** Un servicio activo con precio, preferiblemente uno que usa la regla general. */
function pickExample(services: Service[]): Service | null {
  const priced = services.filter((s) => s.isActive !== false && Number(s.price) > 0 && !s.hidePrice);
  return priced.find((s) => !s.deposit || s.deposit.mode === "inherit") ?? priced[0] ?? null;
}

export default function DepositExample({ config, organizationId }: { config: OrgDepositConfig; organizationId?: string }) {
  // Superadmin edita otra organización: usa la suya, no la del dominio actual.
  const currentOrgId = useSelector((s: RootState) => s.organization.organization?._id);
  const orgId = organizationId ?? currentOrgId;
  const [services, setServices] = useState<Service[] | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    getServicesByOrganizationId(orgId)
      .then((list) => alive && setServices(list))
      .catch(() => alive && setServices([]));
    return () => {
      alive = false;
    };
  }, [orgId]);

  const example = services ? pickExample(services) : null;
  if (!example) return null;

  const currency = config.currency;
  const money = (n: number) => formatCurrency(n, currency);
  const price = Number(example.price);
  const deposit = computeServiceDeposit({ ...config, requireReservationDeposit: true }, example);
  const rule = resolveDepositRule(config, example);
  const ownRule = !!example.deposit && example.deposit.mode !== "inherit";
  const how =
    rule.mode === "percentage"
      ? `el ${rule.value} % de ${money(price)}`
      : rule.value > price
        ? `el monto fijo, que no puede superar el precio (${money(price)})`
        : `el monto fijo de ${money(rule.value)}`;

  return (
    <div className="ag-card" style={{ padding: "var(--space-3) var(--space-4)", background: "var(--surface-hover)" }}>
      <div className="ag-row" style={{ gap: 6, alignItems: "center", marginBottom: 6 }}>
        <IconCalculator size={16} stroke={1.75} />
        <b style={{ fontSize: 14 }}>Así se calcula</b>
      </div>
      <div style={{ fontSize: 14 }}>
        Si alguien reserva <b>{example.name}</b> ({money(price)}), abona <b className="ag-num">{money(deposit)}</b> ({how}) y paga{" "}
        <b className="ag-num">{money(Math.max(price - deposit, 0))}</b> en el negocio.
      </div>
      {ownRule && (
        <div className="ag-muted" style={{ fontSize: 13, marginTop: 4 }}>
          Este servicio tiene su propio abono; los que usan la regla general se calculan con lo que pongas aquí.
        </div>
      )}
      <div className="ag-muted" style={{ fontSize: 13, marginTop: 4 }}>Si reserva varios servicios, se suma el abono de cada uno.</div>
    </div>
  );
}
