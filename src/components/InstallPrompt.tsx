import { useEffect, useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { Button, Group } from '@mantine/core';
import { MdInstallMobile } from 'react-icons/md';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      showInstallNotification();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const showInstallNotification = () => {
    showNotification({
      title: 'Instala Estudio Rosa',
      message: (
        <Group>
          <span>
            Añade Estudio Rosa a tu pantalla de inicio para un acceso rápido y fácil.
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={handleInstallClick}
            leftSection={<MdInstallMobile />}
          >
            Instalar
          </Button>
        </Group>
      ),
      icon: <MdInstallMobile size={24} />,
      autoClose: false,
    });
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  return null;
};

export default InstallPrompt;
