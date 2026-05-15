// Minimal icon set — Tabler-inspired line icons. Keep simple, ≤ a few strokes each.
const Icon = ({ d, size = 18, stroke = 1.6, fill, children, viewBox = "0 0 24 24", ...rest }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill || "none"} stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children || (d ? <path d={d} /> : null)}
  </svg>
);

const IconCalendar = (p) => <Icon {...p}><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></Icon>;
const IconMapPin = (p) => <Icon {...p}><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></Icon>;
const IconPhone = (p) => <Icon {...p}><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></Icon>;
const IconStar = (p) => <Icon {...p}><path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.6 6.6 20.4l1-6.1L3.2 10l6.1-.9z"/></Icon>;
const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>;
const IconArrowLeft = (p) => <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7.5"/></Icon>;
const IconCheckCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-5.5"/></Icon>;
const IconClose = (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>;
const IconSparkle = (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8"/></Icon>;
const IconGift = (p) => <Icon {...p}><rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 13h18M12 9v11M12 9c-1.5-3-5-3-5-1s2.5 1 5 1c2.5 0 5 1 5-1s-3.5-2-5 1z"/></Icon>;
const IconUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4.5-6 8-6s7 2 8 6"/></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></Icon>;
const IconMenu = (p) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16"/></Icon>;
const IconBolt = (p) => <Icon {...p}><path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"/></Icon>;

Object.assign(window, {
  Icon, IconCalendar, IconClock, IconMapPin, IconPhone, IconStar, IconArrowRight, IconArrowLeft,
  IconCheck, IconCheckCircle, IconClose, IconSparkle, IconGift, IconUser, IconSearch, IconMenu, IconBolt,
});
