import { useEffect, useState } from "react";
import { getTokenExpiryInfo, showTokenExpiringNotification } from "../utils/sessionNotifications";

interface TokenExpiryState {
  expiresAt: string | null;
  timeRemaining: number | null;
  isExpiringSoon: boolean; // true si queda menos de 5 minutos
}

const useTokenExpiry = () => {
  const [expiryInfo, setExpiryInfo] = useState<TokenExpiryState>({
    expiresAt: null,
    timeRemaining: null,
    isExpiringSoon: false,
  });

  useEffect(() => {
    // Actualizar cada segundo
    const interval = setInterval(() => {
      const { expiresAt, timeRemaining } = getTokenExpiryInfo();
      const fiveMinutesInMs = 5 * 60 * 1000;
      const isExpiringSoon = timeRemaining !== null && timeRemaining < fiveMinutesInMs;

      setExpiryInfo({
        expiresAt,
        timeRemaining,
        isExpiringSoon,
      });

      // Mostrar notificación cuando faltan exactamente 5 minutos
      if (
        isExpiringSoon &&
        timeRemaining &&
        timeRemaining > 0 &&
        Math.abs(timeRemaining - fiveMinutesInMs) < 2000 // Margen de 2 segundos
      ) {
        showTokenExpiringNotification(timeRemaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return expiryInfo;
};

export default useTokenExpiry;
