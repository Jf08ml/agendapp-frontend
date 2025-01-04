import { FC } from "react";
import { Box, Text } from "@mantine/core";
import { format, addMinutes } from "date-fns";
import { HOUR_HEIGHT } from "../DayModal";

interface TimeColumnProps {
  timeIntervals: Date[];
}

const DayModalTimeColumn: FC<TimeColumnProps> = ({ timeIntervals }) => {
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
            position: "relative", // Permite posicionar los textos relativos a cada línea
          }}
        >
          {/* Hora principal */}
          <Text
            style={{
              position: "absolute",
              top: "-8px", // Justo encima de la línea
              left: "4px",
              fontSize: "10px",
              backgroundColor: "#fff", // Fondo blanco para claridad
              padding: "0 4px",
            }}
          >
            {format(interval, "h:mm a")}
          </Text>

          {/* Línea sólida para la hora principal */}
          <Box
            style={{
              borderTop: "1px solid #ccc",
              height: `${HOUR_HEIGHT / 4}px`,
            }}
          />

          {/* Mini-marcaciones para cada 15 minutos */}
          {[15, 30, 45].map((minutes) => (
            <Box
              key={minutes}
              style={{
                height: `${HOUR_HEIGHT / 4}px`,
                position: "relative", 
                borderTop: "1px dashed rgb(171, 171, 173)",
              }}
            >
              {/* Texto de la mini-marcación */}
              <Text
                style={{
                  position: "absolute",
                  top: "-8px", // Texto encima de la línea
                  left: "4px",
                  fontSize: "10px",
                  backgroundColor: "#fff",
                  padding: "0 4px",
                }}
                c="dimmed"
              >
                {format(addMinutes(interval, minutes), "h:mm a")}
              </Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default DayModalTimeColumn;
