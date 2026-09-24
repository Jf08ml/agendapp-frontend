import axios from "axios";

export const handleAxiosError = (error: unknown, defaultMessage: string) => {
  if (axios.isAxiosError(error)) {
    const errorResponse = error.response?.data;
    const wrapped = new Error(errorResponse?.message || defaultMessage) as Error & {
      isNetworkError?: boolean;
    };
    // Sin respuesta del servidor = falla de red (offline, timeout). Se marca
    // porque aquí el AxiosError se pierde y el caché offline necesita distinguir
    // "no hay red" de "el servidor respondió con error" (ver offlineCache.ts).
    if (!error.response) wrapped.isNetworkError = true;
    throw wrapped;
  } else {
    console.error("Error no es AxiosError:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Error desconocido: ${JSON.stringify(error)}`);
  }
};
