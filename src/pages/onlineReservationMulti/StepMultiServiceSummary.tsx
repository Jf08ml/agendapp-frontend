// StepMultiServiceSummary.tsx
import { Paper, Stack, Text, Group, Divider } from "@mantine/core";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { ServiceWithDate, MultiServiceBlockSelection, ServiceTimeSelection } from "../../types/multiBooking";
import dayjs from "dayjs";

interface Props {
  splitDates: boolean;
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  times: MultiServiceBlockSelection | ServiceTimeSelection[];
}

export default function StepMultiServiceSummary({
  splitDates,
  services,
  employees,
  dates,
  times,
}: Props) {
  if (!times) return null;

  return (
    <Stack>
      <Text fw={700} size="lg">Resumen de tu reserva</Text>
      <Divider />

      {!splitDates ? (
        // BLOQUE ÚNICO
        <>
          {(() => {
            const block = times as MultiServiceBlockSelection;
            const displayDate = dates[0]?.date ? dayjs(dates[0].date).format("dddd, D MMM YYYY") : "";
            return (
              <Paper withBorder p="md" radius="md">
                <Text>Fecha: <b>{displayDate}</b></Text>
                <Text>Inicio del bloque: <b>{dayjs(block.startTime!).format("h:mm A")}</b></Text>
                <Divider my="sm" />
                <Stack gap="xs">
                  {block.intervals.map((iv) => {
                    const svc = services.find((s) => s._id === iv.serviceId);
                    const emp = employees.find((e) => e._id === iv.employeeId);
                    return (
                      <Group key={`${iv.serviceId}-${iv.from}`}>
                        <Text fw={600}>{svc?.name}</Text>
                        <Text c="dimmed">
                          {dayjs(iv.from).format("h:mm A")} – {dayjs(iv.to).format("h:mm A")}
                          {emp ? ` · ${emp.names}` : " · Sin preferencia"}
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </Paper>
            );
          })()}
        </>
      ) : (
        // SPLIT
        <>
          {(times as ServiceTimeSelection[]).map((t) => {
            const svc = services.find((s) => s._id === t.serviceId);
            const d = dates.find((x) => x.serviceId === t.serviceId);
            const emp = employees.find((e) => e._id === d?.employeeId);
            const displayDate = d?.date ? dayjs(d.date).format("dddd, D MMM YYYY") : "";
            return (
              <Paper key={t.serviceId} withBorder p="md" radius="md">
                <Text fw={600}>{svc?.name}</Text>
                <Text c="dimmed">
                  {displayDate} · {t.time}
                  {emp ? ` · ${emp.names}` : " · Sin preferencia"}
                </Text>
              </Paper>
            );
          })}
        </>
      )}
    </Stack>
  );
}
