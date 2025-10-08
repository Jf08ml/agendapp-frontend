// src/pages/superadmin/SuperadminOrganizations.tsx
import { useEffect, useState } from "react";
import {
  Table,
  Button,
  TextInput,
  Modal,
  Group,
  Loader,
  Text,
  PasswordInput,
  Notification,
  Checkbox,
  NumberInput,
  FileInput,
  Stack,
} from "@mantine/core";
import {
  getOrganizations,
  Organization,
  updateOrganization,
  createOrganization,
} from "../../services/organizationService";
import { uploadImage } from "../../services/imageService"; // ajusta la ruta si tu archivo se llama diferente
import { TimeInput } from "@mantine/dates";

type Notif = { msg: string; color: "red" | "green" | "yellow" | "blue" } | null;

const ROLE_ADMIN_ID = "67300257f3bc5c256d80e47b"; // tu RoleId admin

const emptyNewOrg = (): Partial<Organization> => ({
  name: "",
  email: "",
  phoneNumber: "",
  address: "",
  password: "",
  location: { lat: 0, lng: 0 },
  isActive: true,
  domains: [],
  branding: {},
});

// HH:mm simple validator
const isHHmm = (s?: string) => !!s && /^\d{2}:\d{2}$/.test(s);

export default function SuperadminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<Notif>(null);

  // Estado para crear organización
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrg, setNewOrg] = useState<Partial<Organization>>(emptyNewOrg());
  const [domainsInput, setDomainsInput] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createNotif, setCreateNotif] = useState<Notif>(null);

  // Horarios (strings "HH:mm")
  const [openingStart, setOpeningStart] = useState<string>("08:00");
  const [openingEnd, setOpeningEnd] = useState<string>("18:00");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setOrgs(await getOrganizations());
      setLoading(false);
    })();
  }, []);

  const filteredOrgs = orgs?.filter(
    (o) =>
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (org: Organization) => {
    setSelectedOrg(org);
    setModalOpen(true);
    setPassword("");
    setNotif(null);
  };

  const handleChangePassword = async () => {
    if (!selectedOrg) return;
    if (!password || password.length < 6) {
      setNotif({ msg: "Contraseña muy corta (mínimo 6)", color: "red" });
      return;
    }
    setSaving(true);
    try {
      await updateOrganization(selectedOrg._id as string, { password });
      setNotif({ msg: "Contraseña actualizada", color: "green" });
      setTimeout(() => setModalOpen(false), 1200);
    } catch (e) {
      console.error("Error al actualizar contraseña:", e);
      setNotif({ msg: "Error al actualizar", color: "red" });
    }
    setSaving(false);
  };

  const openCreate = () => {
    setNewOrg(emptyNewOrg());
    setDomainsInput("");
    setLogoFile(null);
    setFaviconFile(null);
    setCreateNotif(null);
    setOpeningStart("08:00");
    setOpeningEnd("18:00");
    setCreateOpen(true);
  };

  const validateNewOrg = () => {
    if (!newOrg.name?.trim()) return "El nombre es obligatorio";
    if (!newOrg.email?.trim()) return "El email es obligatorio";
    if (!newOrg.phoneNumber?.trim()) return "El teléfono es obligatorio";
    if (!newOrg.password || newOrg.password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres";
    if (
      !newOrg.location ||
      isNaN(Number(newOrg.location.lat)) ||
      isNaN(Number(newOrg.location.lng))
    )
      return "Lat/Lng deben ser números";
    if (!isHHmm(openingStart) || !isHHmm(openingEnd))
      return "Horario inválido, usa formato HH:mm (ej: 08:00 y 18:00)";
    return null;
  };

  const handleCreate = async () => {
    const error = validateNewOrg();
    if (error) {
      setCreateNotif({ msg: error, color: "red" });
      return;
    }

    setCreating(true);
    try {
      // mapear dominios del input
      const domains =
        domainsInput
          ?.split(",")
          .map((d) => d.trim())
          .filter(Boolean) || [];

      // Subir imágenes si las hay
      let logoUrl: string | undefined;
      let faviconUrl: string | undefined;

      if (logoFile) {
        const url = await uploadImage(logoFile);
        if (url) logoUrl = url;
      }
      if (faviconFile) {
        const url = await uploadImage(faviconFile);
        if (url) faviconUrl = url;
      }

      const payload: Organization = {
        name: newOrg.name!.trim(),
        email: newOrg.email!.trim(),
        phoneNumber: newOrg.phoneNumber!.trim(),
        address: newOrg.address?.trim(),
        password: newOrg.password, // el backend debe hashearla
        role: ROLE_ADMIN_ID, // 👈 ObjectId de rol admin
        isActive: newOrg.isActive ?? true,
        location: {
          lat: Number(newOrg.location?.lat ?? 0),
          lng: Number(newOrg.location?.lng ?? 0),
        },
        domains: domains.length ? domains : undefined,
        branding: {
          ...(newOrg.branding || {}),
          logoUrl,
          faviconUrl,
        },
        openingHours: {
          start: openingStart,
          end: openingEnd,
        },
      };

      const created = await createOrganization(payload);
      if (!created) {
        setCreateNotif({
          msg: "No se pudo crear la organización",
          color: "red",
        });
        setCreating(false);
        return;
      }

      // Refrescar lista
      const refreshed = await getOrganizations();
      setOrgs(refreshed);

      setCreateNotif({ msg: "Organización creada", color: "green" });
      setTimeout(() => setCreateOpen(false), 1000);
    } catch (e) {
      console.error("Error al crear organización:", e);
      setCreateNotif({ msg: "Error al crear la organización", color: "red" });
    }
    setCreating(false);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 24 }}>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={600}>
          Organizaciones (Superadmin)
        </Text>
        <Group>
          <TextInput
            placeholder="Buscar por nombre o correo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 250 }}
          />
          <Button onClick={openCreate}>Nueva organización</Button>
        </Group>
      </Group>

      {loading ? (
        <Loader mt={40} />
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Teléfono</Table.Th>
              <Table.Th>Dominio(s)</Table.Th>
              <Table.Th>Activo</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredOrgs &&
              filteredOrgs.map((org) => (
                <Table.Tr key={org._id}>
                  <Table.Td>{org.name}</Table.Td>
                  <Table.Td>{org.email}</Table.Td>
                  <Table.Td>{org.phoneNumber}</Table.Td>
                  <Table.Td>
                    {Array.isArray(org.domains) && org.domains.length
                      ? org.domains.join(", ")
                      : "-"}
                  </Table.Td>
                  <Table.Td>{org.isActive ? "Sí" : "No"}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleOpenModal(org)}
                      >
                        Cambiar contraseña
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Modal: Cambiar contraseña */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Cambiar contraseña de ${selectedOrg?.name}`}
        centered
      >
        <PasswordInput
          label="Nueva contraseña"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={saving}
          mb="md"
        />
        {notif && (
          <Notification
            color={notif.color}
            onClose={() => setNotif(null)}
            mb="md"
          >
            {notif.msg}
          </Notification>
        )}
        <Group justify="end">
          <Button
            onClick={handleChangePassword}
            loading={saving}
            disabled={!password}
          >
            Cambiar contraseña
          </Button>
        </Group>
      </Modal>

      {/* Modal: Nueva organización */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva organización"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text fw={600}>Datos de la organización</Text>
          <TextInput
            label="Nombre *"
            value={newOrg.name || ""}
            onChange={(e) => setNewOrg((p) => ({ ...p, name: e.target.value }))}
          />
          <TextInput
            label="Email *"
            type="email"
            value={newOrg.email || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, email: e.target.value }))
            }
          />
          <TextInput
            label="Teléfono *"
            value={newOrg.phoneNumber || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, phoneNumber: e.target.value }))
            }
          />
          <PasswordInput
            label="Contraseña inicial *"
            placeholder="Mínimo 6 caracteres"
            value={newOrg.password || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, password: e.target.value }))
            }
          />
          <TextInput
            label="Dirección"
            value={newOrg.address || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, address: e.target.value }))
            }
          />
          <Group grow>
            <NumberInput
              label="Latitud"
              value={newOrg.location?.lat ?? 0}
              onChange={(v) =>
                setNewOrg((p) => ({
                  ...p,
                  location: { lat: Number(v ?? 0), lng: p.location?.lng ?? 0 },
                }))
              }
              decimalScale={8}
              allowDecimal
            />
            <NumberInput
              label="Longitud"
              value={newOrg.location?.lng ?? 0}
              onChange={(v) =>
                setNewOrg((p) => ({
                  ...p,
                  location: { lat: p.location?.lat ?? 0, lng: Number(v ?? 0) },
                }))
              }
              decimalScale={8}
              allowDecimal
            />
          </Group>

          {/* Horario requerido - ahora como strings */}
          <TimeInput
            label="Hora de apertura *"
            value={openingStart}
            onChange={(e) => setOpeningStart(e.currentTarget.value)}
          />
          <TimeInput
            label="Hora de cierre *"
            value={openingEnd}
            onChange={(e) => setOpeningEnd(e.currentTarget.value)}
          />

          <TextInput
            label="Dominios (separados por coma)"
            placeholder="ej: midominio.com, app.midominio.com"
            value={domainsInput}
            onChange={(e) => setDomainsInput(e.target.value)}
          />
          <Checkbox
            label="Activo"
            checked={newOrg.isActive ?? true}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, isActive: e.currentTarget.checked }))
            }
          />

          <Text fw={600} mt="sm">
            Branding (opcional)
          </Text>
          <FileInput
            label="Logo"
            placeholder="Selecciona un archivo de imagen"
            value={logoFile}
            onChange={setLogoFile}
            accept="image/*"
            clearable
          />
          <FileInput
            label="Favicon"
            placeholder="Selecciona un archivo de imagen"
            value={faviconFile}
            onChange={setFaviconFile}
            accept="image/*"
            clearable
          />

          {createNotif && (
            <Notification
              color={createNotif.color}
              onClose={() => setCreateNotif(null)}
            >
              {createNotif.msg}
            </Notification>
          )}

          <Group justify="end" mt="xs">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Crear organización
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
