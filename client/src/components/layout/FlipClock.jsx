// components/layout/FlipClock.jsx
import React, { useState, useEffect, useRef } from "react";
import "./FlipClock.css";

// ── Single flipping digit/character ──────────────────────────────────
// Shows the old value on top flipping down to reveal the new value.
const FlipUnit = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (value === displayValue) return;

    setPrevValue(displayValue);
    setFlipping(true);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDisplayValue(value);
      setFlipping(false);
    }, 350); // matches CSS animation duration

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className="flip-unit">
      {/* Static bottom half showing the incoming value */}
      <span className="flip-card-bottom">
        <span className="flip-card-inner">{value}</span>
      </span>

      {/* Top half — animates the page-turn when flipping */}
      <span className={`flip-card-top ${flipping ? "is-flipping" : ""}`}>
        <span className="flip-card-inner">{flipping ? prevValue : value}</span>
      </span>
    </span>
  );
};

const FlipClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
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