// components/MembershipAlert.tsx
import { useEffect, useState } from "react";
import { Alert, Button, Group, Text, Badge } from "@mantine/core";
import {
  getMembershipStatus,
  MembershipStatus,
} from "../services/membershipService";
import { IoAlertCircle, IoTriangle } from "react-icons/io5";
import { BiInfoCircle } from "react-icons/bi";

interface MembershipAlertProps {
  organizationId: string;
  onRenewClick: () => void;
}

export function MembershipAlert({
  organizationId,
  onRenewClick,
}: MembershipAlertProps) {
  const [membershipStatus, setMembershipStatus] =
    useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getMembershipStatus(organizationId);
        setMembershipStatus(status);
      } catch (error) {
        console.error("Error al obtener estado de membresía:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Actualizar cada 5 minutos
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [organizationId]);

  // Auto-cerrar después de 5 segundos
  useEffect(() => {
    if (!loading && membershipStatus?.hasActiveMembership) {
      const timer = setTimeout(() => {
        setDismissed(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, membershipStatus]);

  if (loading || !membershipStatus?.hasActiveMembership || dismissed) {
    return null;
  }

  const { membership, ui } = membershipStatus;

  if (!membership || !ui) {
    return null;
  }

  // No mostrar si está activo y no vence pronto
  if (
    membership.status === "active" &&
    membership.daysUntilExpiration > 7
  ) {
    return null;
  }

  const getIcon = () => {
    if (ui.statusColor === "red") {
      return <IoAlertCircle size={20} />;
    }
    if (ui.statusColor === "orange" || ui.statusColor === "yellow") {
      return <IoTriangle size={20} />;
    }
    return <BiInfoCircle size={20} />;
  };

  const getStatusBadge = () => {
    const statusLabels: Record<string, string> = {
      active: "Activa",
      trial: "Prueba",
      grace_period: "Período de Gracia",
      suspended: "Suspendida",
      pending: "Pendiente",
      cancelled: "Cancelada",
      expired: "Expirada",
    };

    const statusColors: Record<string, string> = {
      active: "green",
      trial: "blue",
      grace_period: "orange",
      suspended: "red",
      pending: "yellow",
      cancelled: "gray",
      expired: "red",
    };

    return (
      <Badge color={statusColors[membership.status]} size="sm">
        {statusLabels[membership.status]}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Alert
      icon={getIcon()}
      title={
        <Group gap="xs">
          <Text size="sm" fw={600}>
            Estado de Membresía
          </Text>
          {getStatusBadge()}
        </Group>
      }
      color={ui.statusColor}
      mb="md"
      withCloseButton={true}
      onClose={() => setDismissed(true)}
    >
      <Text size="sm" mb="xs">
        {ui.statusMessage}
      </Text>

      <Text size="xs" c="dimmed" mb="sm">
        Plan: <strong>{membership.plan}</strong> • Vence:{" "}
        <strong>{formatDate(membership.currentPeriodEnd)}</strong>
        {membership.daysUntilExpiration > 0 && (
          <> ({membership.daysUntilExpiration} días restantes)</>
        )}
      </Text>

      {ui.showRenewalButton && (
        <Group gap="xs" mt="sm">
          <Button
            size="xs"
            color={ui.statusColor}
            onClick={onRenewClick}
            variant="light"
          >
            Renovar Membresía
          </Button>

          {membership.lastPaymentDate && (
            <Text size="xs" c="dimmed">
              Último pago: {formatDate(membership.lastPaymentDate)}
            </Text>
          )}
        </Group>
      )}
    </Alert>
  );
}
