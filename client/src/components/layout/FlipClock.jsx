// components/layout/FlipClock.jsx
import React, { useState, useEffect, useRef } from "react";
import "./FlipClock.css";

// ── Single flipping digit/character ──────────────────────────────────
// Shows the old value on top flipping down to reveal the new value.
const FlipUnit = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value === displayValue) return;
    setPrevValue(displayValue);
    setFlipping(true);
    // displayValue updates when the CSS animation actually finishes
    // (see handleAnimationEnd) — not on a guessed timer, so it can
    // never drift out of sync with what's rendered on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleAnimationEnd = () => {
    setDisplayValue(value);
    setFlipping(false);
  };

  return (
    <span className="flip-unit">
      <span className="flip-card-bottom">
        <span className="flip-card-inner">{value}</span>
      </span>

      <span
        className={`flip-card-top ${flipping ? "is-flipping" : ""}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <span className="flip-card-inner">{flipping ? prevValue : value}</span>
      </span>
    </span>
  );
};

const FlipClock = () => {
  const [now, setNow] = useState(new Date());
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Align the tick to the real start of the next second instead of a
    // plain setInterval(1000) — a plain interval drifts a little over
    // time and causes the flip to fire slightly early/late, which reads
    // as stutter. This re-schedules itself against Date.now() every time.
    const tick = () => {
      setNow(new Date());
      const msToNextSecond = 1000 - (Date.now() % 1000);
      timeoutRef.current = setTimeout(tick, msToNextSecond);
    };

    const msToNextSecond = 1000 - (Date.now() % 1000);
    timeoutRef.current = setTimeout(tick, msToNextSecond);

    return () => clearTimeout(timeoutRef.current);
  }, []);

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <div className="flip-clock">
      <div className="flip-clock-date">
        <span className="flip-clock-day">{dayName}</span>
        <span className="flip-clock-dot">•</span>
        <span className="flip-clock-daydate">{dateStr}</span>
      </div>

      <div className="flip-clock-time">
        {hh.split("").map((ch, i) => (
          <FlipUnit key={`h${i}`} value={ch} />
        ))}
        <span className="flip-clock-colon">:</span>
        {mm.split("").map((ch, i) => (
          <FlipUnit key={`m${i}`} value={ch} />
        ))}
        <span className="flip-clock-colon">:</span>
        {ss.split("").map((ch, i) => (
          <FlipUnit key={`s${i}`} value={ch} />
        ))}
        <span className="flip-clock-ampm">{ampm}</span>
      </div>
    </div>
  );
};

export default FlipClock;