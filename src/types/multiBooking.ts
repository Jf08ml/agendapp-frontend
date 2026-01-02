// types/multiBooking.ts

export interface SelectedService {
  serviceId: string;
  employeeId: string | null; // null para "sin preferencia"
}

export interface MultiBookingStep1State {
  services: SelectedService[];
}

export interface ServiceWithDate {
  serviceId: string;
  employeeId: string | null;
  date: Date | null;
}


// StepMultiServiceTime

export interface SelectedService {
  serviceId: string;
  employeeId: string | null;
}

export interface ServiceWithDate extends SelectedService {
  date: Date | null;
}

export interface MultiServiceBlockSelection {
  startTime: Date | null;
  intervals: {
    serviceId: string;
    employeeId: string | null;
    from: Date;
    to: Date;
  }[];
}

export interface ServiceTimeSelection extends ServiceWithDate {
  time: string | null;
}


export interface SelectedService {
  serviceId: string;
  employeeId: string | null;
}

export interface ServiceWithDate extends SelectedService {
  date: Date | null;
}

/** Cuando todos los servicios van el mismo día, encadenados */
export interface MultiServiceBlockSelection {
  startTime: Date | null;
  startTimeStr?: string; // 🔧 String original del backend (formato ISO sin timezone)
  intervals: {
    serviceId: string;
    employeeId: string | null;
    from: Date;
    to: Date;
    startStr?: string; // 🔧 String original para mostrar sin conversión
    endStr?: string; // 🔧 String original para mostrar sin conversión
  }[];
}

/** Cuando cada servicio va en un día distinto */
export interface ServiceTimeSelection extends SelectedService {
  time: string | null; // "h:mm A"
}
