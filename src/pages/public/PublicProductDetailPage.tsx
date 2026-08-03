import { useEffect, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  AspectRatio,
  Stack,
  Group,
  Title,
  Text,
  Badge,
  Button,
  ActionIcon,
  Divider,
  Center,
  Loader,
  Anchor,
  useMantineTheme,
  rem,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { Image } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import {
  IconArrowLeft,
  IconBuildingStore,
  IconShare,
  IconClipboardCheck,
  IconShoppingCart,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { getProductDetail, StoreProduct } from "../../services/storeService";
import { useStoreCart } from "../../hooks/useStoreCart";
import { formatCurrency } from "../../utils/formatCurrency";
import { storeImageSrc } from "../../utils/storeImage";

export default function PublicProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  // De dónde vino el visitante — siempre la tienda, salvo enlace directo/compartido.
  const backTo = (location.state as { backTo?: string } | null)?.backTo || "/tienda";
  const theme = useMantineTheme();
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );
  const primary = organization?.branding?.primaryColor || theme.colors[theme.primaryColor][6];

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useStoreCart(organization?._id);

  useEffect(() => {
    if (!id || !organization?._id) return;
    let alive = true;
    setLoading(true);
    setNotFound(false);
    getProductDetail(id, organization._id).then((data) => {
      if (!alive) return;
      if (data) {
        setProduct(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id, organization?._id]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — ${organization?.name || ""}`;
    }
    return () => {
      document.title = organization?.name || "AgenditApp";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: product?.name,
      text: product ? `${product.name} — ${organization?.name || ""}` : undefined,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // El usuario canceló el share sheet — no es un error real
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showNotification({
        title: "Enlace copiado",
        message: "Ya puedes compartirlo por WhatsApp o donde prefieras.",
        color: "green",
        icon: <IconClipboardCheck size={16} />,
      });
    } catch {
      showNotification({
        title: "No se pudo copiar el enlace",
        message: "Copia la URL manualmente desde la barra de direcciones.",
        color: "red",
      });
    }
  };

  if (loading || !organization) {
    return (
      <Center mih="60vh">
        <Loader color={primary} />
      </Center>
    );
  }

  if (notFound || !product) {
    return (
      <Container size="sm" py={rem(80)}>
        <Stack align="center" gap="sm">
          <Title order={3} ta="center">
            No encontramos este producto
          </Title>
          <Text c="dimmed" ta="center">
            Puede que ya no esté disponible. Mira el resto del catálogo de{" "}
            {organization.name}.
          </Text>
          <Anchor component={Link} to="/tienda" fw={600}>
            Ver toda la tienda
          </Anchor>
        </Stack>
      </Container>
    );
  }

  const images = [product.imageUrl, ...(product.images || [])].filter(
    (img): img is string => !!img
  );
  const qty = cart.find((i) => i.product._id === product._id)?.quantity ?? 0;

  const addToCart = () => {
    showNotification({
      message: "Producto agregado al carrito.",
      icon: <IconShoppingCart size={16} />,
      autoClose: 2000,
      withBorder: true,
    });
    setCart((prev) => {
      const existing = prev.find((i) => i.product._id === product._id);
      if (existing) {
        return prev.map((i) =>
          i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product._id === product._id ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  return (
    <Container size="sm" py={{ base: "md", sm: rem(48) }}>
      <Anchor
        component={Link}
        to={backTo}
        c="dimmed"
        size="sm"
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        mb="md"
      >
        <IconArrowLeft size={14} /> Volver a la tienda
      </Anchor>

      <AspectRatio
        ratio={1}
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          background: theme.colors.gray[1],
        }}
      >
        {images.length > 0 ? (
          images.length > 1 ? (
            <Carousel withIndicators loop height="100%">
              {images.map((img, i) => (
                <Carousel.Slide key={i}>
                  <Image src={storeImageSrc(img)} h="100%" fit="cover" alt={product.name} />
                </Carousel.Slide>
              ))}
            </Carousel>
          ) : (
            <Image src={storeImageSrc(images[0])} h="100%" fit="cover" alt={product.name} />
          )
        ) : (
          <Center h="100%">
            <Stack align="center" gap={8}>
              <IconBuildingStore size={48} stroke={1.2} color={theme.colors.gray[4]} />
              <Text fz="sm" fw={500} c={theme.colors.gray[5]}>
                {product.name}
              </Text>
            </Stack>
          </Center>
        )}
      </AspectRatio>

      <Stack gap="sm" mt="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap={6}>
            {product.category && (
              <Badge color={primary} variant="light" size="sm">
                {product.category}
              </Badge>
            )}
            {product.featured && (
              <Badge color="yellow" variant="filled" size="sm">
                Destacado
              </Badge>
            )}
          </Group>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconShare size={14} />}
            onClick={handleShare}
          >
            Compartir
          </Button>
        </Group>

        {product.brand && (
          <Text size="sm" c="dimmed" tt="uppercase" fw={600} lts={0.5}>
            {product.brand}
          </Text>
        )}

        <Title order={2}>{product.name}</Title>

        <Group gap="lg" align="center">
          <Text fw={700} fz={rem(28)} c={primary}>
            {formatCurrency(product.salePrice, organization.currency || "COP")}
          </Text>
          {product.outOfStock && (
            <Badge color="dark" variant="filled">
              Agotado
            </Badge>
          )}
        </Group>

        {qty === 0 ? (
          <Button
            size="md"
            color={primary}
            radius="md"
            fullWidth
            leftSection={<IconShoppingCart size={18} />}
            disabled={!!product.outOfStock}
            onClick={addToCart}
          >
            Agregar al carrito
          </Button>
        ) : (
          <Group gap="sm" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
              <ActionIcon
                variant="light"
                size="lg"
                radius="md"
                aria-label="Quitar uno"
                onClick={() => changeQty(-1)}
              >
                <IconMinus size={16} />
              </ActionIcon>
              <Text fw={700} ta="center" style={{ flex: 1 }}>
                {qty} en el carrito
              </Text>
              <ActionIcon
                variant="light"
                size="lg"
                radius="md"
                aria-label="Agregar uno"
                onClick={() => changeQty(1)}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>
            <Button variant="light" color={primary} radius="md" onClick={() => navigate("/tienda")}>
              Ver carrito
            </Button>
          </Group>
        )}

        {product.description && (
          <>
            <Divider mt="sm" />
            <Text style={{ whiteSpace: "pre-wrap" }}>{product.description}</Text>
          </>
        )}

        {product.usageInstructions && (
          <>
            <Divider />
            <Box>
              <Text fw={600} fz="sm" mb={4}>
                Modo de uso
              </Text>
              <Text c="dimmed" fz="sm" style={{ whiteSpace: "pre-wrap" }}>
                {product.usageInstructions}
              </Text>
            </Box>
          </>
        )}
      </Stack>
    </Container>
  );
}
