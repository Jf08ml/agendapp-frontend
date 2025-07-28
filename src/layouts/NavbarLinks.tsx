import React from "react";
import { NavLink } from "react-router-dom";
import { Box, Text, Flex, Divider, ScrollArea } from "@mantine/core";
import { MdOutlineLoyalty } from "react-icons/md";
// import { RiReservedLine } from "react-icons/ri";
import { GrUserSettings } from "react-icons/gr";
import { BiCalendar, BiCalendarCheck } from "react-icons/bi";
import { GiClawSlashes, GiPriceTag } from "react-icons/gi";
import { FaCashRegister, FaIdeal, FaUsers, FaWhatsapp } from "react-icons/fa";
import { usePermissions } from "../hooks/usePermissions";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import CustomLoader from "../components/customLoader/CustomLoader";

interface NavbarLinksProps {
  closeNavbar: () => void;
}

const NavbarLinks: React.FC<NavbarLinksProps> = ({ closeNavbar }) => {
  const { hasPermission } = usePermissions();

  // const isAuthenticated = useSelector(
  //   (state: RootState) => state.auth.isAuthenticated
  // );

  const { organization, loading } = useSelector(
    (state: RootState) => state.organization
  );

  if (loading || !organization) {
    return (
      <CustomLoader
        loadingText={`Cargando ${organization?.name || "organización"}...`}
        logoUrl={organization?.branding?.logoUrl}
      />
    );
  }

  return (
    <ScrollArea>
      <Box>
        <Flex direction="column" align="center" justify="center">
          <NavLink
            to="/servicios-precios"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <GiPriceTag size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Precios y servicios
              </Text>
            </Flex>
          </NavLink>

          <NavLink
            to="/search-client"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <FaIdeal size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Plan de fidelidad
              </Text>
            </Flex>
          </NavLink>

          <NavLink
            to="/online-reservation"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <BiCalendar size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Reserva en linea
              </Text>
            </Flex>
          </NavLink>
        </Flex>
        {(hasPermission("businessInformation:read") ||
          hasPermission("appointments:view_own") ||
          hasPermission("appointments:view_all")) && (
          <Divider my="xs" label="Gestión de cuenta" labelPosition="center" />
        )}

        {hasPermission("cashManagement:red") && (
          <NavLink
            to="/gestion-caja"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <FaCashRegister size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Gestión de caja
              </Text>
            </Flex>
          </NavLink>
        )}

        {(hasPermission("appointments:view_all") ||
          hasPermission("appointments:view_own")) && (
          <NavLink
            to="/gestionar-agenda"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <BiCalendarCheck size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Gestionar agenda
              </Text>
            </Flex>
          </NavLink>
        )}

        {hasPermission("reservationOnline:read") && (
          <NavLink
            to="/gestionar-reservas-online"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <FaUsers size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Gestionar reservas online
              </Text>
            </Flex>
          </NavLink>
        )}

        {hasPermission("businessInformation:read") && (
          <NavLink
            to="/informacion-negocio"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <MdOutlineLoyalty size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Información del negocio
              </Text>
            </Flex>
          </NavLink>
        )}

        {hasPermission("employeeInformation:read") && (
          <NavLink
            to="/informacion-empleado"
            onClick={closeNavbar}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" justify="center" gap="sm">
              <MdOutlineLoyalty size={20} color="white" />
              <Text c="white" fw={600} my="md">
                Información del empleado
              </Text>
            </Flex>
          </NavLink>
        )}

        {(hasPermission("clients:read") ||
          hasPermission("services:read") ||
          hasPermission("employees:read")) && (
          <Divider
            my="xs"
            label="Sección administrativa"
            labelPosition="center"
          />
        )}

        <Flex direction="column" align="center" justify="center">
          {hasPermission("clients:read") && (
            <NavLink
              to="/gestionar-clientes"
              onClick={closeNavbar}
              style={{ textDecoration: "none" }}
            >
              <Flex align="center" justify="center" gap="sm">
                <GrUserSettings size={20} color="white" />
                <Text c="white" fw={600} my="md">
                  Gestionar clientes
                </Text>
              </Flex>
            </NavLink>
          )}

          {hasPermission("services:read") && (
            <NavLink
              to="/gestionar-servicios"
              onClick={closeNavbar}
              style={{ textDecoration: "none" }}
            >
              <Flex align="center" justify="center" gap="sm">
                <GiClawSlashes size={20} color="white" />
                <Text c="white" fw={600} my="md">
                  Gestionar servicios
                </Text>
              </Flex>
            </NavLink>
          )}

          {hasPermission("employees:read") && (
            <NavLink
              to="/gestionar-empleados"
              onClick={closeNavbar}
              style={{ textDecoration: "none" }}
            >
              <Flex align="center" justify="center" gap="sm">
                <FaUsers size={20} color="white" />
                <Text c="white" fw={600} my="md">
                  Gestionar empleados
                </Text>
              </Flex>
            </NavLink>
          )}

          {hasPermission("whatsapp:read") && (
            <NavLink
              to="/gestionar-whatsapp"
              onClick={closeNavbar}
              style={{ textDecoration: "none" }}
            >
              <Flex align="center" justify="center" gap="sm">
                <FaWhatsapp size={20} color="white" />
                <Text c="white" fw={600} my="md">
                  Gestionar Whatsapp
                </Text>
              </Flex>
            </NavLink>
          )}
        </Flex>
      </Box>
    </ScrollArea>
  );
};

export default NavbarLinks;
