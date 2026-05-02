# Handoff: Calendar V3 — Vista de calendario mensual con panel lateral

## Overview

Rediseño de la vista principal de calendario de **AgenditApp** (app multi-vertical de gestión de citas: salones, clínicas, spas, servicios profesionales). Reemplaza la vista mensual actual —que solo muestra un contador "X citas" por día— con un layout 70/30 que combina un calendario rico en información con un panel lateral de detalle del día seleccionado.

Resuelve además tres carencias del diseño anterior:

1. **Estado de conexión de WhatsApp** visible y accionable desde el header.
2. **Menú de acciones** (búsqueda, recarga, reordenar profesionales, recordatorios, exportar).
3. **Sistema de recordatorios manuales** por día: el usuario activa un modo, selecciona un día con citas y envía recordatorios masivos por WhatsApp.

---

## About the Design Files

Los archivos en `reference/` son **prototipos de diseño construidos en HTML + React (Babel inline)**. No son código de producción; sirven como referencia de look & feel, comportamiento y valores exactos.

La tarea es **recrear este diseño en el codebase de AgenditApp** (React + Vite + TypeScript + Mantine), siguiendo los patrones, hooks y convenciones que ya existen en el proyecto. Cuando un componente tenga equivalente directo en Mantine, **úsalo en lugar de reimplementarlo** (ver mapeo en la sección "Mapeo a Mantine").

---

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografía, espaciado, radios y comportamientos están definidos. El desarrollador debe replicar la apariencia con precisión, pero adaptando los componentes a Mantine y a las convenciones del codebase.

---

## Stack objetivo

- **React 18** + **Vite** + **TypeScript**
- **Mantine v7+** como UI library
- Recomendaciones adicionales (sugeridas, no bloqueantes):
  - `dayjs` o `date-fns` para fechas (Mantine ya integra dayjs en `@mantine/dates`)
  - `@mantine/dates` para la lógica de calendario (`MonthPicker` / `Calendar`)
  - `@tabler/icons-react` (estándar Mantine) para iconos
  - `zustand` o el state manager existente del proyecto

---

## Pantallas / Vistas

### Pantalla principal: `CalendarMonthView`

**Propósito.** Vista por defecto de la sección "Agenda". El usuario revisa la carga del mes, hace drill-down en un día específico, gestiona el estado de WhatsApp y dispara acciones masivas (recordatorios, exportar).

**Layout.**

```
┌─────────────────────────────────────────────────────────────┐
│  Header (eyebrow + título "Abril 2026")    [WA][Mes/Sem/Día][⋮]│
├─────────────────────────────────────────────────────────────┤
│  Toolbar (‹ Hoy ›)                  [● Ana ● Pedro ● Lucía] │
├──────────────────────────────────────────┬──────────────────┤
│                                          │  ┌─ stats card ─┐│
│                                          │  │ 35 ↑18% vs.. ││
│                                          │  └──────────────┘│
│         CALENDAR GRID (5×7)              │  ┌─ day detail ─┐│
│         (shell card, 18px radius)        │  │ Jueves       ││
│                                          │  │ 30 de Abril  ││
│                                          │  │              ││
│                                          │  │ [appt list]  ││
│                                          │  │ + Crear cita ││
│                                          │  └──────────────┘│
└──────────────────────────────────────────┴──────────────────┘
```

- Grid CSS principal: `grid-template-columns: 1fr 340px`, gap **16px**, padding **22px**.
- Calendario: `flex: 1`; panel lateral: ancho fijo **340px**.
- Fondo del viewport: **`#FAF7F2`** (cream).

---

## Componentes

Estructura sugerida en el codebase real:

```
src/features/calendar/
├── CalendarMonthView.tsx          // Container, gestiona estado
├── components/
│   ├── CalendarHeader.tsx         // Eyebrow + título + controles derecha
│   ├── CalendarToolbar.tsx        // Nav (‹ Hoy ›) + leyenda profesionales
│   ├── CalendarGrid.tsx           // Grid 5×7 con celdas
│   ├── CalendarDayCell.tsx        // Celda individual
│   ├── DayDetailPanel.tsx         // Panel lateral derecho
│   ├── MonthStatsCard.tsx         // Card azul con 35 + minibarras
│   ├── WhatsAppStatus.tsx         // Píldora estado WA
│   ├── ActionsMenu.tsx            // Menú ⋮
│   └── ReminderBanner.tsx         // Banner verde modo recordatorios
├── hooks/
│   ├── useReminderMode.ts
│   └── useCalendarSelection.ts
└── types.ts
```

### 1. `CalendarHeader`

- **Eyebrow**: `"GALAXIA GLAMOUR · CALENDARIO"` — `font-size: 10.5px`, `letter-spacing: 2px`, `color: #8B92A6`, `font-weight: 700`, `text-transform: uppercase`.
- **Título**: `"Abril"` (Fraunces 600, 30px, `letter-spacing: -1px`, color `#101526`) + `"2026"` (mismo estilo pero `color: #8B92A6`, `font-style: italic`, `font-weight: 400`).
- **Lado derecho** (flex gap 10px): `<WhatsAppStatus>`, `<SegmentedControl>` (Mes/Semana/Día), `<ActionsMenu>`.

### 2. `WhatsAppStatus`

Píldora con icono de WhatsApp, dot de estado y dos líneas de texto.

| Prop / estado | Color fondo | Color texto/dot | Label | Detail |
|---|---|---|---|---|
| `connected` | `#E8F8EE` | `#1FA653` | "WhatsApp conectado" | "Listo para enviar" |
| `syncing` | `#FEF6E0` | `#A1740A` (dot `#E0B025`) | "Sincronizando..." | "Reconectando" |
| `disconnected` | `#FDECEC` | `#B23A3A` (dot `#D14747`) | "WhatsApp desconectado" | "Toca para reconectar" |
| `warning` | `#FFF1E6` | `#B25A1B` (dot `#E07825`) | "Cola pendiente" | "N mensajes esperando" |

- Padding: `7px 12px 7px 10px`. Border-radius: **999** (pill) en V3.
- Dot 9×9 con borde 2px del color del fondo, posicionado bottom-right del icono.
- Si `syncing`: animación pulse 1.4s infinite en el dot.
- `onClick` → abrir modal de estado/reconexión.

**SVG del icono:** ver `reference/shared-controls.jsx` (path completo).

### 3. `ActionsMenu`

Botón ⋮ circular (36×36, `border-radius: 999`) que abre un menú flotante:

| Item | Icon | Shortcut | Highlight |
|---|---|---|---|
| Buscar citas | ⌕ | ⌘K | — |
| Recargar agenda | ↻ | — | — |
| Reordenar profesionales | ⇅ | — | — |
| **Enviar recordatorios** | ✉ | — | **sí** (color `#1E3A8A`, separator antes) |
| Exportar mes | ↧ | — | — |

- Menú: ancho 240px, fondo blanco, border `#E7E2D6`, border-radius **999** (pill) o **10px** (panel), shadow `0 10px 30px rgba(15,23,41,0.12), 0 2px 6px rgba(15,23,41,0.06)`.
- Items: padding `9px 10px`, font-size 13, hover background `#FAF7F2`.
- Item highlighted en color primary (`#1E3A8A`) y `font-weight: 600`.
- Shortcut renderizado como `<kbd>` con fondo `#F4F6FB`, padding `2px 5px`.
- Click en item → ejecuta acción y cierra menú.
- Click fuera → cierra menú (overlay `position: fixed; inset: 0`).

### 4. `CalendarToolbar`

- Izquierda: `<` (icon button 36×36) + "Hoy" (pill, padding `7px 14px`, fondo blanco, border `#E7E2D6`, font-size 12, weight 600) + `>`.
- Derecha: leyenda de profesionales (dot 8×8 + nombre, font-size 11.5, color `#404760`, weight 500), gap 12 entre items.

### 5. `CalendarGrid`

- Card contenedora: fondo `#FFFFFF`, border `#E7E2D6`, border-radius **18px**, overflow hidden.
- Header de días (DOM/LUN/.../SÁB): fondo `#FAF7F2`, border-bottom `#E7E2D6`, padding vertical 12px.
  - Texto: 10px, weight 700, letter-spacing 1.5, uppercase.
  - Color: `#1E3A8A` (deep) para DOM y SÁB; `#8B92A6` (muted) para el resto.
- Grid: `grid-template-rows: repeat(5, 1fr)`, `grid-template-columns: repeat(7, 1fr)`.
- Cada fila tiene `border-bottom: 1px solid #F0EBE0`, cada celda `border-right: 1px solid #F0EBE0`.
- En modo recordatorios activo: la card recibe `border-color: #1FA653` y `box-shadow: 0 0 0 3px rgba(31,166,83,0.12)`.

### 6. `CalendarDayCell`

```
┌──────────────────┐
│ 30  HOY     FEST │  ← día (Fraunces 18px, 500) + badges
│                  │
│ ●●● 3 citas      │  ← avatares profesionales + count
└──────────────────┘
```

- Padding `10px 9px`, gap 6px vertical.
- **Día**: Fraunces serif, `font-size: 18px`, `font-weight: 500`, `letter-spacing: -0.4px`, color `#101526`.
- **Variantes de color del número**:
  - Outside (mes anterior/siguiente): `#C9C2B5`
  - Festivo: `#D97A4A` (terracota)
  - Weekend: `#404760` (body)
  - Today (no seleccionado): `#1E3A8A` weight 700
  - Selected: `#FFFFFF`
- **Fondo de celda**:
  - Default: `#FFFFFF`
  - Outside: `#FAF7F2` con opacity 0.7
  - Holiday: `#FDF1E8` (accent soft)
  - Selected: `#1E3A8A` (deep)
  - Reminder target (modo recordatorios): `#1FA653`
  - Reminder mode + sin citas: opacity 0.4 (no clickable)
- **Badge "HOY"**: 8.5px, weight 800, letter-spacing 1, color `#1E3A8A`, uppercase.
- **Badge "FESTIVO"**: 8.5px, weight 800, letter-spacing 1, color `#D97A4A` (o `#FFB48A` si la celda está seleccionada).
- **Avatares de profesionales**: círculos 18×18 con iniciales, font-size 9 weight 700, border 1.5px blanco (o `#1E3A8A` si selected), `margin-left: -4px` (overlap), max 3 visibles.
- **Texto de conteo**: `"N citas"`, font-size 10.5, weight 600, color `#8B92A6` (o `rgba(255,255,255,0.8)` si selected).
- **Click**:
  - Modo normal → setSelected(day).
  - Modo recordatorios → si el día tiene citas, setReminderDay(day); si no, no-op.

### 7. `DayDetailPanel`

Lado derecho del grid principal (ancho 340px). Contiene 2 cards apiladas:

#### 7a. `MonthStatsCard`

- Fondo: `#1E3A8A` (deep).
- Background image extra: `radial-gradient(circle at 90% 0%, rgba(255,255,255,0.08), transparent 60%)`.
- Border-radius **16px**, padding **18px**.
- Contenido:
  - Label: "CITAS ESTE MES" (10.5px, letter-spacing 2, opacity 0.7, weight 700, uppercase).
  - Row con `justify-content: space-between`:
    - Big number: `35` (Fraunces 48px, weight 500, letter-spacing -2, line-height 1).
    - Mini bars: 12 barras 5px ancho, alturas variables, fondo `rgba(255,255,255,0.6)`, border-radius 2, gap 3, height container 28.
  - Footer: `↑ 18%` (color `#7DE5C0`, weight 700) + texto `vs marzo · 72% ocupación` (opacity 0.85).

#### 7b. `DayDetailCard`

- Fondo blanco, border `#E7E2D6`, border-radius **16px**, padding **18px**.
- `flex: 1` para llenar el alto restante; `display: flex; flex-direction: column; gap: 14px`.
- **Header**:
  - Eyebrow: nombre del día de la semana ("JUEVES"), 11px, weight 600, letter-spacing 1, uppercase, color `#8B92A6`.
  - Fecha: "30 de Abril" (Fraunces 22px, weight 600, letter-spacing -0.5, color `#101526`).
  - Derecha: "N citas" o "Sin citas" (font-size 11.5, weight 600, color `#404760`).
- **Lista de citas** (scroll vertical, gap 8):
  - Cada cita: grid `44px 1fr auto`, gap 10, padding `10px 12px`, fondo `#FAF7F2`, border-radius 10, border-left 3px del color del profesional.
  - Hora: Fraunces 14px weight 600.
  - Nombre cliente: 13px weight 600 color `#101526`.
  - Servicio + profesional: 11px color `#8B92A6`.
  - Avatar profesional: círculo 26×26, color del profesional, iniciales blancas weight 700.
- **Empty state** (sin citas):
  - Centrado, gap 6: `○` 22px + "Día libre" (13px) + "Sin citas agendadas" (11px opacity 0.7).
- **CTA**: botón ancho completo "+ Crear cita para este día" — fondo `#1E3A8A`, color blanco, padding `11px 14px`, border-radius 10, font-size 13 weight 600, shadow `0 2px 6px rgba(30,58,138,0.2)`.

### 8. `ReminderBanner`

Aparece encima del grid cuando `reminderMode = true`.

- Fondo: `#E8F8EE`, border `1px solid rgba(31,166,83,0.2)`, border-radius **12px**, padding `12px 16px`.
- Layout flex space-between, gap 12.
- **Izquierda**:
  - Icono ✉ en círculo 28×28 fondo `#1FA653`, color blanco, weight 700.
  - Texto principal: dinámico según si hay día seleccionado o no:
    - Sin día: `"Selecciona un día para enviar recordatorios"` (12.5px weight 700 color `#1FA653`).
    - Con día: `"Listo para enviar — {day} de Abril"`.
  - Subtexto (11px color `#404760`):
    - Sin día: `"Toca cualquier día con citas para preparar los mensajes."`
    - Con día: `"Se enviarán {N} recordatorios de WhatsApp a los clientes con cita ese día."`
- **Derecha**: "Cancelar" (link, color `#404760`, weight 600) + botón "Enviar (N)" (fondo `#1FA653` o `#C8D5CD` si disabled, color blanco, padding `8px 14px`, border-radius 8, weight 700).

---

## Interacciones & comportamiento

### Estado base
- Día seleccionado por defecto: hoy.
- Click en cualquier día (no outside) → actualiza `selected` y refresca panel derecho.

### Modo recordatorios (flujo completo)
1. Usuario abre `ActionsMenu` (click ⋮).
2. Click en "Enviar recordatorios" → `setReminderMode(true)`, `setReminderDay(null)`, cierra menú.
3. Aparece `ReminderBanner` arriba del grid; los días sin citas se atenúan (opacity 0.4) y no son clickeables.
4. La card del calendario recibe outline verde sutil para reforzar el modo activo.
5. Click en un día con citas → `setReminderDay(day)`; ese día se pinta verde y el banner se actualiza con el conteo y el CTA "Enviar (N)" se habilita.
6. "Cancelar" → vuelve a modo normal.
7. "Enviar" → dispara la acción real (mutation a backend), luego cierra el modo y muestra toast de confirmación (Mantine `notifications`).

### WhatsApp
- El estado se obtiene de un `useWhatsAppStatus()` hook (suscripción al backend / WebSocket).
- Click en la píldora → abre modal con QR / instrucciones de reconexión.
- Si `disconnected` o `warning` durante > 5 min, mostrar banner global (fuera del scope de esta vista).

### Otras acciones del menú
- **Buscar citas** (⌘K): abre `<Spotlight>` de Mantine con búsqueda por cliente/teléfono/servicio.
- **Recargar agenda**: invalida queries de citas del mes; mostrar `<LoadingOverlay>` durante el refetch.
- **Reordenar profesionales**: abre modal con lista drag-and-drop (sugerido: `@dnd-kit/sortable` o `mantine-react-table`).
- **Exportar mes**: descarga PDF/CSV del mes actual.

### Animaciones
- Hover de celdas: transición `background 0.15s`.
- Apertura del menú: aparece sin animación dura (o usar `Menu` de Mantine, que ya trae transición).
- Cambio de día seleccionado: instantáneo (no animar).
- Modo recordatorios on/off: el banner puede usar `<Collapse>` de Mantine.

---

## State management

```ts
// Estado local del CalendarMonthView
const [selectedDay, setSelectedDay] = useState<number>(today);
const [view, setView] = useState<'month' | 'week' | 'day'>('month');
const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());

// Hook de modo recordatorios
const {
  reminderMode,
  reminderDay,
  setReminderDay,
  enable: enableReminderMode,
  cancel: cancelReminderMode,
  send: sendReminders,
} = useReminderMode();

// Hook de menú
const [menuOpen, { toggle: toggleMenu, close: closeMenu }] = useDisclosure(false);

// Data fetching (con TanStack Query o el equivalente del proyecto)
const { data: appointments, isLoading } = useAppointmentsByMonth(currentMonth);
const { data: professionals } = useProfessionals();
const { data: monthStats } = useMonthStats(currentMonth);
const waStatus = useWhatsAppStatus();
```

---

## Mapeo a Mantine

| Componente del prototipo | Equivalente Mantine | Notas |
|---|---|---|
| Botón "Crear cita" / "Enviar" | `<Button>` | `color="dark"` + custom theme override para el azul `#1E3A8A`, o usar `theme.colors.brand` |
| Segmented Mes/Semana/Día | `<SegmentedControl>` | size sm, custom styles para fondo blanco + radius 999 |
| Pill "Hoy" | `<Button variant="default">` | radius 999 |
| Icon buttons (‹ ›, ⋮) | `<ActionIcon variant="default">` | radius 999, size 36 |
| ActionsMenu | `<Menu>` | configurar `radius`, `shadow`, `width=240` |
| Banner recordatorios | `<Alert>` o card custom | usar color verde custom |
| Avatares profesionales | `<Avatar>` con `<Avatar.Group>` | spacing="xs" |
| Stats card | `<Card>` con bg custom | usar `bg="brand.9"` |
| Lista de citas | `<Stack>` + `<Card>` | radius=10 |
| Click outside menú | `<Menu>` lo gestiona solo | — |
| Fechas / parsing | `dayjs` (Mantine ya lo usa) | usar `@mantine/dates` para Calendar si conviene |
| Toast confirmación envío | `notifications.show()` | de `@mantine/notifications` |

**Override del theme Mantine** para registrar la paleta de marca:

```ts
import { createTheme, MantineColorsTuple } from '@mantine/core';

const brand: MantineColorsTuple = [
  '#EEF1FF', '#DDE3FF', '#BBC7FF', '#94A4FA', '#7184F2',
  '#5A6EEC', '#3B5BDB', '#2F4ABF', '#1E3A8A', '#102869',
];

const cream: MantineColorsTuple = [
  '#FAF7F2', '#F5EFE3', '#F0EBE0', '#E7E2D6', '#D9D2C2',
  '#C9C2B5', '#9F9685', '#766E5E', '#5C5547', '#3F3A30',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 8,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  headings: { fontFamily: "'Fraunces', serif" },
  defaultRadius: 'md',
  colors: { brand, cream },
});
```

---

## Design tokens

### Colores

```ts
export const colors = {
  // Marca
  deep: '#1E3A8A',         // primario, CTA, today
  primary: '#3B5BDB',      // azul medio (Ana, datos)
  primarySoft: '#EEF1FF',
  // Acento cálido
  accent: '#D97A4A',       // terracota, festivos, Lucía
  accentSoft: '#FDF1E8',
  // Fondos
  cream: '#FAF7F2',        // viewport bg, cell hover
  creamDark: '#F1ECE2',
  surface: '#FFFFFF',
  // Texto
  ink: '#101526',          // headings, números importantes
  body: '#404760',         // texto secundario
  muted: '#8B92A6',        // labels, eyebrows
  // Bordes
  line: '#E7E2D6',
  lineSoft: '#F0EBE0',
  // Profesionales (semánticos por ahora; en producción vienen del backend)
  proAna: '#3B5BDB',
  proPedro: '#10B981',
  proLucia: '#D97A4A',
  // WhatsApp
  waConnected: '#1FA653',
  waConnectedBg: '#E8F8EE',
  waSyncing: '#A1740A',
  waSyncingBg: '#FEF6E0',
  waDisconnected: '#B23A3A',
  waDisconnectedBg: '#FDECEC',
  waWarning: '#B25A1B',
  waWarningBg: '#FFF1E6',
};
```

### Tipografía

```ts
export const fonts = {
  ui: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  display: "'Fraunces', Georgia, serif", // fechas, números grandes, títulos
};

export const type = {
  eyebrow: { size: 10.5, weight: 700, tracking: 2, transform: 'uppercase' },
  h1: { size: 30, weight: 600, tracking: -1, font: 'display' },
  h2: { size: 22, weight: 600, tracking: -0.5, font: 'display' },
  statBig: { size: 48, weight: 500, tracking: -2, font: 'display' },
  body: { size: 13, weight: 500 },
  bodyStrong: { size: 13, weight: 600 },
  caption: { size: 11, weight: 500 },
  micro: { size: 10, weight: 600 },
};
```

Carga de fuentes (en `index.html` o `<head>`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">
```

### Spacing & radii

```ts
export const radius = {
  sm: 6,    // chips de hora dentro de citas
  md: 10,   // chips, pills, banners
  lg: 16,   // cards (stats, day detail)
  xl: 18,   // calendar shell
  pill: 999,
};

export const spacing = {
  xs: 4, sm: 6, md: 10, lg: 14, xl: 18, '2xl': 22, '3xl': 28,
};

export const shadows = {
  cta: '0 2px 6px rgba(30,58,138,0.18)',
  ctaPlus: '0 1px 2px rgba(30,58,138,0.15), 0 4px 12px rgba(30,58,138,0.18)',
  menu: '0 10px 30px rgba(15,23,41,0.12), 0 2px 6px rgba(15,23,41,0.06)',
  cardSoft: '0 1px 0 rgba(15,23,41,0.02)',
};
```

---

## Tipos sugeridos

```ts
export type ProfessionalId = string;

export interface Professional {
  id: ProfessionalId;
  name: string;
  initials: string;       // "A", "P", "L"
  color: string;          // hex
  order: number;
}

export interface Appointment {
  id: string;
  date: string;           // ISO "YYYY-MM-DD"
  time: string;           // "HH:MM"
  clientName: string;
  clientPhone: string;
  service: string;
  professionalId: ProfessionalId;
}

export interface DayAggregate {
  date: string;
  count: number;
  professionals: ProfessionalId[];  // únicos en el día
}

export type WhatsAppStatus = 'connected' | 'syncing' | 'disconnected' | 'warning';

export interface WhatsAppState {
  status: WhatsAppStatus;
  queueCount?: number;    // para 'warning'
  lastConnectedAt?: string;
}
```

---

## Endpoints requeridos (a confirmar con backend)

- `GET /appointments?month=2026-04` → lista agrupable por día.
- `GET /professionals` → para leyenda y asignación de color.
- `GET /stats/month?month=2026-04` → `{ total, occupancyPct, deltaVsPrevMonth }`.
- `GET /whatsapp/status` → estado actual + suscripción WS para tiempo real.
- `POST /whatsapp/reminders` body `{ date: "2026-04-30", appointmentIds: [...] }` → dispara envío masivo.
- `POST /professionals/reorder` body `{ order: [id1, id2, id3] }`.
- `GET /export/month.pdf?month=2026-04` → descarga.

---

## Estados a cubrir

- **Loading inicial**: `<Skeleton>` en el grid (5×7 celdas) y en las cards del panel derecho.
- **Loading durante recarga manual**: `<LoadingOverlay visible>` sobre el grid.
- **Error de carga**: card de error en lugar del grid con botón "Reintentar".
- **WhatsApp desconectado**: banner global persistente con CTA reconectar (fuera del scope, pero el `WhatsAppStatus` ya refleja el estado).
- **Día sin citas seleccionado**: empty state en el panel.
- **Modo recordatorios sin día elegido aún**: banner en estado "Selecciona un día".
- **Envío de recordatorios en curso**: deshabilitar botón, mostrar spinner inline.

---

## Responsive

Esta vista está diseñada para **desktop ≥ 1280px**. Para tablet/mobile se sugiere:

- **< 1024px**: el panel lateral pasa a ser un `<Drawer>` lateral que se abre al seleccionar un día.
- **< 768px**: cambiar a vista de Día (lista vertical) por defecto, o a un Calendar de Mantine compacto.

Esto NO está diseñado en este handoff y debe ser una conversación aparte.

---

## Archivos de referencia

En `reference/`:

- `Mejoras Calendario.html` — Entry point del prototipo. Carga las 3 variantes (V1, V2, V3) en un design canvas. **La V3 es la elegida.**
- `v3-sidepanel.jsx` — Implementación completa de la V3 (calendario + panel + integración con shared controls).
- `shared-controls.jsx` — `WhatsAppStatus`, `ActionsMenu`, `ReminderBanner`, `useReminderMode`. Tal cual están listos para portar.
- `data.js` — Datos mock. **No usar en producción**, solo de referencia para entender la forma de datos esperada.
- `design-canvas.jsx` — Solo para visualización del prototipo, no relevante para implementación.

Para correrlo localmente: abrir `Mejoras Calendario.html` en cualquier navegador moderno (carga React + Babel desde unpkg).

---

## Checklist de implementación

- [ ] Configurar tema Mantine con paleta `brand` y `cream`.
- [ ] Cargar fuentes Plus Jakarta Sans + Fraunces.
- [ ] Crear estructura de carpetas en `src/features/calendar/`.
- [ ] Implementar tipos en `types.ts`.
- [ ] Implementar `WhatsAppStatus.tsx` (4 estados).
- [ ] Implementar `ActionsMenu.tsx` (5 items, item destacado).
- [ ] Implementar `useReminderMode.ts`.
- [ ] Implementar `ReminderBanner.tsx`.
- [ ] Implementar `CalendarDayCell.tsx` (todas las variantes de estado).
- [ ] Implementar `CalendarGrid.tsx` con cálculo de semanas (5×7 con padding mes anterior/siguiente).
- [ ] Implementar `MonthStatsCard.tsx`.
- [ ] Implementar `DayDetailPanel.tsx` con lista + empty state.
- [ ] Implementar `CalendarHeader.tsx` y `CalendarToolbar.tsx`.
- [ ] Componer todo en `CalendarMonthView.tsx`.
- [ ] Conectar a queries reales (citas, profesionales, stats, WA).
- [ ] Cablear acciones del menú (recargar, reordenar modal, exportar).
- [ ] Implementar flujo completo de envío de recordatorios.
- [ ] QA visual contra el HTML de referencia (abrir lado a lado).
- [ ] Estados loading / error / vacío.
