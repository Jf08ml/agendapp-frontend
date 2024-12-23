import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box } from "@mantine/core";
import PlanInfo from "./PlanInfo";
import { Client as ClientType } from "../../services/clientService";
import { Organization } from "../../services/organizationService";

const PlanViewer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientType | null>(null);
  const [organization, setOrganization] = useState<Organization | null>( null);

  useEffect(() => {
    if (
      location.state &&
      location.state.client &&
      location.state.organization
    ) {
      setClient(location.state.client);
      setOrganization(location.state.organization);
    } else {
      navigate("/");
    }
  }, [location, navigate]);

  const handleLogout = () => {
    setClient(null);
    localStorage.removeItem("savedClientData");
    navigate("/");
  };

  if (!client) {
    return <div>Cargando...</div>;
  }

  return (
    <Box style={{ margin: "auto" }}>
      <PlanInfo
        client={client}
        organization={organization}
        onLogout={handleLogout}
      />
    </Box>
  );
};

export default PlanViewer;
