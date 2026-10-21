"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import styles from "./rosters.module.css";

export function RosterSections({ children, counts }: { children: ReactNode; counts: number[] }) {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const labels = ["Batting", "Pitching", "Schedule & scores"];
  return <div className={styles.sections}>
    <div className={styles.tabs} role="tablist" aria-label="Team statistics">
      {labels.map((label, index) => <button key={label} ref={(node) => { buttons.current[index] = node; }}
        type="button" role="tab" id={`roster-tab-${index}`} aria-controls={`roster-panel-${index}`}
        aria-selected={active === index} tabIndex={active === index ? 0 : -1}
        onClick={() => setActive(index)} onKeyDown={(event) => {
          const next = event.key === "ArrowRight" ? (active + 1) % 3 : event.key === "ArrowLeft" ? (active + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null;
          if (next !== null) { event.preventDefault(); setActive(next); buttons.current[next]?.focus(); }
        }}>
        {label}<span>{counts[index]}</span>
      </button>)}
    </div>
    {Children.toArray(children).map((child, index) => <div key={index} role="tabpanel" id={`roster-panel-${index}`} aria-labelledby={`roster-tab-${index}`} hidden={index !== active} tabIndex={0}>{child}</div>)}
  </div>;
}
