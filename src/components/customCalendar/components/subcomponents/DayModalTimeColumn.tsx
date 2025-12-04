import { FC } from "react";
import { Box, Text } from "@mantine/core";
import { format, addMinutes } from "date-fns";
import { HOUR_HEIGHT } from "../DayModal";

interface TimeColumnProps {
  timeIntervals: Date[];
}

const DayModalTimeColumn: FC<TimeColumnProps> = ({ timeIntervals }) => {
  const marks = [0, 15, 30, 45];

  return (
    <Box
      style={{
        position: "sticky",
        left: 0,
        top: 0,
        zIndex: 2,
        backgroundColor: "#fff",
        borderRight: "1px solid #e0e0e0",
        width: "80px",
      }}
    >
      {timeIntervals.map((interval, index) => (
        <Box
          key={index}
          style={{
            height: `${HOUR_HEIGHT}px`,
            position: "relative",
          }}
        >
          {marks.map((minutes, idx) => {
            const isMainHour = minutes === 0;
            const top = (HOUR_HEIGHT * idx) / marks.length;

            const date = addMinutes(interval, minutes);

            return (
              <Box
                key={minutes}
                style={{
                  position: "absolute",
                  top: `${top}px`,
                  left: 0,
                  right: 0,
                  height: 0,
                }}
              >
                {/* Línea de la marca */}
                <Box
                  style={{
                    borderTop: isMainHour
                      ? "1px solid #ccc"
                      : "1px dashed rgb(171, 171, 173)",
                  }}
                />

                {/* Texto pegado a esa misma línea */}
                <Text
                  c={isMainHour ? "dark" : "dimmed"}
                  style={{
                    position: "absolute",
                    top: -8,
                    left: 4,
                    fontSize: isMainHour ? 10 : 9,
                    backgroundColor: "#fff",
                    padding: "0 4px",
                    borderRadius: 999,
                  }}
                >
                  {format(date, "h:mm a")}
                </Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export default DayModalTimeColumn;
