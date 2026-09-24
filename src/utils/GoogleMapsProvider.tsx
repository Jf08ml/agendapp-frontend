import React, { useEffect, useState } from "react";
import CustomLoader from "../components/customLoader/CustomLoader";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Este provider envuelve TODA la app y antes solo renderizaba tras script.onload:
// sin red (o con señal colgada) el script nunca cargaba y la app entera —incluida
// la agenda guardada del modo sin conexión— se quedaba en el loader para siempre.
//
// Tope de espera solo para sesiones autenticadas (admin/profesional). Los
// visitantes públicos SÍ esperan al script completo: su landing renderiza
// <GoogleMap>, que necesita `window.google` al montar.
const MAX_WAIT_MS = 6_000;

const hasSession = () => {
  try {
    return !!localStorage.getItem("app_token");
  } catch {
    return false;
  }
};

const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector(
      `script[src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places"]`
    );

    if (existingScript) {
      // Si ya existe el script, considera que está cargado
      setIsLoaded(true);
      return;
    }

    // Crea y carga el script manualmente
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    // Falló la carga (sin red, bloqueado): mejor mostrar la app sin mapas que un
    // loader eterno. Las pantallas con mapa ya requieren conexión.
    script.onerror = () => setIsLoaded(true);
    document.body.appendChild(script);

    if (!hasSession()) return;
    if (navigator.onLine === false) {
      setIsLoaded(true);
      return;
    }
    const timer = setTimeout(() => setIsLoaded(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return <CustomLoader />;
  }

  return <>{children}</>;
};

export default GoogleMapsProvider;
