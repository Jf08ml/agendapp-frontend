import React from "react";
import { Client } from "../../../services/clientService";
import { ActionIcon, Badge, Group, Menu, Table, Text, Tooltip } from "@mantine/core";
import { BiTrash } from "react-icons/bi";
import { CgAdd, CgOptions, CgUserAdd } from "react-icons/cg";
import { MdEdit, MdMerge, MdVisibility, MdRestartAlt } from "react-icons/md";
import { FaTrophy } from "react-icons/fa";
import { getCountryFlag, getCountryName } from "../../../utils/countryHelper";

const ClientRow = React.memo(
  ({
    client,
    loadingClientId,
    setModalTitle,
    fetchAppointments,
    confirmAction,
    handleRegisterService,
    handleReferral,
    handleEditClient,
    handleDeleteClient,
    handleViewRewards,
    handleMergeClient,
    handleResetClientLoyalty,
    handleForceDeleteClient,
    showDocumentId = false,
  }: {
    client: Client;
    loadingClientId: string | null;
    setModalTitle: (title: string) => void;
    fetchAppointments: (clientId: string) => void;
    confirmAction: (
      action: () => void,
      title: string,
      message: string,
      actionType: "register" | "refer" | "delete"
    ) => void;
    handleRegisterService: (clientId: string) => void;
    handleReferral: (clientId: string) => void;
    handleEditClient: (client: Client) => void;
    handleDeleteClient: (id: string) => void;
    handleViewRewards: (client: Client) => void;
    handleMergeClient: (client: Client) => void;
    handleResetClientLoyalty: (clientId: string) => void;
    handleForceDeleteClient: (id: string) => void;
    showDocumentId?: boolean;
  }) => (
    <Table.Tr key={client._id}>
      <Table.Td>
        <Text ta="center" tt="capitalize" fw={500}>
          {client.name}
        </Text>
      </Table.Td>
      <Table.Td style={{ textAlign: "center" }}>{client.phoneNumber}</Table.Td>
      <Table.Td style={{ textAlign: "center" }}>
        {client.phone_country ? (
          <Tooltip label={getCountryName(client.phone_country)} position="top">
            <Text size="xl" style={{ cursor: "help" }}>
              {getCountryFlag(client.phone_country)}
            </Text>
          </Tooltip>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        )}
      </Table.Td>
      {showDocumentId && (
        <Table.Td style={{ textAlign: "center" }}>
          <Text size="sm">{(client as any).documentId || <Text span c="dimmed">—</Text>}</Text>
        </Table.Td>
      )}
      <Table.Td>
        <Badge
          fullWidth
          variant="light"
          color="dark"
          size="lg"
          onClick={() => {
            setModalTitle(`Citas de ${client.name}`);
            fetchAppointments(client._id);
          }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
          title="Ver citas recientes"
        >
          {loadingClientId === client._id ? (
            "Cargando…"
          ) : (
            <>
              {client.servicesTaken}
              <MdVisibility size={16} />
            </>
          )}
        </Badge>
      </Table.Td>
      <Table.Td style={{ textAlign: "center" }}>
        <Badge fullWidth variant="light" color="dark" size="lg">
          {client.referralsMade}
        </Badge>
      </Table.Td>
      <Table.Td style={{ textAlign: "center" }}>
        <Group gap={4} justify="center">
          <Tooltip label="Registrar servicio" position="top" withArrow>
            <ActionIcon
              radius="xl"
              variant="light"
              color="green"
              onClick={() =>
                confirmAction(
                  () => handleRegisterService(client._id),
                  "Registrar Servicio",
                  "¿Deseas registrar un servicio para este cliente?",
                  "register"
                )
              }
            >
              <CgAdd size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Registrar referido" position="top" withArrow>
            <ActionIcon
              radius="xl"
              variant="light"
              color="grape"
              onClick={() =>
                confirmAction(
                  () => handleReferral(client._id),
                  "Registrar Referido",
                  "¿Deseas registrar un referido para este cliente?",
                  "refer"
                )
              }
            >
              <CgUserAdd size={18} />
            </ActionIcon>
          </Tooltip>
          <Menu shadow="sm" width={220} withinPortal>
            <Menu.Target>
              <ActionIcon radius="xl" variant="default">
                <CgOptions size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Fidelidad</Menu.Label>
              <Menu.Item
                leftSection={<FaTrophy />}
                onClick={() => handleViewRewards(client)}
              >
                Ver premios
              </Menu.Item>
              <Menu.Item
                color="teal"
                leftSection={<MdRestartAlt />}
                onClick={() =>
                  confirmAction(
                    () => handleResetClientLoyalty(client._id),
                    "Restablecer contadores",
                    "¿Deseas reiniciar los servicios tomados y referidos a 0 para este cliente?",
                    "register"
                  )
                }
              >
                Restablecer contadores
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>Cliente</Menu.Label>
              <Menu.Item
                leftSection={<MdEdit />}
                onClick={() => handleEditClient(client)}
              >
                Editar cliente
              </Menu.Item>
              <Menu.Item
                leftSection={<MdMerge />}
                onClick={() => handleMergeClient(client)}
              >
                Fusionar con...
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<BiTrash />}
                onClick={() =>
                  confirmAction(
                    () => handleDeleteClient(client._id),
                    "Eliminar Cliente",
                    "¿Estás seguro? Esta acción no se puede deshacer.",
                    "delete"
                  )
                }
              >
                Eliminar cliente
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<BiTrash />}
                onClick={() =>
                  confirmAction(
                    () => handleForceDeleteClient(client._id),
                    "Eliminar con citas",
                    "⚠️ Se eliminarán el cliente Y TODAS SUS CITAS. Esta acción no se puede deshacer.",
                    "delete"
                  )
                }
              >
                Eliminar con citas
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  )
);

export default ClientRow;
