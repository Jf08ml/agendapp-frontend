/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import {
  Drawer, Text, Group, Button, Stack, Loader, ActionIcon, Menu, NumberInput,
  Select, Collapse, TextInput, Checkbox,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconCheck, IconX, IconCash, IconDots,
  IconUserCheck, IconUserX, IconUserPlus, IconPencil, IconCalendarOff, IconNotes,
  IconCircleCheck, IconUsers, IconClock, IconGift,
} from "@tabler/icons-react";
import { toSpanishMeridiem } from "../../../../utils/timeFormatUtils";
import { formatCurrency } from "../../../../utils/formatCurrency";
import { badgeClass, enrollmentState, occupancy, paymentState, sessionState, type StateInfo } from "../classesView";
import { useSelector } from "react-redux";
import { type CountryCode } from "libphonenumber-js";
import { RootState } from "../../../../app/store";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
  ClassSession, Enrollment,
  getSessionEnrollments, approveEnrollment, cancelEnrollment,
  updateAttendance, addEnrollmentPayment, adminCreateEnrollments,
} from "../../../../services/classService";
import InternationalPhoneInput from "../../../../components/InternationalPhoneInput";
import { getActivePackagesForClass } from "../../../../services/packageService";
import { getClientByIdentifier } from "../../../../services/clientService";
import { DEFAULT_CLIENT_FORM_CONFIG, type ClientFieldConfig } from "../../../../services/organizationService";

const IDENTIFIER_LABELS: Record<string, string> = {
  phone: "Teléfono",
  email: "Correo electrónico",
  documentId: "Número de documento",
};

dayjs.extend(utc);
dayjs.extend(timezone);

const STATE_ICONS = {
  check: IconCheck, circleCheck: IconCircleCheck, users: IconUsers, clock: IconClock,
  cash: IconCash, userX: IconUserX, calendarOff: IconCalendarOff, gift: IconGift,
} as const;

interface Props {
  opened: boolean;
  onClose: () => void;
  session: ClassSession | null;
  timezone?: string;
  onEdit?: (s: ClassSession) => void;
  onCancelSession?: (s: ClassSession) => void;
}

// Detalle de sesión (rediseño, ClasesPanel): panel lateral en escritorio y hoja
// inferior en móvil. Datos, cupo, inscritos con estado y pago en palabras,
// agregar asistente, registrar pago, asistencia, editar o cancelar la sesión.
export default function SessionDetailModal({
  opened,
  onClose,
  session,
  timezone: tz = "America/Bogota",
  onEdit,
  onCancelSession,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const org = useSelector((s: RootState) => s.organization.organization) as unknown as {
    _id?: string;
    default_country?: string;
    clientFormConfig?: { identifierField?: "phone" | "email" | "documentId"; fields?: ClientFieldConfig[] };
  } | null;
  const orgCountry = org?.default_country || "CO";
  const currency = useSelector((s: RootState) => s.organization.organization?.currency) || "COP";

  // Config del formulario de cliente de la organización
  const identifierField: "phone" | "email" | "documentId" =
    org?.clientFormConfig?.identifierField ?? DEFAULT_CLIENT_FORM_CONFIG.identifierField;
  const configFields: ClientFieldConfig[] =
    org?.clientFormConfig?.fields?.length ? org.clientFormConfig.fields : DEFAULT_CLIENT_FORM_CONFIG.fields;
  const fieldCfg = (key: ClientFieldConfig["key"]) =>
    configFields.find((f) => f.key === key) ?? { key, enabled: false, required: false };
  const phoneCfg = fieldCfg("phone");
  const emailCfg = fieldCfg("email");
  const documentIdCfg = fieldCfg("documentId");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Estado para pago rápido
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("cash");

  // Estado para inscripción manual (admin)
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState<string | null>(null);
  const [addPhoneCountry, setAddPhoneCountry] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addDocumentId, setAddDocumentId] = useState("");
  const [addApplyDiscount, setAddApplyDiscount] = useState(false);
  // 📦 Paquete del cliente para cubrir la inscripción
  const [pkgOptions, setPkgOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [searchingPkg, setSearchingPkg] = useState(false);
  const [foundClientName, setFoundClientName] = useState<string | null>(null);

  const resetAddForm = () => {
    setAddName("");
    setAddPhone(null);
    setAddPhoneCountry(null);
    setAddEmail("");
    setAddDocumentId("");
    setAddApplyDiscount(false);
    setPkgOptions([]);
    setSelectedPkgId(null);
    setFoundClientName(null);
  };

  // Valor del identificador configurado para esta inscripción
  const identifierValue = (): string => {
    if (identifierField === "phone") return addPhone || "";
    if (identifierField === "email") return addEmail.trim();
    return addDocumentId.trim();
  };
  const hasIdentifier = !!identifierValue();

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await getSessionEnrollments(session._id);
      setEnrollments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened && session) load();
  }, [opened, session]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveEnrollment(id);
      showNotification({ message: "Inscripción aprobada", color: "green" });
      load();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = (id: string) => {
    modals.openConfirmModal({
      title: "Cancelar inscripción",
      children: <Text size="sm">¿Seguro que deseas cancelar esta inscripción? El cupo quedará disponible nuevamente.</Text>,
      labels: { confirm: "Sí, cancelar", cancel: "No" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setActionLoading(id);
        try {
          await cancelEnrollment(id);
          showNotification({ message: "Inscripción cancelada", color: "orange" });
          load();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleAttendance = async (id: string, status: "attended" | "no_show") => {
    setActionLoading(id);
    try {
      await updateAttendance(id, status);
      showNotification({
        message: status === "attended" ? "Asistencia registrada" : "No asistencia registrada",
        color: status === "attended" ? "teal" : "gray",
      });
      load();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddPayment = async (id: string) => {
    if (!payAmount || payAmount <= 0) {
      showNotification({ message: "Ingresa un monto válido", color: "red" });
      return;
    }
    setActionLoading(id);
    try {
      await addEnrollmentPayment(id, {
        amount: payAmount,
        method: payMethod as "cash" | "card" | "transfer" | "other",
      });
      showNotification({ message: "Pago registrado", color: "green" });
      setPayingId(null);
      setPayAmount(0);
      load();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  // Al escribir el identificador: busca el cliente, autocompleta sus datos
  // y detecta sus paquetes activos para esta clase.
  const handleIdentifierLookup = async () => {
    if (!session || !org?._id || !hasIdentifier) return;
    const classId = typeof session.classId === "object" ? session.classId._id : session.classId;
    setSearchingPkg(true);
    setFoundClientName(null);
    try {
      const client = await getClientByIdentifier(identifierField, identifierValue(), org._id);
      if (!client) {
        setPkgOptions([]);
        setSelectedPkgId(null);
        return;
      }
      // Autocompletar datos del cliente (sin pisar lo que ya escribió el admin)
      if (!addName.trim() && client.name) setAddName(client.name);
      if (!addEmail.trim() && client.email) setAddEmail(client.email);
      if (!addDocumentId.trim() && (client as { documentId?: string }).documentId) {
        setAddDocumentId((client as { documentId?: string }).documentId || "");
      }
      setFoundClientName(client.name || null);

      // Detectar paquetes activos del cliente para esta clase
      const packages = await getActivePackagesForClass(client._id, classId, org._id);
      const opts = packages.flatMap((pkg) =>
        (pkg.classes || [])
          .filter((c) => {
            const cId = typeof c.classId === "object" ? c.classId._id : c.classId;
            return cId === classId && c.sessionsRemaining > 0;
          })
          .map((c) => {
            const pkgName = typeof pkg.servicePackageId === "object" ? pkg.servicePackageId.name : "Paquete";
            return { value: pkg._id, label: `${pkgName} · ${c.sessionsRemaining} crédito(s)` };
          })
      );
      setPkgOptions(opts);
      setSelectedPkgId(opts.length ? opts[0].value : null);
    } catch {
      // silencioso
    } finally {
      setSearchingPkg(false);
    }
  };

  const handleAddEnrollment = async () => {
    if (!session) return;
    if (!addName.trim()) {
      showNotification({ message: "Ingresa el nombre del asistente", color: "red" });
      return;
    }
    if (!hasIdentifier) {
      showNotification({ message: `Ingresa ${IDENTIFIER_LABELS[identifierField].toLowerCase()}`, color: "red" });
      return;
    }
    setAddSaving(true);
    try {
      await adminCreateEnrollments({
        sessionId: session._id,
        attendees: [
          {
            name: addName.trim(),
            phone: addPhone || "",
            phone_e164: addPhone || undefined,
            phone_country: addPhoneCountry || undefined,
            email: addEmail.trim() || undefined,
            documentId: addDocumentId.trim() || undefined,
          },
        ],
        applyDiscount: addApplyDiscount,
        clientPackageId: selectedPkgId || undefined,
      });
      showNotification({ message: "Asistente inscrito", color: "green" });
      resetAddForm();
      setAddOpen(false);
      load();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setAddSaving(false);
    }
  };

  if (!session) return null;

  const classDoc = typeof session.classId === "object" ? session.classId : null;
  const room = typeof session.roomId === "object" ? session.roomId : null;
  const employee = typeof session.employeeId === "object" ? session.employeeId : null;
  const start = dayjs(session.startDate).tz(tz);
  const end = dayjs(session.endDate).tz(tz);

  const activeEnrollments = enrollments.filter((e) => e.status !== "cancelled");
  const occupancyPct = occupancy(activeEnrollments.length, session.capacity);
  const editable = session.status !== "cancelled" && session.status !== "completed";
  const sessionInfo = sessionState(session.status);
  const SessionIcon = STATE_ICONS[sessionInfo.icon];
  const timeRange = `${toSpanishMeridiem(start.format("h:mm A"))} – ${toSpanishMeridiem(end.format("h:mm A"))}`;

  const badge = (info: StateInfo) => {
    const Icon = STATE_ICONS[info.icon];
    return (
      <span className={badgeClass(info.tone)} style={{ height: 20, fontSize: 11, padding: "0 8px" }}>
        <Icon size={12} stroke={2} /> {info.label}
      </span>
    );
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Detalle de sesión"
      position={isMobile ? "bottom" : "right"}
      size={isMobile ? "92%" : 520}
      styles={isMobile ? { content: { borderTopLeftRadius: 16, borderTopRightRadius: 16 } } : undefined}
    >
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        {/* Datos de la sesión */}
        <div className="ag-stack" style={{ gap: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <i style={{ width: 12, height: 12, borderRadius: 99, background: classDoc?.color || "var(--line-strong)", marginTop: 7, flex: "none" }} />
            <b style={{ flex: 1, fontSize: 18, lineHeight: "26px" }}>{classDoc?.name || "Clase"}</b>
            <span className={badgeClass(sessionInfo.tone)}>
              <SessionIcon size={12} stroke={2} /> {sessionInfo.label}
            </span>
          </div>
          <span className="ag-muted">
            {(() => { const t = start.format("dddd D [de] MMMM"); return t.charAt(0).toUpperCase() + t.slice(1); })()} · {timeRange}
          </span>
          {(employee || room) && (
            <span className="ag-subtle">{[employee?.names, room?.name].filter(Boolean).join(" · ")}</span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span className={`ag-progress${occupancyPct >= 100 ? "" : " ag-progress--brand"}`} style={{ flex: 1 }}>
              <i style={{ width: `${occupancyPct}%` }} />
            </span>
            <span className="ag-num" style={{ fontSize: 13, fontWeight: 600 }}>
              {activeEnrollments.length}/{session.capacity} cupos
            </span>
          </div>
          {editable && (onEdit || onCancelSession) && (
            <div className="ag-row" style={{ gap: 8, marginTop: 4 }}>
              {onEdit && (
                <Button size="xs" variant="default" leftSection={<IconPencil size={14} />} onClick={() => onEdit(session)}>
                  Editar sesión
                </Button>
              )}
              {onCancelSession && (
                <Button size="xs" variant="subtle" color="red" leftSection={<IconCalendarOff size={14} />} onClick={() => onCancelSession(session)}>
                  Cancelar sesión
                </Button>
              )}
            </div>
          )}
          {session.notes && (
            <div className="ag-alert ag-alert--info" style={{ marginTop: 4 }}>
              <IconNotes size={18} />
              <div>
                <b style={{ display: "block", fontSize: 13 }}>Notas internas</b>
                {session.notes}
              </div>
            </div>
          )}
        </div>

        {/* Inscritos */}
        <div className="ag-stack" style={{ gap: 8 }}>
          <div className="ag-row" style={{ gap: 6 }}>
            <h3 style={{ margin: 0, font: "600 15px/22px var(--mantine-font-family)" }}>Inscritos</h3>
            <span className="ag-badge">{activeEnrollments.length}</span>
            <span style={{ flex: 1 }} />
            {editable && !addOpen && (
              <Button
                size="xs"
                leftSection={<IconUserPlus size={14} />}
                disabled={activeEnrollments.length >= session.capacity}
                onClick={() => setAddOpen(true)}
              >
                Agregar asistente
              </Button>
            )}
          </div>

          {/* Inscripción manual (admin) */}
          {editable && (
            <Collapse in={addOpen}>
              <div className="ag-card" style={{ padding: "var(--space-3)", background: "var(--surface-muted)" }}>
                <Stack gap="xs">
                  {/* Identificador configurado por la organización */}
                  {identifierField === "phone" && (
                    <InternationalPhoneInput
                      label={phoneCfg.label || IDENTIFIER_LABELS.phone}
                      required
                      organizationDefaultCountry={orgCountry as CountryCode}
                      onChange={(e164, country) => {
                        setAddPhone(e164);
                        setAddPhoneCountry(country);
                      }}
                      onBlur={handleIdentifierLookup}
                    />
                  )}
                  {identifierField === "email" && (
                    <TextInput
                      size="xs"
                      label={emailCfg.label || IDENTIFIER_LABELS.email}
                      placeholder="correo@ejemplo.com"
                      type="email"
                      required
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.currentTarget.value)}
                      onBlur={handleIdentifierLookup}
                    />
                  )}
                  {identifierField === "documentId" && (
                    <TextInput
                      size="xs"
                      label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
                      placeholder="Cédula, pasaporte, etc."
                      required
                      value={addDocumentId}
                      onChange={(e) => setAddDocumentId(e.currentTarget.value)}
                      onBlur={handleIdentifierLookup}
                    />
                  )}

                  {searchingPkg && (
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="xs" c="dimmed">Buscando cliente…</Text>
                    </Group>
                  )}
                  {foundClientName && !searchingPkg && (
                    <span className="ag-subtle">
                      Cliente encontrado: <b style={{ color: "var(--ink)" }}>{foundClientName}</b>
                    </span>
                  )}

                  <TextInput
                    size="xs"
                    label="Nombre"
                    placeholder="Nombre del asistente"
                    value={addName}
                    onChange={(e) => setAddName(e.currentTarget.value)}
                    required
                  />

                  {phoneCfg.enabled && identifierField !== "phone" && (
                    <InternationalPhoneInput
                      label={phoneCfg.label || IDENTIFIER_LABELS.phone}
                      required={phoneCfg.required}
                      organizationDefaultCountry={orgCountry as CountryCode}
                      onChange={(e164, country) => {
                        setAddPhone(e164);
                        setAddPhoneCountry(country);
                      }}
                    />
                  )}
                  {emailCfg.enabled && identifierField !== "email" && (
                    <TextInput
                      size="xs"
                      label={emailCfg.label || IDENTIFIER_LABELS.email}
                      placeholder="correo@ejemplo.com"
                      type="email"
                      required={emailCfg.required}
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.currentTarget.value)}
                    />
                  )}
                  {documentIdCfg.enabled && identifierField !== "documentId" && (
                    <TextInput
                      size="xs"
                      label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
                      placeholder="Cédula, pasaporte, etc."
                      required={documentIdCfg.required}
                      value={addDocumentId}
                      onChange={(e) => setAddDocumentId(e.currentTarget.value)}
                    />
                  )}

                  {/* Paquete del cliente (detectado al escribir el identificador) */}
                  {pkgOptions.length > 0 && (
                    <Select
                      size="xs"
                      label="Usar paquete"
                      placeholder="Sin paquete"
                      clearable
                      data={pkgOptions}
                      value={selectedPkgId}
                      onChange={setSelectedPkgId}
                      comboboxProps={{ withinPortal: true, zIndex: 400 }}
                    />
                  )}
                  {selectedPkgId && (
                    <span className="ag-subtle">Esta inscripción usa 1 crédito del paquete (precio $0).</span>
                  )}

                  {classDoc?.groupDiscount?.enabled && !selectedPkgId && (
                    <Checkbox
                      size="xs"
                      label={`Aplicar descuento grupal (${classDoc.groupDiscount.discountPercent} %)`}
                      checked={addApplyDiscount}
                      onChange={(e) => setAddApplyDiscount(e.currentTarget.checked)}
                    />
                  )}
                  <Group justify="flex-end" gap="xs">
                    <Button size="xs" variant="default" onClick={() => { resetAddForm(); setAddOpen(false); }}>
                      Cancelar
                    </Button>
                    <Button size="xs" loading={addSaving} onClick={handleAddEnrollment}>
                      Inscribir
                    </Button>
                  </Group>
                </Stack>
              </div>
            </Collapse>
          )}

          {loading ? (
            <span className="ag-skeleton" style={{ width: "60%", margin: "8px 0" }} />
          ) : enrollments.length === 0 ? (
            <span className="ag-subtle">Aún no hay inscritos en esta sesión.</span>
          ) : (
            <div className="ag-card" style={{ overflow: "hidden" }}>
              {enrollments.map((e) => (
                <div key={e._id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: "block", fontSize: 14 }}>{e.attendee.name}</b>
                      <span className="ag-subtle ag-num">
                        {e.attendee.phone}
                        {e.discountPercent > 0 ? ` · −${e.discountPercent} % grupal` : ""}
                      </span>
                      <div className="ag-row" style={{ gap: 4, marginTop: 4 }}>
                        {badge(enrollmentState(e.status))}
                        {badge(paymentState(e.paymentStatus))}
                      </div>
                    </div>
                    <b className="ag-num" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                      {formatCurrency(e.totalPrice, currency)}
                    </b>
                    {e.status !== "cancelled" && (
                      <Menu shadow="lg" withinPortal position="bottom-end" zIndex={400}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" loading={actionLoading === e._id} aria-label={`Acciones de ${e.attendee.name}`}>
                            <IconDots size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {e.status === "pending" && (
                            <Menu.Item leftSection={<IconCheck size={16} />} onClick={() => handleApprove(e._id)}>
                              Aprobar
                            </Menu.Item>
                          )}
                          {["pending", "confirmed"].includes(e.status) && (
                            <>
                              <Menu.Item leftSection={<IconUserCheck size={16} />} onClick={() => handleAttendance(e._id, "attended")}>
                                Marcar asistencia
                              </Menu.Item>
                              <Menu.Item leftSection={<IconUserX size={16} />} onClick={() => handleAttendance(e._id, "no_show")}>
                                No asistió
                              </Menu.Item>
                              <Menu.Item leftSection={<IconCash size={16} />} onClick={() => { setPayingId(e._id); setPayAmount(e.totalPrice); }}>
                                Registrar pago
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item leftSection={<IconX size={16} />} color="red" onClick={() => handleCancel(e._id)}>
                                Cancelar inscripción
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </div>

                  {/* Registrar pago en línea */}
                  {payingId === e._id && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "0 12px 12px" }}>
                      <NumberInput
                        size="xs"
                        label="Monto"
                        prefix="$"
                        thousandSeparator="."
                        decimalSeparator=","
                        value={payAmount}
                        onChange={(v) => setPayAmount(Number(v))}
                        style={{ width: 140 }}
                      />
                      <Select
                        size="xs"
                        label="Método"
                        value={payMethod}
                        onChange={(v) => setPayMethod(v || "cash")}
                        data={[
                          { value: "cash", label: "Efectivo" },
                          { value: "transfer", label: "Transferencia" },
                          { value: "card", label: "Tarjeta" },
                          { value: "other", label: "Otro" },
                        ]}
                        style={{ width: 140 }}
                        comboboxProps={{ withinPortal: true, zIndex: 400 }}
                      />
                      <Button size="xs" loading={actionLoading === e._id} onClick={() => handleAddPayment(e._id)}>
                        Guardar pago
                      </Button>
                      <Button size="xs" variant="default" onClick={() => setPayingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
