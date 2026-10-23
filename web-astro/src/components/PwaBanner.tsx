/** PWA install banner: appears on beforeinstallprompt unless dismissed. */
import React, { useEffect, useState } from "react";

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
    <div className={`pwa-install-banner${show ? " show" : ""}`}>
      <p className="pwa-install-text">Instala esta app para acceso rápido y offline</p>
      <div className="pwa-install-btns">
        <button type="button" className="pwa-install-yes" onClick={install}>
          Instalar
        </button>
        <button type="button" className="pwa-install-no" onClick={dismiss}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
