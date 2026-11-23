// Contador de «Reservas online» (decisión 4): reservas pendientes con fecha futura,
// con cualquier política (con «Confirmar sola si hay cupo» solo quedan pendientes
// las que no tuvieron cupo). Las vencidas no cuentan. Pide una sola fila: el
// backend devuelve el total de grupos en `total`.
import { useCallback, useEffect, useState } from "react";
import { apiReservation } from "../services/axiosConfig";

/** Disparar tras aprobar, rechazar o cancelar para refrescar el contador al instante. */
export const RESERVATIONS_CHANGED_EVENT = "agendapp:reservations-changed";
export const notifyReservationsChanged = () => window.dispatchEvent(new Event(RESERVATIONS_CHANGED_EVENT));

const REFRESH_MS = 60_000;

export function usePendingReservationsCount(organizationId: string | undefined, enabled: boolean): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!organizationId || !enabled) return;
    try {
      // Sin handleAxiosError: un fallo del contador no debe mostrar errores en pantalla.
      const res = await apiReservation.get(`/${organizationId}`, {
        params: { status: "pending", onlyFuture: true, limit: 1, page: 1 },
      });
      setCount(Number(res.data?.data?.total) || 0);
    } catch {
      /* se reintenta en el siguiente ciclo */
    }
  }, [organizationId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    const onChange = () => void load();
    window.addEventListener(RESERVATIONS_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(RESERVATIONS_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [enabled, load]);

  return count;
}
