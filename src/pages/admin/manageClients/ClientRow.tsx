import React from "react";
import { Client } from "../../../services/clientService";
import { ActionIcon, Badge, Menu, Table, Text } from "@mantine/core";
import { BiTrash } from "react-icons/bi";
import { CgAdd, CgOptions, CgUserAdd } from "react-icons/cg";
import { MdEdit } from "react-icons/md";

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
  }) => (
    <Table.Tr key={client._id}>
      <Table.Td>
        <Text ta="center" tt="capitalize" fw={500}>
          {client.name}
        </Text>
      </Table.Td>
      <Table.Td style={{ textAlign: "center" }}>{client.phoneNumber}</Table.Td>
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
          style={{ cursor: "pointer" }}
        >
          {loadingClientId === client._id
            ? "Cargando..."
            : client.servicesTaken}
        </Badge>
      </Table.Td>
      <Table.Td style={{ textAlign: "center" }}>
        <Badge fullWidth variant="light" color="dark" size="lg">
          {client.referralsMade}
        </Badge>
      </Table.Td>
      <Table.Td style={{ textAlign: "center" }}>
        <Menu shadow="sm" width={200}>
          <Menu.Target>
            <ActionIcon radius="xl">
              <CgOptions size={20} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Acciones</Menu.Label>
            <Menu.Item
              leftSection={<CgAdd />}
              onClick={() =>
                confirmAction(
                  () => handleRegisterService(client._id),
                  "Registrar Servicio",
                  "¿Estás seguro de que deseas registrar un servicio para este cliente?",
                  "register"
                )
              }
            >
              Registrar Servicio
            </Menu.Item>
            <Menu.Item
              leftSection={<CgUserAdd />}
              onClick={() =>
                confirmAction(
                  () => handleReferral(client._id),
                  "Registrar Referido",
                  "¿Estás seguro de que deseas registrar un referido para este cliente?",
                  "refer"
                )
              }
            >
              Registrar Referido
            </Menu.Item>
            <Menu.Item
              leftSection={<MdEdit />}
              onClick={() => handleEditClient(client)}
            >
              Editar Cliente
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<BiTrash />}
              onClick={() =>
                confirmAction(
                  () => handleDeleteClient(client._id),
                  "Eliminar Cliente",
                  "¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.",
                  "delete"
                )
              }
            >
              Eliminar Cliente
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  )
);

export default ClientRow;