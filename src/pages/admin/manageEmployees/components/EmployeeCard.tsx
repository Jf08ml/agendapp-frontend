import React from "react";
import {
  Card,
  Box,
  Title,
  Text,
  Divider,
  Flex,
  ActionIcon,
  Badge,
  Avatar,
  Group,
  Menu,
} from "@mantine/core";
import { BsPencil, BsTrash, BsThreeDotsVertical } from "react-icons/bs";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { RiUserReceivedFill } from "react-icons/ri";
import { FaUserCheck } from "react-icons/fa";
import { Employee } from "../../../../services/employeeService";

interface Props {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employeeId: string) => void;
  onActive: (employeeId: string) => void;
  onViewDetails: (employee: Employee) => void;
  onShowAdvanceModal: (employee: Employee) => void;
}

const EmployeeCard: React.FC<Props> = ({
  employee,
  onEdit,
  onDelete,
  onActive,
  onViewDetails,
  onShowAdvanceModal,
}) => {
  const accent = employee.color || "#e2e8f0";

  return (
    <Card
      radius="md"
      withBorder
      style={{
        position: "relative",
        borderColor: employee.isActive ? accent : "#f5c6cb",
        background: employee.isActive ? "white" : "#fff5f5",
      }}
    >
      {/* Menú de acciones */}
      <Menu shadow="md" width={180} position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" style={{ position: "absolute", top: 8, right: 8 }}>
            <BsThreeDotsVertical />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<RiUserReceivedFill />} onClick={() => onViewDetails(employee)}>
            Ver detalles
          </Menu.Item>
          <Menu.Item leftSection={<FaMoneyBillTransfer />} onClick={() => onShowAdvanceModal(employee)}>
            Adelantos
          </Menu.Item>
          <Menu.Item leftSection={<BsPencil />} onClick={() => onEdit(employee)}>
            Editar
          </Menu.Item>
          <Menu.Divider />
          {employee.isActive ? (
            <Menu.Item color="red" leftSection={<BsTrash />} onClick={() => onDelete(employee._id)}>
              Eliminar / Desactivar
            </Menu.Item>
          ) : (
            <Menu.Item leftSection={<FaUserCheck />} onClick={() => onActive(employee._id)}>
              Activar
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>

      <Box>
        <Group align="center" gap="md" justify="flex-start" wrap="nowrap">
          <Box
            style={{
              padding: 3,
              borderRadius: 999,
              background: accent,
              display: "inline-flex",
            }}
          >
            <Avatar
              src={
                employee.profileImage ||
                "https://ik.imagekit.io/6cx9tc1kx/default_smile.png?updatedAt=1732716506174"
              }
              alt={employee.names}
              size={72}
              radius="xl"
              styles={{ image: { objectFit: "cover" } }}
            />
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Title order={4} lineClamp={1}>
              {employee.names}
            </Title>
            <Text size="sm" c="dimmed" lineClamp={1}>
              {employee.position}
            </Text>
            {!employee.isActive && (
              <Badge color="red" variant="light" mt={6}>
                Desactivado
              </Badge>
            )}
          </Box>
        </Group>

        <Divider my="sm" />

        <Text size="sm" c="dimmed" lineClamp={1}>
          {employee.email}
        </Text>
        <Text size="sm" c="dimmed" mt={4}>
          {employee.phoneNumber}
        </Text>

        {/* Acciones rápidas para desktop (opcional) */}
        <Flex justify="flex-end" gap="xs" mt="sm" visibleFrom="md">
          <ActionIcon variant="light" onClick={() => onShowAdvanceModal(employee)} title="Adelantos">
            <FaMoneyBillTransfer />
          </ActionIcon>
          <ActionIcon variant="light" onClick={() => onViewDetails(employee)} title="Detalles">
            <RiUserReceivedFill />
          </ActionIcon>
          <ActionIcon variant="light" onClick={() => onEdit(employee)} title="Editar">
            <BsPencil />
          </ActionIcon>
          {employee.isActive ? (
            <ActionIcon variant="light" color="red" onClick={() => onDelete(employee._id)} title="Eliminar/Desactivar">
              <BsTrash />
            </ActionIcon>
          ) : (
            <ActionIcon variant="light" color="green" onClick={() => onActive(employee._id)} title="Activar">
              <FaUserCheck />
            </ActionIcon>
          )}
        </Flex>
      </Box>
    </Card>
  );
};

export default EmployeeCard;
