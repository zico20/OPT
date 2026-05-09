"use client";

import { useEffect, useRef } from "react";

// Lightweight version of DesktopBgParticles — same warm orange dust look but
// trimmed for mobile battery: ~40 particles (vs 140), smaller radii, slower
// drift, lower opacity. Bails out entirely when the user prefers reduced
// motion. Sits behind the page content (z-index: 0) inside `.m-*` wrappers
// that have z-index: 1 on their scroll containers (already configured in
// globals.css for the static pages).
export default function MobileBgParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let raf;

    let lastW = 0;
    let lastH = 0;
    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width / (window.devicePixelRatio || 1);
    const H = () => canvas.height / (window.devicePixelRatio || 1);

    const COUNT = 40;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      r: Math.random() * 1.2 + 0.5,
      dx: (Math.random() - 0.5) * 0.18,
      dy: (Math.random() - 0.5) * 0.18,
      opacity: Math.random() * 0.4 + 0.18,
      hue: 12 + Math.random() * 30,
      sat: 80 + Math.random() * 20,
      light: 55 + Math.random() * 15,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.004 + Math.random() * 0.008
    }));

    let t = 0;
    function frame() {
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);
      t += 1;
      particles.forEach((p) => {
        const twinkle = Math.sin(t * p.twinkleSpeed + p.twinkleOffset) * 0.18;
        const alpha = Math.max(0.04, Math.min(0.85, p.opacity + twinkle));

        // Soft halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.14})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light + 8}%, ${alpha})`;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      });
      raf = requestAnimationFrame(frame);
    }
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="m-bg-particles" aria-hidden="true" />;
}
