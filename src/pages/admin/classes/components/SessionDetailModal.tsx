/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Modal, Text, Badge, Table, Group, Button, Stack, Loader,
  Center, ActionIcon, Menu, Divider, NumberInput,
  Select, ScrollArea, Alert, Progress, Collapse, TextInput, Checkbox, Paper,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconCheck, IconX, IconCash, IconDots,
  IconUserCheck, IconUserX, IconAlertCircle, IconUserPlus,
} from "@tabler/icons-react";
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

const STATUS_COLORS: Record<string, string> = {
  pending: "yellow",
  confirmed: "green",
  cancelled: "red",
  attended: "teal",
  no_show: "gray",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  attended: "Asistió",
  no_show: "No asistió",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "red",
  partial: "yellow",
  paid: "green",
  free: "blue",
};

interface Props {
  opened: boolean;
  onClose: () => void;
  session: ClassSession | null;
  timezone?: string;
}

export default function SessionDetailModal({ opened, onClose, session, timezone: tz = "America/Bogota" }: Props) {
  const org = useSelector((s: RootState) => s.organization.organization) as unknown as {
    _id?: string;
    default_country?: string;
    clientFormConfig?: { identifierField?: "phone" | "email" | "documentId"; fields?: ClientFieldConfig[] };
  } | null;
  const orgCountry = org?.default_country || "CO";

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
  const occupancyPct = session.capacity > 0 ? Math.round((activeEnrollments.length / session.capacity) * 100) : 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Detalle de sesión"
      centered
      size="xl"
    >
      <Stack gap="sm">
        {/* Header info */}
        <Group justify="space-between" wrap="wrap">
          <div>
            <Text fw={700} size="lg">{classDoc?.name || "Clase"}</Text>
            <Text size="sm" c="dimmed">
              {start.format("dddd D [de] MMMM YYYY")} · {start.format("HH:mm")} – {end.format("HH:mm")}
            </Text>
            {employee && <Text size="sm" c="dimmed">Instructor: {employee.names}</Text>}
            {room && <Text size="sm" c="dimmed">Salón: {room.name}</Text>}
          </div>
          <Badge size="lg" color={STATUS_COLORS[session.status] ?? "gray"}>
            {session.status === "open" ? "Disponible" : session.status === "full" ? "Llena" : session.status}
          </Badge>
        </Group>

        {/* Ocupación */}
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">Ocupación</Text>
            <Text size="xs" fw={600}>{activeEnrollments.length} / {session.capacity}</Text>
          </Group>
          <Progress value={occupancyPct} color={occupancyPct >= 100 ? "red" : "blue"} size="sm" radius="xl" />
        </div>

        <Divider />

        {/* Inscripción manual (admin) */}
        {session.status !== "cancelled" && session.status !== "completed" && (
          <div>
            <Group justify="space-between">
              <Text size="sm" fw={600}>Inscritos</Text>
              <Button
                size="xs"
                variant={addOpen ? "default" : "light"}
                leftSection={<IconUserPlus size={14} />}
                disabled={activeEnrollments.length >= session.capacity}
                onClick={() => setAddOpen((o) => !o)}
              >
                {addOpen ? "Cerrar" : "Agregar asistente"}
              </Button>
            </Group>

            <Collapse in={addOpen}>
              <Paper withBorder p="sm" radius="md" mt="xs" bg="var(--mantine-color-gray-0)">
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

                  {/* Feedback de búsqueda del cliente */}
                  {searchingPkg && (
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="xs" c="dimmed">Buscando cliente...</Text>
                    </Group>
                  )}
                  {foundClientName && !searchingPkg && (
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">Cliente encontrado:</Text>
                      <Badge size="sm" variant="light">{foundClientName}</Badge>
                    </Group>
                  )}

                  <TextInput
                    size="xs"
                    label="Nombre"
                    placeholder="Nombre del asistente"
                    value={addName}
                    onChange={(e) => setAddName(e.currentTarget.value)}
                    required
                  />

                  {/* Campos secundarios habilitados (distintos al identificador) */}
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

                  {/* 📦 Paquete del cliente (detectado automáticamente al escribir el identificador) */}
                  {pkgOptions.length > 0 && (
                    <Select
                      size="xs"
                      label="Usar paquete"
                      placeholder="Sin paquete"
                      clearable
                      data={pkgOptions}
                      value={selectedPkgId}
                      onChange={setSelectedPkgId}
                    />
                  )}
                  {selectedPkgId && (
                    <Text size="xs" c="grape">Esta inscripción se cubrirá con 1 crédito del paquete (precio $0).</Text>
                  )}

                  {classDoc?.groupDiscount?.enabled && !selectedPkgId && (
                    <Checkbox
                      size="xs"
                      label={`Aplicar descuento grupal (${classDoc.groupDiscount.discountPercent}%)`}
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
              </Paper>
            </Collapse>
          </div>
        )}

        {/* Lista de inscritos */}
        {loading ? (
          <Center h={100}><Loader size="sm" /></Center>
        ) : enrollments.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="gray">
            No hay inscripciones para esta sesión aún.
          </Alert>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Asistente</Table.Th>
                  <Table.Th>Teléfono</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Pago</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {enrollments.map((e) => (
                  <React.Fragment key={e._id}>
                    <Table.Tr>
                      <Table.Td>
                        <Text size="sm" fw={500}>{e.attendee.name}</Text>
                        {e.discountPercent > 0 && (
                          <Text size="xs" c="green">Descuento {e.discountPercent}%</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{e.attendee.phone}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={STATUS_COLORS[e.status] ?? "gray"}>
                          {STATUS_LABELS[e.status] ?? e.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={PAYMENT_COLORS[e.paymentStatus] ?? "gray"} variant="light">
                          {e.paymentStatus === "unpaid" ? "Sin pago" :
                           e.paymentStatus === "partial" ? "Parcial" :
                           e.paymentStatus === "paid" ? "Pagado" : "Gratis"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">${e.totalPrice.toLocaleString("es-CO")}</Text>
                      </Table.Td>
                      <Table.Td>
                        {e.status !== "cancelled" && (
                          <Menu shadow="md" withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle" size="sm" loading={actionLoading === e._id}>
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {e.status === "pending" && (
                                <Menu.Item
                                  leftSection={<IconCheck size={14} />}
                                  onClick={() => handleApprove(e._id)}
                                >
                                  Aprobar
                                </Menu.Item>
                              )}
                              {["pending", "confirmed"].includes(e.status) && (
                                <>
                                  <Menu.Item
                                    leftSection={<IconUserCheck size={14} />}
                                    onClick={() => handleAttendance(e._id, "attended")}
                                  >
                                    Marcar asistencia
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconUserX size={14} />}
                                    onClick={() => handleAttendance(e._id, "no_show")}
                                  >
                                    No asistió
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconCash size={14} />}
                                    onClick={() => { setPayingId(e._id); setPayAmount(e.totalPrice); }}
                                  >
                                    Registrar pago
                                  </Menu.Item>
                                  <Menu.Divider />
                                  <Menu.Item
                                    leftSection={<IconX size={14} />}
                                    color="red"
                                    onClick={() => handleCancel(e._id)}
                                  >
                                    Cancelar inscripción
                                  </Menu.Item>
                                </>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        )}
                      </Table.Td>
                    </Table.Tr>

                    {/* Panel de pago inline */}
                    {payingId === e._id && (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Group gap="sm" p="xs" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
                            <NumberInput
                              size="xs"
                              label="Monto"
                              prefix="$"
                              thousandSeparator=","
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
                            />
                            <Button size="xs" mt="lg" loading={actionLoading === e._id} onClick={() => handleAddPayment(e._id)}>
                              Guardar
                            </Button>
                            <Button size="xs" mt="lg" variant="default" onClick={() => setPayingId(null)}>
                              Cancelar
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </React.Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>
    </Modal>
  );
}
