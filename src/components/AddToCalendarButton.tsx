// «Agregar a mi calendario» (design system, Fase 2): Google Calendar o archivo
// .ics (Apple, Outlook y el resto). Con varios eventos solo hay .ics, porque
// el enlace de Google crea uno a la vez.
import { Button, Menu, type ButtonProps } from "@mantine/core";
import { IconBrandGoogle, IconCalendarPlus, IconDownload } from "@tabler/icons-react";
import { buildIcs, googleCalendarUrl, icsFileName, validEvents, type CalendarEvent } from "../utils/addToCalendar";

interface Props extends Pick<ButtonProps, "variant" | "size" | "fullWidth"> {
  events: CalendarEvent[];
  /** Base del nombre del archivo (p. ej. el negocio). */
  fileName?: string;
}

function downloadIcs(events: CalendarEvent[], fileName: string) {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = icsFileName(fileName);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function AddToCalendarButton({ events, fileName, variant = "filled", size = "md", fullWidth }: Props) {
  const list = validEvents(events);
  if (list.length === 0) return null;
  const base = fileName || list[0].title;
  const label = "Agregar a mi calendario";
  const icon = <IconCalendarPlus size={18} stroke={1.75} />;

  if (list.length > 1) {
    return (
      <Button variant={variant} size={size} fullWidth={fullWidth} leftSection={icon} onClick={() => downloadIcs(list, base)}>
        {label} ({list.length})
      </Button>
    );
  }

  const google = googleCalendarUrl(list[0]);
  return (
    <Menu position="bottom" width="target" withinPortal shadow="md">
      <Menu.Target>
        <Button variant={variant} size={size} fullWidth={fullWidth} leftSection={icon}>
          {label}
        </Button>
      </Menu.Target>
      <Menu.Dropdown miw={240}>
        {google && (
          <Menu.Item component="a" href={google} target="_blank" rel="noopener noreferrer" leftSection={<IconBrandGoogle size={16} />}>
            Google Calendar
          </Menu.Item>
        )}
        <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => downloadIcs(list, base)}>
          Apple, Outlook u otro (.ics)
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
