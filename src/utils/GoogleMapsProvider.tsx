import React, { useEffect, useState } from "react";
import CustomLoader from "../components/customLoader/CustomLoader";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector(
      `script[src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places"]`
    );

    if (!existingScript) {
      // Crea y carga el script manualmente
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      document.body.appendChild(script);
    } else {
      // Si ya existe el script, considera que está cargado
      setIsLoaded(true);
    }
  }, []);

  if (!isLoaded) {
    return <CustomLoader />; 
  }

  return <>{children}</>;
};

export default GoogleMapsProvider;
