import axios from "axios";

export const handleAxiosError = (error: unknown, defaultMessage: string) => {
  if (axios.isAxiosError(error)) {
    const errorResponse = error.response?.data;
    throw new Error(errorResponse?.message || defaultMessage);
  } else {
    console.error("Error no es AxiosError:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Error desconocido: ${JSON.stringify(error)}`);
  }
};
