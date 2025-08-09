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
} from "@mantine/core";
import {
  getOrganizations,
  Organization,
  updateOrganization,
} from "../../services/organizationService";

export default function SuperadminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; color: string } | null>(
    null
  );

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
      setNotif({ msg: "Contraseña muy corta", color: "red" });
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

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 24 }}>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={600}>
          Organizaciones (Superadmin)
        </Text>
        <TextInput
          placeholder="Buscar por nombre o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 250 }}
        />
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
              <Table.Th>Dominio</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredOrgs && filteredOrgs.map((org) => (
              <Table.Tr key={org._id}>
                <Table.Td>{org.name}</Table.Td>
                <Table.Td>{org.email}</Table.Td>
                <Table.Td>{org.phoneNumber}</Table.Td>
                <Table.Td>{org.domains || "-"}</Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleOpenModal(org)}
                  >
                    Cambiar contraseña
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

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
    </div>
  );
}
