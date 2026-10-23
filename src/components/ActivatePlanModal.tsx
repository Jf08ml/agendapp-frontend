// components/ActivatePlanModal.tsx
import { Modal, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { PlanCheckout } from "./PlanCheckout";

interface Plan {
  _id: string;
  displayName: string;
  price: number;
  currency: string;
  billingCycle: string;
  paypalPlanId: string | null;
}

interface ActivatePlanModalProps {
  opened: boolean;
  onClose: () => void;
  plan: Plan | null;
  modalTitle?: string;
}

export function ActivatePlanModal({ opened, onClose, plan, modalTitle = "Activar mi plan" }: ActivatePlanModalProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");

  if (!plan) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text size="lg" fw={700}>{modalTitle}</Text>}
      size="md"
      fullScreen={isMobile}
      centered
    >
      <PlanCheckout
        planId={plan._id}
        paypalPlanId={plan.paypalPlanId}
        planName={plan.displayName}
        price={plan.price}
        currency={plan.currency}
        billingCycle={plan.billingCycle}
        supportAction="activar mi plan"
      />
    </Modal>
  );
}
