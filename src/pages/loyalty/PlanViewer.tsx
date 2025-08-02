import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Loader, Center, Text } from "@mantine/core";
import PlanInfo from "./PlanInfo";
import { Client as ClientType } from "../../services/clientService";
import { Organization } from "../../services/organizationService";

const PlanViewer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientType | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (
      location.state &&
      location.state.client &&
      location.state.organization
    ) {
      setClient(location.state.client);
      setOrganization(location.state.organization);
      setLoading(false);
    } else {
      setLoading(false);
      navigate("/");
    }
  }, [location, navigate]);

  const handleLogout = () => {
    setClient(null);
    localStorage.removeItem("savedClientData");
    navigate("/");
  };

  const canShowPlan = useMemo(() => client && organization, [client, organization]);

  if (loading) {
    return (
      <Center mih={300}>
        <Loader size="lg" color="blue" />
        <Text ml="md">Cargando información del plan...</Text>
      </Center>
    );
  }

  if (!canShowPlan) {
    return (
      <Center mih={300}>
        <Text c="dimmed" size="lg">
          No hay información de cliente u organización. Redirigiendo...
        </Text>
      </Center>
    );
  }

  return (
    <Box
      style={{
        margin: "auto",
        maxWidth: 500,
        width: "100%",
      }}
      mb="lg"
    >
      <PlanInfo
        client={client!}
        organization={organization!}
        onLogout={handleLogout}
      />
    </Box>
  );
};

export default PlanViewer;
