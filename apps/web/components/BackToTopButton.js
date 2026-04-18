"use client";
import { useEffect, useState } from "react";
import MicroIcon from "./MicroIcon";
export default function BackToTopButton({ label = "Top" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <button type="button" className={`back-to-top ${visible ? "visible" : ""}`.trim()} aria-label={label} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><MicroIcon name="chevron-up" className="back-to-top-arrow" /></button>;
}
