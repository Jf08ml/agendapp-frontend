import { FC } from "react";
import { Box } from "@mantine/core";
import { HOUR_HEIGHT } from "../DayModal";

interface TimeGridProps {
  timeIntervals: Date[];
  hasPermission: (permission: string) => boolean;
  selectedDay: Date;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
}

const DayModalTimeGrid: FC<TimeGridProps> = ({
  timeIntervals,
  hasPermission,
  onOpenModal,
  selectedDay,
}) => {
  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 0,
      }}
    >
      {timeIntervals.map((interval, index) => (
        <Box
          key={index}
          style={{
            position: "absolute",
            top: `${index * HOUR_HEIGHT}px`,
            left: 0,
            right: 0,
          }}
        >
          {/* Línea sólida para la hora principal */}
          <Box
            style={{
              borderTop: "1px solid #e0e0e0",
              height: `${HOUR_HEIGHT / 4}px`,
            }}
            onClick={() =>
              hasPermission("appointments:create") &&
              onOpenModal(selectedDay, interval)
            }
          />

          {/* Líneas punteadas para las mini-marcaciones */}
          {[15, 30, 45].map((_, miniIndex) => (
            <Box
              key={miniIndex}
              style={{
                borderTop: "1px dashed rgb(171, 171, 173)",
                height: `${HOUR_HEIGHT / 4}px`,
              }}
              onClick={() =>
                hasPermission("appointments:create") &&
                onOpenModal(selectedDay, interval)
              }
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default DayModalTimeGrid;
