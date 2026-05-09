"use client";

import { useEffect, useRef, useState } from "react";

const PEEK_HEIGHT = 108;
const EXPANDED_RATIO = 0.7;
const SNAP_THRESHOLD = 60; // px the user must drag past to snap

export default function MobileBottomSheet({ peek, children, listHeader = null, above = null }) {
  const [vh, setVh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dragDy, setDragDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragZoneRef = useRef(null);
  const startY = useRef(0);
  const startExpanded = useRef(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    function update() {
      setVh(window.innerHeight);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Touch listeners are bound only to the drag zone (handle + peek + optional
  // listHeader) — never the scrollable list area below. Without this split,
  // the user can't scroll a long list inside the sheet because every touch
  // there would be intercepted as a sheet-resize drag.
  useEffect(() => {
    const node = dragZoneRef.current;
    if (!node) return undefined;

    function handleStart(e) {
      const t = e.touches[0];
      if (!t) return;
      startY.current = t.clientY;
      startExpanded.current = expanded;
      draggingRef.current = true;
      setDragging(true);
      setDragDy(0);
    }

    function handleMove(e) {
      if (!draggingRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY.current;
      setDragDy(dy);
      e.preventDefault();
    }

    function handleEnd() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      setDragDy((currentDy) => {
        if (startExpanded.current) {
          if (currentDy > SNAP_THRESHOLD) setExpanded(false);
        } else {
          if (currentDy < -SNAP_THRESHOLD) setExpanded(true);
        }
        return 0;
      });
    }

    node.addEventListener("touchstart", handleStart, { passive: true });
    node.addEventListener("touchmove", handleMove, { passive: false });
    node.addEventListener("touchend", handleEnd, { passive: true });
    node.addEventListener("touchcancel", handleEnd, { passive: true });
    return () => {
      node.removeEventListener("touchstart", handleStart);
      node.removeEventListener("touchmove", handleMove);
      node.removeEventListener("touchend", handleEnd);
      node.removeEventListener("touchcancel", handleEnd);
    };
  }, [expanded]);

  const expandedHeight = Math.round(vh * EXPANDED_RATIO);
  const baseHeight = expanded ? expandedHeight : PEEK_HEIGHT;

  // While dragging, dy is the touch delta (positive = down, negative = up).
  // Subtract dy from height: dragging up shrinks dy negative -> height grows.
  let height = baseHeight - (dragging ? dragDy : 0);
  if (height < PEEK_HEIGHT) height = PEEK_HEIGHT;
  if (height > expandedHeight) height = expandedHeight;

  const aboveBottom = 92 + height + 8;

  return (
    <>
      {above && (
        <div
          className={["m-sheet-above", expanded ? "expanded" : "peek", dragging ? "dragging" : ""].filter(Boolean).join(" ")}
          style={{ bottom: aboveBottom + "px" }}
          aria-hidden={expanded || undefined}
        >
          {above}
        </div>
      )}
      <div
        className={["m-sheet-shell", expanded ? "expanded" : "peek", dragging ? "dragging" : ""].filter(Boolean).join(" ")}
        style={{ height: height + "px" }}
        role="dialog"
        aria-label="Top districts"
      >
        <div ref={dragZoneRef} className="m-sheet-drag-zone">
          <div className="m-sheet-handle-area">
            <div className="m-sheet-handle" aria-hidden="true" />
          </div>
          <div className="m-sheet-peek">{peek}</div>
          {listHeader && expanded && (
            <div className="m-sheet-list-header">{listHeader}</div>
          )}
        </div>
        <div className="m-sheet-rest">{children}</div>
      </div>
    </>
  );
}
