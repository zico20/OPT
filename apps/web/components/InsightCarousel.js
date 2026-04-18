"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MicroIcon from "./MicroIcon";

function clampPercent(value, fallback = 18) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(12, Math.min(100, numeric));
}

export default function InsightCarousel({
  locale,
  messages,
  missionState,
  missionTitle,
  focusLabel,
  warningDistrictCount,
  highestAreaRaw,
  highestAreaValue,
  activeFireDistricts,
  criticalDistricts,
  runDate,
  selectedThreshold,
  peakProbabilityRaw,
  peakProbabilityValue,
  workflowStates = [],
  subscribeUrl = "",
  recentAlertCount = 0
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStateRef = useRef({
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    tracking: false
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => setReduceMotion(mediaQuery.matches);
    applyPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applyPreference);
      return () => mediaQuery.removeEventListener("change", applyPreference);
    }

    mediaQuery.addListener(applyPreference);
    return () => mediaQuery.removeListener(applyPreference);
  }, []);

  const slides = useMemo(() => {
    const watchItems = [
      messages.home.watchItem1,
      messages.home.watchItem2,
      messages.home.watchItem3
    ].filter(Boolean);

    return [
      {
        id: "brief",
        eyebrow: messages.home.briefEyebrow,
        title: messages.home.briefTitle,
        body: messages.home.briefBody,
        metrics: [
          { label: messages.mission.label, value: missionTitle },
          { label: messages.mission.focus, value: focusLabel || "-" },
          { label: messages.home.briefWarnings, value: String(warningDistrictCount) },
          { label: messages.home.highArea, value: highestAreaValue }
        ],
        actions: [
          { href: "#operational-map", label: messages.home.ctaMap },
          { href: "#recent-alert-feed", label: messages.home.ctaAlerts },
          { href: "/" + locale + "/methodology", label: messages.home.ctaMethod }
        ],
        renderVisual: () => (
          <div className="insight-mini-board">
            <div className="insight-mini-tile">
              <span>{messages.home.lastRun}</span>
              <strong>{runDate}</strong>
            </div>
            <div className="insight-mini-tile">
              <span>{messages.home.threshold}</span>
              <strong>{selectedThreshold}</strong>
            </div>
            <div className="insight-mini-rail">
              <span className="insight-mini-kicker">{messages.home.mapTitle}</span>
              <div className="insight-mini-track">
                <div className="insight-mini-fill fill-forest" style={{ width: `${clampPercent(highestAreaRaw, 35)}%` }} />
              </div>
              <div className="insight-mini-caption">
                <span>{messages.home.highArea}</span>
                <strong>{highestAreaValue}</strong>
              </div>
            </div>
          </div>
        )
      },
      {
        id: "signal",
        eyebrow: messages.home.watchTitle,
        title: messages.home.toolsTitle,
        body: messages.home.toolsBody,
        list: watchItems,
        actions: subscribeUrl
          ? [{ href: subscribeUrl, label: messages.common.subscribeTelegram, external: true }]
          : [],
        renderVisual: () => (
          <div className="insight-signal-visual">
            <div className="insight-signal-row">
              <span>{messages.home.maxProb}</span>
              <div className="insight-bar-track">
                <div className="insight-bar-fill fill-accent" style={{ width: `${clampPercent((peakProbabilityRaw || 0) * 100, 12)}%` }} />
              </div>
              <strong>{peakProbabilityValue}</strong>
            </div>
            <div className="insight-signal-row">
              <span>{messages.home.highArea}</span>
              <div className="insight-bar-track">
                <div className="insight-bar-fill fill-forest" style={{ width: `${clampPercent(highestAreaRaw, 18)}%` }} />
              </div>
              <strong>{highestAreaValue}</strong>
            </div>
            <div className="insight-signal-row">
              <span>{messages.home.feed}</span>
              <div className="insight-bar-track">
                <div className="insight-bar-fill fill-telegram" style={{ width: `${clampPercent(recentAlertCount * 12, 16)}%` }} />
              </div>
              <strong>{recentAlertCount}</strong>
            </div>
            <div className="insight-pill-row">
              <span className="insight-inline-pill"><MicroIcon name="bell" /> {messages.home.feed}</span>
              <span className="insight-inline-pill"><MicroIcon name="flame" /> {messages.home.hotspots}: {activeFireDistricts}</span>
              <span className="insight-inline-pill"><MicroIcon name="alert" /> {messages.home.criticalDistricts}: {criticalDistricts}</span>
            </div>
          </div>
        )
      },
      {
        id: "workflow",
        eyebrow: messages.home.workflowEyebrow,
        title: messages.home.workflowTitle,
        body: messages.home.workflowBody,
        actions: [
          { href: "/" + locale + "/alerts", label: messages.home.ctaAlerts },
          { href: "/" + locale + "/methodology", label: messages.home.ctaMethod }
        ],
        renderVisual: () => (
          <div className="insight-timeline-visual">
            {workflowStates.map((state) => (
              <div
                key={state.id}
                className={["insight-timeline-step", state.id === missionState ? "active" : "", "tone-" + state.id].filter(Boolean).join(" ")}
              >
                <span>{state.step}</span>
                <strong>{state.title}</strong>
              </div>
            ))}
          </div>
        )
      }
    ];
  }, [
    activeFireDistricts,
    criticalDistricts,
    focusLabel,
    highestAreaRaw,
    highestAreaValue,
    locale,
    messages,
    missionTitle,
    missionState,
    peakProbabilityRaw,
    peakProbabilityValue,
    recentAlertCount,
    runDate,
    selectedThreshold,
    subscribeUrl,
    warningDistrictCount,
    workflowStates
  ]);

  useEffect(() => {
    if (paused || reduceMotion || slides.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [paused, reduceMotion, slides.length]);

  const activeSlide = slides[activeIndex];

  function goTo(index) {
    setActiveIndex(index);
  }

  function goBy(direction) {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  }

  function handleTouchStart(event) {
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      tracking: true
    };
    setPaused(true);
  }

  function handleTouchMove(event) {
    if (!touchStateRef.current.tracking) {
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    touchStateRef.current.deltaX = touch.clientX - touchStateRef.current.startX;
    touchStateRef.current.deltaY = touch.clientY - touchStateRef.current.startY;
  }

  function handleTouchEnd() {
    const { deltaX, deltaY, tracking } = touchStateRef.current;
    if (!tracking) {
      return;
    }

    touchStateRef.current.tracking = false;
    setPaused(false);

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 52 || absX <= absY * 1.2) {
      return;
    }

    goBy(deltaX < 0 ? 1 : -1);
  }

  return (
    <div
      className="insight-carousel"
      aria-roledescription="carousel"
      aria-label="Operational insight carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false);
        }
      }}
    >
      <div className="insight-carousel-head">
        <span className="eyebrow">{activeSlide.eyebrow}</span>
        <div className="insight-carousel-controls">
          <button type="button" className="insight-nav" onClick={() => goBy(-1)} aria-label="Previous insight">
            &#8249;
          </button>
          <div className="insight-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={["insight-dot", index === activeIndex ? "active" : ""].join(" ")}
                onClick={() => goTo(index)}
                aria-label={`Insight ${index + 1}`}
              />
            ))}
          </div>
          <button type="button" className="insight-nav" onClick={() => goBy(1)} aria-label="Next insight">
            &#8250;
          </button>
        </div>
      </div>

      <div
        className="insight-carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="insight-carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {slides.map((slide) => (
            <article key={slide.id} className={["insight-slide", "slide-" + slide.id].join(" ")}>
              <div className="insight-slide-copy">
                <h2>{slide.title}</h2>
                <p className="story-lead">{slide.body}</p>

                {slide.metrics ? (
                  <div className="insight-metric-grid">
                    {slide.metrics.map((metric) => (
                      <article className="insight-metric-card" key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </article>
                    ))}
                  </div>
                ) : null}

                {slide.list ? (
                  <div className="insight-list">
                    {slide.list.map((item) => (
                      <div className="insight-list-item" key={item}>
                        <MicroIcon name="mission" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {slide.actions?.length ? (
                  <div className="insight-actions">
                    {slide.actions.map((action) => (
                      action.external ? (
                        <a
                          key={action.label}
                          className="button secondary"
                          href={action.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {action.label}
                        </a>
                      ) : (
                        <Link key={action.label} className="button secondary" href={action.href}>
                          {action.label}
                        </Link>
                      )
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="insight-slide-visual">
                {slide.renderVisual()}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
