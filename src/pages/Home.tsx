import { Container, Title, Grid, Group, Text, Paper, useMantineTheme, Box } from "@mantine/core";
import { BiCalendar } from "react-icons/bi";
import { FaIdeal } from "react-icons/fa";
import { GiPriceTag } from "react-icons/gi";
import { GrLocation } from "react-icons/gr";
import { Link } from "react-router-dom";

const Home = () => {
  const theme = useMantineTheme();

  const features = [
    {
      title: "Reserva en Línea",
      icon: <BiCalendar size={32} color={theme.colors[theme.primaryColor][6]} />,
      link: "/online-reservation",
    },
    {
      title: "Servicios y Precios",
      icon: <GiPriceTag size={32} color={theme.colors[theme.primaryColor][6]} />,
      link: "/servicios-precios",
    },
    {
      title: "Plan de Fidelidad",
      icon: <FaIdeal size={32} color={theme.colors[theme.primaryColor][6]} />,
      link: "/search-client",
    },
    {
      title: "Ubicación",
      icon: <GrLocation size={32} color={theme.colors[theme.primaryColor][6]} />,
      link: "/location",
    },
  ];

  return (
    <Container size="sm" py="lg">
      <Title ta="center" fw={900} mb="sm" style={{ color: theme.colors[theme.primaryColor][6] }}>
        ¡Holaaa! Bienvenido
      </Title>
      <Text ta="center" c="dimmed" mb="xl">
        Estamos felices de tenerte aquí. Tus uñas y pestañas merecen lo mejor, ¡y aquí lo encontrarás! ✨
      </Text>

      <Grid gutter="md">
        {features.map((feature, index) => (
          <Grid.Col key={index} span={{sm: 6}}>
            <Paper
              withBorder
              radius="xl"
              p="md"
              style={{
                background: theme.colors.gray[0],
                boxShadow: theme.shadows.md,
                transition: "transform 0.15s, box-shadow 0.15s",
                cursor: "pointer",
                minHeight: 120,
              }}
              component={Link}
              to={feature.link}
              tabIndex={0}
              aria-label={feature.title}
              onMouseOver={e => (e.currentTarget.style.boxShadow = theme.shadows.lg)}
              onMouseOut={e => (e.currentTarget.style.boxShadow = theme.shadows.md)}
            >
              <Group align="center" p="md">
                <Box
                  style={{
                    borderRadius: "50%",
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 56,
                    minHeight: 56,
                  }}
                >
                  {feature.icon}
                </Box>
                <Text size="lg" fw={700} color={theme.colors[theme.primaryColor][7]}>
                  {feature.title}
                </Text>
              </Group>
            </Paper>
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
};

export default Home;
