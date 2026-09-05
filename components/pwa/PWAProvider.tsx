"use client";

import { useEffect, useState } from "react";
import { Check, CloudOff, Download, LoaderCircle, RefreshCw, Wifi } from "lucide-react";

type SyncState = "online" | "offline" | "syncing" | "complete" | "failed";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PWAProvider() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [sync, setSync] = useState<SyncState>("online");

  useEffect(() => {
    setDismissed(localStorage.getItem("smartserve-install-dismissed") === "1");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => setSync("failed"));
    const beforeInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const offline = () => setSync("offline");
    const online = async () => {
      setSync("syncing");
      try {
        const registration = await navigator.serviceWorker?.ready;
        registration?.active?.postMessage({ type: "SYNC_SAFE_ACTIONS" });
        setTimeout(() => setSync("complete"), 700);
        setTimeout(() => setSync("online"), 3000);
      } catch { setSync("failed"); }
    };
    setSync(navigator.onLine ? "online" : "offline");
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    const message = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_STATE") setSync(event.data.state);
    };
    navigator.serviceWorker?.addEventListener("message", message);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      navigator.serviceWorker?.removeEventListener("message", message);
    };
  }, []);

  const labels = { online: "Online", offline: "Offline", syncing: "Syncing", complete: "Sync complete", failed: "Sync failed" };
  const Icon = sync === "offline" ? CloudOff : sync === "syncing" ? LoaderCircle : sync === "complete" ? Check : sync === "failed" ? RefreshCw : Wifi;

  return <>
    <div className={`network-status network-${sync}`} role="status" aria-live="polite"><Icon className={sync === "syncing" ? "animate-spin" : ""} />{labels[sync]}</div>
    {installEvent && !dismissed && <div className="install-banner" role="dialog" aria-label="Install SmartServe AI">
      <div><strong>SmartServe AI</strong><p>Install for faster access and reliable ordering.</p></div>
      <button onClick={async () => { await installEvent.prompt(); await installEvent.userChoice; setInstallEvent(null); }}><Download />Install App</button>
      <button className="install-later" onClick={() => { localStorage.setItem("smartserve-install-dismissed", "1"); setDismissed(true); }}>Not now</button>
    </div>}
  </>;
}
