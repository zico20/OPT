"use client";
import { useEffect, useState } from "react";
import MicroIcon from "./MicroIcon";
const K = "hazardsignal-install-hint-dismissed";
export default function InstallAppHint({ messages }) {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isIos = /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    const dismissed = localStorage.getItem(K) === "1";
    const standalone = matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
    setIos(isIos);
    if (!dismissed && !standalone && isIos) setShow(true);
  }, []);
  if (!show) return null;
  return <div className="install-hint"><div className="install-hint-copy"><MicroIcon name={ios ? "share" : "grid"} /><div><strong>{messages.common.installTitle || "Install app"}</strong><span>{ios ? (messages.common.installIosBody || "Use Share then Add to Home Screen.") : (messages.common.installBody || "Add HazardSignal to your home screen.")}</span></div></div><div className="install-hint-actions"><button type="button" className="secondary install-dismiss" onClick={() => { localStorage.setItem(K, "1"); setShow(false); }}>{messages.common.dismiss || "Dismiss"}</button><button type="button" className="install-cta" onClick={() => setShow(false)}>{ios ? (messages.common.installIosCta || "Got it") : (messages.common.installCta || "Install")}</button></div></div>;
}
