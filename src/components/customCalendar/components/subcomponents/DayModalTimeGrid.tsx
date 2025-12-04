import { FC } from "react";
import { Box } from "@mantine/core";
import { addMinutes } from "date-fns";
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
  const marks = [0, 15, 30, 45];

  const canCreate = hasPermission("appointments:create");

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
      {timeIntervals.map((interval, hourIndex) =>
        marks.map((minutes, markIndex) => {
          const isMainHour = minutes === 0;
          const segmentHeight = HOUR_HEIGHT / marks.length;
          const top =
            hourIndex * HOUR_HEIGHT + segmentHeight * markIndex;

          const handleClick = () => {
            if (!canCreate) return;
            const date = addMinutes(interval, minutes);
            onOpenModal(selectedDay, date);
          };

          return (
            <Box
              key={`${hourIndex}-${minutes}`}
              style={{
                position: "absolute",
                top,
                left: 0,
                right: 0,
                height: segmentHeight,
                cursor: canCreate ? "pointer" : "default",
              }}
              onClick={handleClick}
            >
              {/* Línea guía (hora o 15/30/45) */}
              <Box
                style={{
                  borderTop: isMainHour
                    ? "1px solid #e0e0e0"
                    : "1px dashed rgb(171, 171, 173)",
                  height: 0,
                }}
              />
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default DayModalTimeGrid;
