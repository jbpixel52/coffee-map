/** PWA install banner: appears on beforeinstallprompt unless dismissed. */
import React, { useEffect, useState } from "react";
import { Button, Paragraph, XStack, YStack } from "tamagui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem("pwa-dismissed")) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setShow(false);
      localStorage.setItem("pwa-dismissed", "1");
    }
    setDeferred(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-dismissed", "1");
  };

  return (
    <YStack className={`pwa-install-banner${show ? " show" : ""}`} gap="$2.5">
      <Paragraph margin={0} fontSize={14} color="$fg">
        Instala esta app para acceso rápido y offline
      </Paragraph>
      <XStack gap="$2">
        <Button flex={1} backgroundColor="$accent" color="white" fontWeight="600" onPress={install}>
          Instalar
        </Button>
        <Button flex={1} variant="outlined" borderColor="$border" onPress={dismiss}>
          Ahora no
        </Button>
      </XStack>
    </YStack>
  );
}
