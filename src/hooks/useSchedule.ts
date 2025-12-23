/**
 * Custom hook para gestionar horarios y disponibilidad
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface TimeSlot {
  time: string;
  available: boolean;
  datetime: string;
}

interface UseScheduleOptions {
  organizationId?: string;
  employeeId?: string;
  date?: Date;
  serviceDuration?: number;
}

export const useSchedule = (options: UseScheduleOptions = {}) => {
  const { organizationId, employeeId, date, serviceDuration = 30 } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [openDays, setOpenDays] = useState<number[]>([]);

  /**
   * Obtener slots disponibles para una fecha
   */
  const fetchAvailableSlots = useCallback(async (
    targetDate: Date,
    orgId: string,
    empId?: string,
    duration?: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/schedule/available-slots', {
        date: targetDate.toISOString(),
        organizationId: orgId,
        employeeId: empId || undefined,
        serviceDuration: duration || serviceDuration,
      });

      setSlots(response.data.data.slots || []);
      return response.data.data.slots || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar horarios disponibles';
      setError(errorMessage);
      setSlots([]);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [serviceDuration]);

  /**
   * Validar si una fecha/hora específica está disponible
   */
  const validateDateTime = useCallback(async (
    datetime: Date,
    orgId: string,
    empId?: string
  ) => {
    try {
      const response = await axios.post('/api/schedule/validate-datetime', {
        datetime: datetime.toISOString(),
        organizationId: orgId,
        employeeId: empId || undefined,
      });

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al validar horario';
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Obtener días abiertos de la organización
   */
  const fetchOpenDays = useCallback(async (orgId: string) => {
    try {
      const response = await axios.get(`/api/schedule/organization/${orgId}/open-days`);
      setOpenDays(response.data.data.openDays || []);
      return response.data.data.openDays || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar días abiertos';
      setError(errorMessage);
      return [];
    }
  }, []);

  /**
   * Obtener días disponibles del empleado
   */
  const fetchEmployeeAvailableDays = useCallback(async (empId: string) => {
    try {
      const response = await axios.get(`/api/schedule/employee/${empId}/available-days`);
      return response.data.data.availableDays || [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar días disponibles';
      setError(errorMessage);
      return [];
    }
  }, []);

  /**
   * Verificar si un día está abierto
   */
  const isDayOpen = useCallback((day: number) => {
    return openDays.includes(day);
  }, [openDays]);

  /**
   * Verificar si una fecha está abierta
   */
  const isDateOpen = useCallback((targetDate: Date) => {
    const dayOfWeek = targetDate.getDay();
    return openDays.includes(dayOfWeek);
  }, [openDays]);

  /**
   * Obtener el siguiente día disponible
   */
  const getNextAvailableDate = useCallback((fromDate: Date = new Date()) => {
    const maxDays = 30; // Buscar hasta 30 días adelante
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < maxDays; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      
      if (isDateOpen(checkDate)) {
        return checkDate;
      }
    }

    return null;
  }, [isDateOpen]);

  // Auto-fetch cuando cambian las opciones
  useEffect(() => {
    if (date && organizationId) {
      fetchAvailableSlots(date, organizationId, employeeId, serviceDuration);
    }
  }, [date, organizationId, employeeId, serviceDuration]);

  useEffect(() => {
    if (organizationId) {
      fetchOpenDays(organizationId);
    }
  }, [organizationId]);

  return {
    // Estado
    loading,
    error,
    slots,
    openDays,
    
    // Funciones
    fetchAvailableSlots,
    validateDateTime,
    fetchOpenDays,
    fetchEmployeeAvailableDays,
    isDayOpen,
    isDateOpen,
    getNextAvailableDate,
  };
};

export default useSchedule;
