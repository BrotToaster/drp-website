"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function ConnectionNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return offline ? <aside className="connection-notice" role="status"><strong>Keine Internetverbindung.</strong><span>Lass diese Seite geöffnet, damit deine Eingaben erhalten bleiben.</span><Link href="/fehler/offline" target="_blank" rel="noopener noreferrer">Verbindungshilfe (neuer Tab)</Link></aside> : null;
}
