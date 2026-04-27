"use client";

import { useEffect, useRef, useState } from "react";

const PEEK_HEIGHT = 152;
const EXPANDED_RATIO = 0.7;
const SNAP_THRESHOLD = 60; // px the user must drag past to snap

export default function MobileBottomSheet({ peek, children }) {
  const [vh, setVh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dragDy, setDragDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startExpanded = useRef(false);

  useEffect(() => {
    function update() {
      setVh(window.innerHeight);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const expandedHeight = Math.round(vh * EXPANDED_RATIO);
  const baseHeight = expanded ? expandedHeight : PEEK_HEIGHT;

  // While dragging, dy is the touch delta (positive = down, negative = up).
  // Subtract dy from height: dragging up shrinks dy negative -> height grows.
  let height = baseHeight - (dragging ? dragDy : 0);
  if (height < PEEK_HEIGHT) height = PEEK_HEIGHT;
  if (height > expandedHeight) height = expandedHeight;

  function onTouchStart(e) {
    startY.current = e.touches[0].clientY;
    startExpanded.current = expanded;
    setDragging(true);
    setDragDy(0);
  }

  function onTouchMove(e) {
    const dy = e.touches[0].clientY - startY.current;
    setDragDy(dy);
    e.preventDefault?.();
  }

  function onTouchEnd() {
    const dy = dragDy;
    if (startExpanded.current) {
      // started expanded; if dragged down past threshold -> collapse
      if (dy > SNAP_THRESHOLD) setExpanded(false);
    } else {
      // started peek; if dragged up past threshold -> expand
      if (dy < -SNAP_THRESHOLD) setExpanded(true);
    }
    setDragging(false);
    setDragDy(0);
  }

  return (
    <div
      className={["m-sheet-shell", expanded ? "expanded" : "peek", dragging ? "dragging" : ""].filter(Boolean).join(" ")}
      style={{ height: height + "px" }}
      role="dialog"
      aria-label="Top districts"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className="m-sheet-handle-area">
        <div className="m-sheet-handle" aria-hidden="true" />
      </div>
      <div className="m-sheet-body">
        <div className="m-sheet-peek">{peek}</div>
        <div className="m-sheet-rest">{children}</div>
      </div>
    </div>
  );
}
