"use client";
import { useState, useEffect } from "react";
import MicroIcon from "./MicroIcon";

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

  const isOn = state === "subscribed";
  const isReady = state !== "unsupported" && !!vapidKey;
  const isDisabled = state === "loading" || !isReady;

  let label;
  if (state === "loading") label = "...";
  else if (isOn) label = "Alerts On";
  else if (state === "unsupported") label = "Unsupported";
  else if (!vapidKey) label = "Unavailable";
  else label = "Alerts";

  let title;
  if (state === "unsupported") title = "Push notifications are not supported in this browser";
  else if (!vapidKey) title = "Push notifications are not configured on this server";
  else if (isOn) title = "Disable push alerts";
  else title = "Enable push alerts";

  return (
    <button
      type="button"
      className={["push-subscribe-btn", isOn ? "push-active" : ""].filter(Boolean).join(" ")}
      onClick={isReady ? (isOn ? unsubscribe : subscribe) : undefined}
      disabled={isDisabled}
      title={title}
    >
      <span className="push-icon">
        <MicroIcon name={isOn ? "bell" : "bell-off"} />
      </span>
      <span className="push-label">{label}</span>
    </button>
  );
}
