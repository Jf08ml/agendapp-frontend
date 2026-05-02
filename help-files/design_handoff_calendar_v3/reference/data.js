// Datos compartidos para todas las variantes del calendario
window.CALENDAR_DATA = (function () {
  // Abril 2026: 1 = miércoles
  const month = 3; // April (0-indexed)
  const year = 2026;
  const today = 30;

  // Citas por día (día -> array de citas)
  const appointments = {
    2: [
      { time: "10:00", client: "María L.", service: "Corte", pro: "Ana", color: "azul" },
    ],
    6: [
      { time: "09:30", client: "Sofía R.", service: "Manicura", pro: "Lucía", color: "rosa" },
      { time: "16:00", client: "Carla M.", service: "Tinte", pro: "Ana", color: "azul" },
    ],
    7: [
      { time: "11:00", client: "Diego F.", service: "Corte", pro: "Pedro", color: "verde" },
      { time: "15:30", client: "Ana T.", service: "Pedicura", pro: "Lucía", color: "rosa" },
    ],
    8: [
      { time: "10:00", client: "Marta V.", service: "Tinte", pro: "Ana", color: "azul" },
      { time: "13:00", client: "Pablo S.", service: "Barba", pro: "Pedro", color: "verde" },
    ],
    9: [
      { time: "09:00", client: "Elena G.", service: "Corte", pro: "Ana", color: "azul" },
      { time: "12:00", client: "Rosa P.", service: "Manicura", pro: "Lucía", color: "rosa" },
    ],
    11: [
      { time: "14:00", client: "Luis O.", service: "Corte", pro: "Pedro", color: "verde" },
    ],
    15: [
      { time: "10:30", client: "Andrea J.", service: "Facial", pro: "Lucía", color: "rosa" },
      { time: "16:30", client: "Tomás K.", service: "Corte", pro: "Pedro", color: "verde" },
    ],
    16: [
      { time: "09:00", client: "Carmen B.", service: "Tinte", pro: "Ana", color: "azul" },
      { time: "11:30", client: "Lucas D.", service: "Barba", pro: "Pedro", color: "verde" },
      { time: "17:00", client: "Sara N.", service: "Manicura", pro: "Lucía", color: "rosa" },
    ],
    17: [
      { time: "08:30", client: "Pilar E.", service: "Corte", pro: "Ana", color: "azul" },
      { time: "10:00", client: "Jorge H.", service: "Barba", pro: "Pedro", color: "verde" },
      { time: "12:00", client: "Inés C.", service: "Pedicura", pro: "Lucía", color: "rosa" },
      { time: "14:30", client: "Mario A.", service: "Tinte", pro: "Ana", color: "azul" },
      { time: "16:00", client: "Eva G.", service: "Facial", pro: "Lucía", color: "rosa" },
      { time: "18:00", client: "Raúl P.", service: "Corte", pro: "Pedro", color: "verde" },
    ],
    18: [
      { time: "10:00", client: "Beatriz M.", service: "Corte", pro: "Ana", color: "azul" },
      { time: "12:30", client: "Hugo R.", service: "Barba", pro: "Pedro", color: "verde" },
    ],
    20: [
      { time: "09:00", client: "Clara F.", service: "Manicura", pro: "Lucía", color: "rosa" },
      { time: "11:00", client: "Iván T.", service: "Corte", pro: "Pedro", color: "verde" },
      { time: "15:00", client: "Lola V.", service: "Tinte", pro: "Ana", color: "azul" },
    ],
    21: [
      { time: "08:30", client: "Adrián S.", service: "Corte", pro: "Pedro", color: "verde" },
      { time: "10:30", client: "Nuria L.", service: "Facial", pro: "Lucía", color: "rosa" },
      { time: "13:00", client: "Rocío B.", service: "Manicura", pro: "Lucía", color: "rosa" },
      { time: "16:00", client: "Daniel P.", service: "Tinte", pro: "Ana", color: "azul" },
    ],
    24: [
      { time: "11:00", client: "Sergio M.", service: "Corte", pro: "Pedro", color: "verde" },
    ],
    27: [],
    28: [
      { time: "10:00", client: "Natalia C.", service: "Tinte", pro: "Ana", color: "azul" },
      { time: "15:00", client: "Pau R.", service: "Barba", pro: "Pedro", color: "verde" },
    ],
    29: [
      { time: "12:00", client: "Vera S.", service: "Manicura", pro: "Lucía", color: "rosa" },
    ],
    30: [
      { time: "10:00", client: "Olga T.", service: "Corte", pro: "Ana", color: "azul" },
    ],
  };

  // Construir matriz de calendario (semanas con padding de mes anterior/siguiente)
  // Abril 2026 empieza miércoles (1 abril). Domingo como primer día.
  // Marzo: 29, 30, 31 (dom, lun, mar) → padding inicial
  // Mayo: 1, 2 → al final si necesario, pero abril termina jueves 30, viernes 1 y sábado 2 son de mayo
  const weeks = [
    [
      { day: 29, prevMonth: true },
      { day: 30, prevMonth: true },
      { day: 31, prevMonth: true },
      { day: 1 },
      { day: 2 },
      { day: 3 },
      { day: 4 },
    ],
    [
      { day: 5 },
      { day: 6 },
      { day: 7 },
      { day: 8 },
      { day: 9 },
      { day: 10 },
      { day: 11 },
    ],
    [
      { day: 12 },
      { day: 13 },
      { day: 14 },
      { day: 15 },
      { day: 16 },
      { day: 17 },
      { day: 18 },
    ],
    [
      { day: 19 },
      { day: 20 },
      { day: 21 },
      { day: 22 },
      { day: 23 },
      { day: 24 },
      { day: 25 },
    ],
    [
      { day: 26 },
      { day: 27 },
      { day: 28 },
      { day: 29 },
      { day: 30 },
      { day: 1, nextMonth: true },
      { day: 2, nextMonth: true },
    ],
  ];

  // Festivos: 2 abril (jueves santo), 3 abril (viernes santo)
  const holidays = [2, 3];

  return {
    month, year, today, appointments, weeks, holidays,
    weekdays: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    weekdaysShort: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"],
    monthName: "ABRIL",
    totalAppointments: 35,
  };
})();
