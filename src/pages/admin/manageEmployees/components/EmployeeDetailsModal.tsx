// Perfil y pagos del profesional (rediseño, ProfesionalesPanel): una sola vista
// en lugar de detalles + adelantos + ingresos. Escritorio: panel lateral; móvil:
// pantalla completa. Período de pago, cifras (2×2 en móvil), citas del período
// con comisión «Normal / Personalizada», adelantos e ingresos manuales. Mismo
// cálculo de siempre. El horario se edita ahora en el editor del profesional.
import React, { useEffect, useMemo, useState } from "react";
import { Button, Drawer, NumberInput, Select } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import { IconCash, IconPencil, IconTrendingUp } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { Appointment, getAppointmentsByEmployee } from "../../../../services/appointmentService";
import { Advance, getAdvancesByEmployee } from "../../../../services/advanceService";
import { Employee } from "../../../../services/employeeService";
import { selectOrganization } from "../../../../features/organization/sliceOrganization";
import { formatCurrency as formatCurrencyUtil } from "../../../../utils/formatCurrency";
import { appointmentStatus } from "../../../../components/customCalendar/appointmentStatus";
import { EmployeeAvatar, OnlineBookingBadge } from "./EmployeeRow";

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit?: (e: Employee) => void;
  onAdvance?: (e: Employee) => void;
  onIncome?: (e: Employee) => void;
  /** Cambia cuando se registra un adelanto o ingreso, para volver a cargar. */
  refreshKey?: number;
}

type IntervalKey = "daily" | "weekly" | "biweekly" | "monthly" | "custom";

function rangeFor(interval: IntervalKey): [Date | null, Date | null] {
  const now = new Date();
  switch (interval) {
    case "daily":
      return [dayjs(now).startOf("day").toDate(), dayjs(now).endOf("day").toDate()];
    case "weekly": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1); // Lunes
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return [start, end];
    }
    case "biweekly":
      return now.getDate() <= 15
        ? [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth(), 15)]
        : [new Date(now.getFullYear(), now.getMonth(), 16), new Date(now.getFullYear(), now.getMonth() + 1, 0)];
    case "monthly":
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)];
    default:
      return [null, null];
  }
}

const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEdit,
  onAdvance,
  onIncome,
  refreshKey = 0,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [incomes, setIncomes] = useState<Advance[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [interval, setInterval] = useState<IntervalKey>("daily");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [customCommissionValue, setCustomCommissionValue] = useState<number | undefined>(undefined);

  const org = useSelector(selectOrganization);
  const money = (value: number) => formatCurrencyUtil(value, org?.currency || "COP");

  useEffect(() => {
    if (employee && isOpen && interval !== "custom") {
      const [s, e] = rangeFor(interval);
      setStartDate(s);
      setEndDate(e);
    }
  }, [employee, isOpen, interval]);

  useEffect(() => {
    if (!employee || !isOpen || !startDate || !endDate) return;
    const end = dayjs(endDate).endOf("day").toDate();
    const inRange = (d: string | Date) => new Date(d) >= startDate && new Date(d) <= end;

    setLoadingAppointments(true);
    getAppointmentsByEmployee(employee._id)
      .then((list) => setAppointments(list.filter((a) => inRange(a.startDate))))
      .catch((error) => console.error("Error al cargar citas del profesional", error))
      .finally(() => setLoadingAppointments(false));

    setLoadingAdvances(true);
    getAdvancesByEmployee(employee._id)
      .then((list) => {
        const r = list.filter((a) => inRange(a.date));
        setAdvances(r.filter((a) => a.type !== "income"));
        setIncomes(r.filter((a) => a.type === "income"));
      })
      .catch((error) => console.error("Error al cargar avances del profesional", error))
      .finally(() => setLoadingAdvances(false));
  }, [employee, isOpen, startDate, endDate, refreshKey]);

  // Mismo cálculo de nómina de siempre: los ingresos manuales cuentan como una
  // cita atendida; la comisión fija se paga por cada una.
  const payroll = useMemo(() => {
    const attended = appointments.filter((a) => a.status === "attended");
    const appointmentsRevenue = attended.reduce((t, a) => t + (a.totalPrice || 0), 0);
    const totalIncomes = incomes.reduce((t, i) => t + i.amount, 0);
    const totalRevenue = appointmentsRevenue + totalIncomes;
    const commissionUnits = attended.length + incomes.length;
    const commissionType = employee?.commissionType ?? "percentage";
    const commissionValue = customCommissionValue ?? employee?.commissionValue ?? 0;
    const commissionAmount =
      commissionType === "percentage" ? (totalRevenue * commissionValue) / 100 : commissionUnits * commissionValue;
    const totalAdvances = advances.reduce((t, a) => t + a.amount, 0);
    return {
      attendedCount: attended.length,
      totalRevenue,
      commissionType,
      commissionValue,
      commissionAmount,
      totalAdvances,
      totalIncomes,
      finalEarnings: commissionAmount - totalAdvances,
    };
  }, [appointments, advances, incomes, customCommissionValue, employee]);

  if (!employee) return null;

  const commissionText =
    payroll.commissionType === "fixed" ? `${money(payroll.commissionValue)} por cita` : `${payroll.commissionValue} %`;

  const stat = (label: string, value: string, hint?: string, strong?: boolean) => (
    <div
      className="ag-card"
      style={{ padding: "var(--space-3) var(--space-4)", background: strong ? "var(--surface-muted)" : undefined }}
    >
      <div className="ag-stat__label">{label}</div>
      <div style={{ font: "600 20px/28px var(--mantine-font-family)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {hint && <div className="ag-subtle" style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );

  const sectionTitle = (title: string, count?: number) => (
    <div className="ag-row" style={{ gap: 6, marginBottom: 4 }}>
      <h3 style={{ margin: 0, font: "600 15px/22px var(--mantine-font-family)" }}>{title}</h3>
      {typeof count === "number" && <span className="ag-badge">{count}</span>}
    </div>
  );

  const loadingRow = <span className="ag-skeleton" style={{ width: "60%", margin: "8px 0" }} />;

  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
      position="right"
      size={isMobile ? "100%" : 560}
      title="Perfil y pagos"
    >
      <div className="ag-stack" style={{ gap: "var(--space-5)" }}>
        {/* Encabezado */}
        <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
          <div className="ag-row" style={{ gap: "var(--space-3)", flexWrap: "nowrap" }}>
            <EmployeeAvatar employee={employee} size={48} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <b style={{ display: "block", fontSize: 17 }}>{employee.names}</b>
              <span className="ag-subtle">
                {employee.position}
                {employee.phoneNumber ? ` · ${employee.phoneNumber}` : ""}
              </span>
            </div>
            {!isMobile && <OnlineBookingBadge employee={employee} />}
          </div>
          <div className="ag-row" style={{ gap: 8 }}>
            {onAdvance && (
              <Button size="xs" variant="default" leftSection={<IconCash size={14} />} onClick={() => onAdvance(employee)}>
                Registrar adelanto
              </Button>
            )}
            {onIncome && (
              <Button size="xs" variant="default" leftSection={<IconTrendingUp size={14} />} onClick={() => onIncome(employee)}>
                Registrar ingreso
              </Button>
            )}
            {onEdit && (
              <Button size="xs" variant="subtle" color="gray" leftSection={<IconPencil size={14} />} onClick={() => onEdit(employee)}>
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Período */}
        <div className="ag-stack" style={{ gap: 8 }}>
          <div className="ag-row" style={{ gap: 8, alignItems: "flex-end" }}>
            <Select
              label="Período de pago"
              data={[
                { value: "daily", label: "Hoy" },
                { value: "weekly", label: "Esta semana" },
                { value: "biweekly", label: "Esta quincena" },
                { value: "monthly", label: "Este mes" },
                { value: "custom", label: "Personalizado" },
              ]}
              value={interval}
              onChange={(v) => setInterval((v as IntervalKey) || "daily")}
              allowDeselect={false}
              w={180}
              comboboxProps={{ withinPortal: true, zIndex: 400 }}
            />
            <NumberInput
              label="Comisión para este cálculo"
              placeholder={
                employee.commissionType === "fixed"
                  ? `${money(employee.commissionValue ?? 0)} por cita`
                  : `${employee.commissionValue ?? 0} %`
              }
              min={0}
              max={employee.commissionType === "percentage" ? 100 : undefined}
              value={customCommissionValue ?? ""}
              onChange={(val) => setCustomCommissionValue(typeof val === "number" ? val : undefined)}
              rightSection={<span className="ag-subtle" style={{ paddingRight: 4 }}>{employee.commissionType === "fixed" ? "$" : "%"}</span>}
              w={200}
            />
          </div>
          {interval === "custom" ? (
            <div className="ag-row" style={{ gap: 8 }}>
              <DatePickerInput label="Desde" value={startDate} onChange={setStartDate} w={160} popoverProps={{ zIndex: 400 }} />
              <DatePickerInput label="Hasta" value={endDate} onChange={setEndDate} w={160} popoverProps={{ zIndex: 400 }} />
            </div>
          ) : (
            <span className="ag-subtle">
              {startDate && endDate
                ? dayjs(startDate).isSame(endDate, "day")
                  ? startDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
                  : `Del ${startDate.toLocaleDateString("es-CO", { day: "numeric", month: "long" })} al ${endDate.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}`
                : ""}
              {customCommissionValue === undefined && ` · Comisión: ${commissionText}`}
            </span>
          )}
        </div>

        {/* Cifras */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {stat(
            "Facturado",
            money(payroll.totalRevenue),
            `${payroll.attendedCount} ${payroll.attendedCount === 1 ? "cita atendida" : "citas atendidas"}${
              incomes.length ? ` + ${incomes.length} ${incomes.length === 1 ? "ingreso" : "ingresos"}` : ""
            }`
          )}
          {stat("Comisión", money(payroll.commissionAmount), commissionText)}
          {stat("Adelantos", payroll.totalAdvances ? `−${money(payroll.totalAdvances)}` : money(0), `${advances.length} en el período`)}
          {stat("A pagar", money(payroll.finalEarnings), "Comisión menos adelantos", true)}
        </div>

        {/* Citas del período */}
        <div>
          {sectionTitle("Citas del período", appointments.length)}
          {loadingAppointments ? (
            loadingRow
          ) : appointments.length === 0 ? (
            <span className="ag-subtle">No hay citas en este período.</span>
          ) : (
            <div className="ag-card" style={{ overflow: "hidden" }}>
              {appointments.map((a) => {
                const st = appointmentStatus(a.status);
                const Icon = st.icon;
                return (
                  <div key={a._id} className="ag-list-row" style={{ padding: "10px 12px", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: "block", fontSize: 14 }}>{a.client?.name || "Sin cliente"}</b>
                      <span className="ag-subtle">
                        {fmtDate(a.startDate)} · {a.service?.name || "Servicio"}
                      </span>
                      <div className="ag-row" style={{ gap: 4, marginTop: 4 }}>
                        <span className={`ag-badge ag-badge--${st.tone}`} style={{ height: 20, fontSize: 11, padding: "0 8px" }}>
                          <Icon size={12} stroke={2} /> {st.label}
                        </span>
                        <span className="ag-badge" style={{ height: 20, fontSize: 11, padding: "0 8px" }}>
                          {a.customPrice != null ? "Precio personalizado" : "Precio normal"}
                        </span>
                      </div>
                    </div>
                    <b className="ag-num" style={{ fontSize: 14, whiteSpace: "nowrap" }}>{money(a.totalPrice || 0)}</b>
                  </div>
                );
              })}
            </div>
          )}
          <span className="ag-subtle" style={{ display: "block", marginTop: 6, fontSize: 12 }}>
            Solo las citas atendidas suman a la comisión.
          </span>
        </div>

        {/* Adelantos */}
        <div>
          {sectionTitle("Adelantos", advances.length)}
          {loadingAdvances ? (
            loadingRow
          ) : advances.length === 0 ? (
            <span className="ag-subtle">No hay adelantos en este período.</span>
          ) : (
            <div className="ag-card" style={{ overflow: "hidden" }}>
              {advances.map((a) => (
                <div key={a._id} className="ag-list-row" style={{ padding: "10px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{a.description || "Sin descripción"}</span>
                    <span className="ag-subtle" style={{ display: "block" }}>{fmtDate(a.date)}</span>
                  </div>
                  <b className="ag-num" style={{ fontSize: 14 }}>−{money(a.amount)}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingresos manuales */}
        <div style={{ paddingBottom: "var(--space-4)" }}>
          {sectionTitle("Ingresos manuales", incomes.length)}
          {loadingAdvances ? (
            loadingRow
          ) : incomes.length === 0 ? (
            <span className="ag-subtle">No hay ingresos manuales en este período.</span>
          ) : (
            <div className="ag-card" style={{ overflow: "hidden" }}>
              {incomes.map((i) => (
                <div key={i._id} className="ag-list-row" style={{ padding: "10px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{i.description || "Sin descripción"}</span>
                    <span className="ag-subtle" style={{ display: "block" }}>{fmtDate(i.date)}</span>
                  </div>
                  <b className="ag-num" style={{ fontSize: 14 }}>{money(i.amount)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default EmployeeDetailsModal;
