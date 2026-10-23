// components/PaymentMethodsModal.tsx
import { Modal, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Membership } from "../services/membershipService";
import { PlanCheckout } from "./PlanCheckout";

interface PaymentMethodsModalProps {
  opened: boolean;
  onClose: () => void;
  membership: Membership | null;
  planPrice?: number;
  planName?: string;
  planId?: string;
  planBillingCycle?: string;
  paypalPlanId?: string | null;
}

export function PaymentMethodsModal({
  opened,
  onClose,
  membership,
  planPrice,
  planName,
  planId,
  planBillingCycle,
  paypalPlanId,
}: PaymentMethodsModalProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");

  const price = planPrice ?? membership?.planId?.price ?? 0;
  const currency = membership?.planId?.currency ?? "USD";
  const plan = planName ?? membership?.planId?.displayName ?? "Plan";
  const resolvedPlanId = planId ?? (membership?.planId?._id as string | undefined);
  const resolvedBillingCycle = planBillingCycle ?? (membership?.planId as { billingCycle?: string } | null)?.billingCycle ?? "monthly";
  const resolvedPaypalPlanId = paypalPlanId ?? (membership?.planId as { paypalPlanId?: string | null } | null)?.paypalPlanId;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="lg" fw={700}>Renovar membresía</Text>}
      size="md"
      fullScreen={isMobile}
      centered
    >
      <PlanCheckout
        planId={resolvedPlanId}
        paypalPlanId={resolvedPaypalPlanId}
        planName={plan}
        price={price}
        currency={currency}
        billingCycle={resolvedBillingCycle}
        supportAction="renovar mi membresía"
      />
    </Modal>
  );
}
