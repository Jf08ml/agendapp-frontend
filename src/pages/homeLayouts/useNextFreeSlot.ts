// Próximo horario libre del negocio para las landings (ver NextFreeSlot.tsx).
import { useEffect, useState } from "react";
import { getNextFreeSlot, type NextFreeSlot } from "../../services/scheduleService";

export function useNextFreeSlot(organizationId?: string, enabled = true) {
  const [slot, setSlot] = useState<NextFreeSlot | null>(null);
  useEffect(() => {
    if (!organizationId || !enabled) return;
    let alive = true;
    getNextFreeSlot(organizationId)
      .then((s) => alive && setSlot(s))
      .catch(() => alive && setSlot(null));
    return () => {
      alive = false;
    };
  }, [organizationId, enabled]);
  return slot;
}
