// Demo data for Galaxia Glamour — but reads as a generic, business-agnostic schema.
// Replace `business`, `services`, `professionals`, etc. per-tenant at runtime.

const business = {
  name: "Galaxia Glamour",
  initials: "GG",
  tagline: "Estudio de belleza",
  welcomeTitle: "Tu próxima cita,\na un toque de distancia.",
  welcomeBody: "Reserva servicios, descubre a nuestro equipo y suma puntos en cada visita. Lo de siempre, ahora más fácil.",
  address: "Cra. 11 #93-45, Chapinero, Bogotá",
  phone: "+57 312 555 0144",
  rating: 4.9,
  reviewCount: 482,
  totalBookings: "12.4K",
  yearsOpen: 6,
  hours: [
    { day: "Lunes", time: "Cerrado", today: false, closed: true },
    { day: "Martes", time: "10:00 – 19:00", today: false },
    { day: "Miércoles", time: "10:00 – 19:00", today: false },
    { day: "Jueves", time: "10:00 – 20:00", today: true },
    { day: "Viernes", time: "10:00 – 20:00", today: false },
    { day: "Sábado", time: "9:00 – 18:00", today: false },
    { day: "Domingo", time: "10:00 – 16:00", today: false },
  ],
};

const categories = [
  { id: "all", label: "Todos", count: 24 },
  { id: "hair", label: "Cabello", count: 9 },
  { id: "nails", label: "Uñas", count: 6 },
  { id: "skin", label: "Facial", count: 5 },
  { id: "makeup", label: "Maquillaje", count: 4 },
];

// Photo URLs — Unsplash editorial. Will look like business-uploaded service photos.
const services = [
  {
    id: "s1",
    category: "hair",
    name: "Corte y peinado",
    description: "Corte personalizado con asesoría de estilo, lavado y peinado finalizado.",
    duration: 60,
    price: 85000,
    photo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80",
  },
  {
    id: "s2",
    category: "hair",
    name: "Color completo + tratamiento",
    description: "Coloración integral con tratamiento de hidratación profunda y brillo.",
    duration: 150,
    price: 240000,
    photo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900&q=80",
  },
  {
    id: "s3",
    category: "nails",
    name: "Manicure semipermanente",
    description: "Limpieza, limado, hidratación y esmalte semipermanente de larga duración.",
    duration: 75,
    price: 65000,
    photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=900&q=80",
  },
  {
    id: "s4",
    category: "skin",
    name: "Facial profundo",
    description: "Limpieza profunda, exfoliación, extracción y mascarilla nutritiva.",
    duration: 90,
    price: 130000,
    photo: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&q=80",
  },
  {
    id: "s5",
    category: "makeup",
    name: "Maquillaje social",
    description: "Look completo para evento, incluye pestañas postizas si lo deseas.",
    duration: 60,
    price: 110000,
    photo: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=80",
  },
  {
    id: "s6",
    category: "nails",
    name: "Pedicure spa",
    description: "Inmersión, exfoliación de pies, masaje relajante y esmalte tradicional.",
    duration: 60,
    price: 70000,
    photo: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=900&q=80",
  },
];

const professionals = [
  { id: "p1", name: "Camila Reyes", role: "Estilista senior", rating: 5.0, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80" },
  { id: "p2", name: "Daniela Ortiz", role: "Especialista en color", rating: 4.9, photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80" },
  { id: "p3", name: "Mariana López", role: "Nail artist", rating: 4.8, photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80" },
  { id: "p4", name: "Andrés Quintero", role: "Maquillador", rating: 4.9, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80" },
];

const upcomingDates = (() => {
  // Generate next 14 days starting today (May 14, 2026).
  const out = [];
  const start = new Date(2026, 4, 14);
  const dows = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      dow: dows[d.getDay()],
      day: d.getDate(),
      monthLabel: d.toLocaleString("es-CO", { month: "long" }),
      disabled: d.getDay() === 1, // Monday closed for Galaxia
      iso: d.toISOString().slice(0, 10),
    });
  }
  return out;
})();

const timeSlots = [
  { t: "9:00", taken: true },
  { t: "9:30", taken: false },
  { t: "10:00", taken: false },
  { t: "10:30", taken: true },
  { t: "11:00", taken: false },
  { t: "11:30", taken: false },
  { t: "12:00", taken: true },
  { t: "12:30", taken: false },
  { t: "14:00", taken: false },
  { t: "14:30", taken: false },
  { t: "15:00", taken: true },
  { t: "15:30", taken: false },
  { t: "16:00", taken: false },
  { t: "16:30", taken: false },
  { t: "17:00", taken: false },
  { t: "17:30", taken: true },
];

const COP = (n) => "$" + n.toLocaleString("es-CO");

Object.assign(window, { business, categories, services, professionals, upcomingDates, timeSlots, COP });
