import { useEffect, useState } from "react";
import { Text, Box, Center, ActionIcon, Button, Group, Image } from "@mantine/core";
import { FaUserShield, FaSignOutAlt } from "react-icons/fa";
import { MdInstallMobile } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../app/store";
import { logout } from "../features/auth/sliceAuth";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const Footer = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();

  const organization = useSelector((state: RootState) => state.organization.organization);
  const { name, branding } = organization || {};
  const footerColor = branding?.primaryColor || branding?.themeColor || "#DE739E";
  const logoUrl = branding?.logoUrl || "/logo-default.png";
  const textColor = branding?.footerTextColor || "#E2E8F0";

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(
        (choiceResult: { outcome: "accepted" | "dismissed" }) => {
          if (choiceResult.outcome === "accepted") {
            console.log("User accepted the install prompt");
          } else {
            console.log("User dismissed the install prompt");
          }
          setDeferredPrompt(null);
        }
      );
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <Box
      component="footer"
      bg={footerColor}
      p="0.1rem 0"
      style={{
        width: "100%",
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.2)",
        position: "fixed",
        bottom: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      {deferredPrompt && (
        <Button
          leftSection={<MdInstallMobile />}
          variant="transparent"
          style={{
            position: "absolute",
            left: "0px",
            bottom: "-8px",
          }}
          onClick={handleInstallClick}
        >
          Instalar app
        </Button>
      )}

      <Center>
        <Group gap="xs" style={{ paddingTop: 4, paddingBottom: 2 }}>
          {/* Logo */}
          {logoUrl && (
            <Image
              src={logoUrl}
              alt={name}
              width={22}
              height={22}
              fit="contain"
              style={{ borderRadius: 8, background: "#fff" }}
            />
          )}
          <Text
            size="xs"
            style={{
              color: textColor,
              fontWeight: 500,
              letterSpacing: 1,
            }}
          >
            © {name || "Organización"}.
          </Text>
        </Group>
      </Center>

      <ActionIcon
        style={{
          position: "absolute",
          right: "5px",
          bottom: "5px",
          color: textColor,
        }}
        radius="lg"
        onClick={isAuthenticated ? handleLogout : () => navigate("/login-admin")}
      >
        {isAuthenticated ? <FaSignOutAlt size="1.5rem" /> : <FaUserShield size="1.5rem" />}
      </ActionIcon>
    </Box>
  );
};

export default Footer;
