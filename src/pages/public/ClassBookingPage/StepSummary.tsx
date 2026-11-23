// Paso 4 · Resumen (rediseño, ClasesPublico): clase, sesiones, personas y precio
// por persona y sesión, o el aviso de que se paga con el paquete.
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import { IconPackage } from "@tabler/icons-react";
import { ClassType, ClassSession } from "../../../services/classService";
import { AttendeeForm } from "./StepAttendees";
import { MpDepositNotice } from "../../../components/MpDepositNotice";
import { formatCurrency } from "../../../utils/formatCurrency";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

interface Props {
  classDoc: ClassType | null;
  sessions: ClassSession[];
  attendee: AttendeeForm;
  companion: AttendeeForm | null;
  timezone?: string;
  /** Si la inscripción exige abono, info del depósito a mostrar. */
  deposit?: { percentage: number; currency: string } | null;
  /** Se usa un paquete que cubre la inscripción: el costo es 0. */
  usingPackage?: boolean;
  currency?: string;
  timeFormat?: string;
}

const amPm = (s: string) => s.replace(/\s?AM\b/, " a. m.").replace(/\s?PM\b/, " p. m.");

export default function StepSummary({
  classDoc,
  sessions,
  attendee,
  companion,
  timezone: tz = "America/Bogota",
  deposit,
  usingPackage = false,
  currency = "COP",
  timeFormat,
}: Props) {
  if (!classDoc || sessions.length === 0) return null;

  const fmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const money = (n: number) => formatCurrency(n, currency);
  const numPeople = companion ? 2 : 1;
  const numSessions = sessions.length;
  const discount = classDoc.groupDiscount;
  const discountApplies = discount?.enabled && numPeople >= (discount.minPeople ?? 2) && (!discount.maxPeople || numPeople <= discount.maxPeople);
  const discountPct = discountApplies ? discount!.discountPercent : 0;
  const pricePerPerson = usingPackage ? 0 : classDoc.pricePerPerson;
  const finalPerPerson = usingPackage ? 0 : Math.round(pricePerPerson * (1 - discountPct / 100));
  const total = usingPackage ? 0 : finalPerPerson * numPeople * numSessions;
  const subtotal = pricePerPerson * numPeople * numSessions;

  // Instructor y salón: se muestran si son los mismos en todas las sesiones.
  const first = sessions[0];
  const employee = typeof first.employeeId === "object" ? first.employeeId : null;
  const room = typeof first.roomId === "object" ? first.roomId : null;
  const sameEmployee = sessions.every((s) => (typeof s.employeeId === "object" ? s.employeeId?._id : s.employeeId) === employee?._id);
  const sameRoom = sessions.every((s) => (typeof s.roomId === "object" ? s.roomId?._id : s.roomId) === room?._id);
  const attendees = [attendee, ...(companion ? [companion] : [])];

  const line = (label: string, value: string, strong = false) => (
    <div className="ag-row" style={{ justifyContent: "space-between", fontSize: strong ? 16 : 14, fontWeight: strong ? 600 : 400 }}>
      <span className={strong ? undefined : "ag-muted"}>{label}</span>
      <span className="ag-num">{value}</span>
    </div>
  );

  return (
    <div className="ag-stack" style={{ gap: 14 }}>
      <h2 className="ag-h" style={{ margin: 0 }}>Resumen</h2>

      <div className="ag-card" style={{ padding: 16 }}>
        <dl className="ag-kv" style={{ gridTemplateColumns: "110px 1fr" }}>
          <dt>Clase</dt>
          <dd>
            <b>{classDoc.name}</b>
          </dd>
          <dt>{numSessions === 1 ? "Sesión" : `${numSessions} sesiones`}</dt>
          <dd>
            {sessions.map((s) => {
              const a = dayjs(s.startDate).tz(tz);
              const b = dayjs(s.endDate).tz(tz);
              const day = a.format("dddd D [de] MMMM");
              return (
                <div key={s._id} className="ag-num">
                  {day.charAt(0).toUpperCase() + day.slice(1)} · {amPm(a.format(fmt))} – {amPm(b.format(fmt))}
                </div>
              );
            })}
          </dd>
          {employee && sameEmployee && (
            <>
              <dt>Instructor</dt>
              <dd>{employee.names}</dd>
            </>
          )}
          {room && sameRoom && (
            <>
              <dt>Salón</dt>
              <dd>{room.name}</dd>
            </>
          )}
          <dt>{numPeople === 1 ? "Persona" : "Personas"}</dt>
          <dd>
            {attendees.map((a, i) => (
              <div key={i}>
                {a.name}
                {i > 0 && <span className="ag-subtle"> · acompañante</span>}
              </div>
            ))}
          </dd>
        </dl>
      </div>

      {usingPackage ? (
        <div className="ag-alert ag-alert--success">
          <IconPackage size={20} />
          <div>
            {numSessions > 1
              ? `Tus ${numSessions} sesiones se pagan con tu paquete: no pagas nada ahora.`
              : "Esta inscripción se paga con tu paquete: no pagas nada ahora."}
          </div>
        </div>
      ) : classDoc.hidePrice ? null : (
        <div className="ag-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {line(numSessions > 1 ? "Precio por persona y sesión" : "Precio por persona", money(pricePerPerson))}
          {(numPeople > 1 || numSessions > 1) &&
            line([numPeople > 1 ? `${numPeople} personas` : null, numSessions > 1 ? `${numSessions} sesiones` : null].filter(Boolean).join(" × "), money(subtotal))}
          {discountApplies && line(`Descuento grupal (${discountPct} %)`, `− ${money(subtotal - total)}`)}
          <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />
          {line("Total", money(total), true)}
        </div>
      )}

      {deposit && deposit.percentage > 0 && (
        <MpDepositNotice
          percentage={deposit.percentage}
          currency={deposit.currency}
          amount={classDoc.hidePrice ? undefined : Math.round((total * deposit.percentage) / 100)}
          objectLabel="tu inscripción"
        />
      )}
    </div>
  );
}
