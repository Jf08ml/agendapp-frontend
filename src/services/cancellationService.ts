import { apiGeneral } from './axiosConfig';

interface AppointmentInfo {
  id: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  status: string;
  isCancelled: boolean;
  isPast: boolean;
}

interface CancellationInfo {
  customerName: string;
  organizationName: string;
  timezone?: string;
  isGroup?: boolean;
  appointments?: AppointmentInfo[];
  type?: string;
}

interface CancellationInfoResponse {
  status: string;
  data: CancellationInfo;
  message: string;
}

interface CancellationResponse {
  status: string;
  data?: {
    reservationId?: string;
    appointmentId?: string;
    results?: any[];
  };
  message: string;
}

export const cancellationService = {
  /**
   * Obtiene información sobre lo que se puede cancelar con el token
   */
  getCancellationInfo: async (token: string): Promise<CancellationInfoResponse> => {
    const response = await apiGeneral.get(`/public/cancel/info?token=${token}`);
    return response.data;
  },

  /**
   * Cancela una reserva/cita usando el token
   */
  cancelByToken: async (
    token: string, 
    reason?: string,
    appointmentIds?: string[]
  ): Promise<CancellationResponse> => {
    const response = await apiGeneral.post('/public/cancel', { 
      token, 
      reason,
      appointmentIds 
    });
    return response.data;
  },
};

export default cancellationService;
