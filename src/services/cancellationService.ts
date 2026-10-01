import { apiGeneral } from './axiosConfig';

interface AppointmentInfo {
  id: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  status: string;
  clientConfirmed?: boolean;
  isCancelled: boolean;
  isPast: boolean;
  policyBlocked?: boolean;
  policyBlockedReason?: string;
}

interface CancellationPolicy {
  minHoursBeforeAppointment?: number;
  preventCancellingConfirmed?: boolean;
}

interface CancellationInfo {
  customerName: string;
  organizationName: string;
  timezone?: string;
  isGroup?: boolean;
  appointments?: AppointmentInfo[];
  type?: string;
  allBlockedByPolicy?: boolean;
  cancellationPolicy?: CancellationPolicy;
  policyBlocked?: boolean; // Para reservaciones
  policyBlockedReason?: string; // Para reservaciones
}

interface CancellationInfoResponse {
  status: string;
  data: CancellationInfo;
  message: string;
}

export interface RescheduleInfo {
  /** false = el negocio no usa la función (no se muestra nada) */
  enabled: boolean;
  allowed: boolean;
  reason?: string;
  remaining?: number;
  maxReschedules?: number;
  minHoursBeforeAppointment?: number;
  timezone?: string;
  timeFormat?: string;
  appointment?: {
    id: string;
    serviceName?: string;
    employeeName?: string;
    startDate: string;
    endDate: string;
  };
}

export interface RescheduleSlot {
  time: string; // "HH:mm" 24 h, en la zona horaria del negocio
  datetime: string; // ISO UTC
}

interface CancellationResponse {
  status: string;
  data?: {
    reservationId?: string;
    appointmentId?: string;
    results?: any[];
    successCount?: number;
    alreadyConfirmed?: number;
  };
  message: string;
}

export const cancellationService = {
  /**
   * Obtiene información sobre lo que se puede cancelar/confirmar con el token
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

  /**
   * Confirma una o varias citas usando el token público
   */
  /** ¿Se puede reagendar la cita del token? (y con qué reglas) */
  getRescheduleInfo: async (token: string): Promise<{ status: string; data: RescheduleInfo; message: string }> => {
    const response = await apiGeneral.get('/public/cancel/reschedule-info', { params: { token } });
    return response.data;
  },

  /** Horarios libres de un día ("YYYY-MM-DD") para la cita del token */
  getRescheduleSlots: async (
    token: string,
    date: string
  ): Promise<{ status: string; data: { date: string; slots: RescheduleSlot[] }; message: string }> => {
    const response = await apiGeneral.post('/public/cancel/reschedule/slots', { token, date });
    return response.data;
  },

  /** Mueve la cita al horario elegido (ISO de uno de los slots devueltos) */
  rescheduleByToken: async (
    token: string,
    newStartDate: string
  ): Promise<{ status: string; data: { startDate: string; endDate: string; remaining: number }; message: string }> => {
    const response = await apiGeneral.post('/public/cancel/reschedule', { token, newStartDate });
    return response.data;
  },

  confirmByToken: async (
    token: string,
    appointmentIds?: string[]
  ): Promise<CancellationResponse> => {
    const response = await apiGeneral.post('/public/cancel/confirm', {
      token,
      appointmentIds
    });
    return response.data;
  },
};

export default cancellationService;
