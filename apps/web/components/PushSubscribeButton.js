"use client";
import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushSubscribeButton() {
  const [state, setState] = useState("idle"); // idle | loading | subscribed | unsupported
  const [vapidKey, setVapidKey] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    fetch("/api/push/vapid-public-key")
      .then((r) => r.json())
      .then((data) => {
        if (data.publicKey) setVapidKey(data.publicKey);
        else setState("unsupported");
      })
      .catch(() => setState("unsupported"));

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setState("subscribed");
      });
    });
  }, []);

  const subscribe = async () => {
    if (!vapidKey) return;
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("idle");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub)
      });
      setState("subscribed");
    } catch (err) {
      console.error("[push] Subscribe failed:", err);
      setState("idle");
    }
  };

  const unsubscribe = async () => {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
      setState("idle");
    } catch (err) {
      console.error("[push] Unsubscribe failed:", err);
      setState("subscribed");
    }
  };

  if (state === "unsupported" || !vapidKey) return null;

  return (
    <button
      className={["push-subscribe-btn", state === "subscribed" ? "push-active" : ""].filter(Boolean).join(" ")}
      onClick={state === "subscribed" ? unsubscribe : subscribe}
      disabled={state === "loading"}
      title={state === "subscribed" ? "Disable push alerts" : "Enable push alerts"}
    >
      <span className="push-icon">{state === "subscribed" ? "🔔" : "🔕"}</span>
      <span className="push-label">
        {state === "subscribed" ? "Alerts On" : state === "loading" ? "..." : "Alerts"}
      </span>
    </button>
  );
}
