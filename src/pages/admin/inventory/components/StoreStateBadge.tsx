// Badge de estado de Tienda e inventario: palabra + ícono + color.
import {
  IconBuildingStore,
  IconCashRegister,
  IconCheck,
  IconCircleOff,
  IconClock,
  IconEye,
  IconReceiptRefund,
  IconTruckDelivery,
  IconX,
} from "@tabler/icons-react";
import { badgeClass, type StateInfo } from "../storeView";

const STORE_ICONS = {
  check: IconCheck,
  store: IconBuildingStore,
  cashRegister: IconCashRegister,
  off: IconCircleOff,
  clock: IconClock,
  eye: IconEye,
  refund: IconReceiptRefund,
  x: IconX,
  truck: IconTruckDelivery,
} as const;

export default function StateBadge({ info, small }: { info: StateInfo; small?: boolean }) {
  const Icon = STORE_ICONS[info.icon];
  return (
    <span className={badgeClass(info.tone)} style={small ? { height: 20, fontSize: 11, padding: "0 8px" } : undefined}>
      <Icon size={12} stroke={2} /> {info.label}
    </span>
  );
}
