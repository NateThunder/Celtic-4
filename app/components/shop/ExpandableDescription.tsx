"use client";

import { useId, useState } from "react";
import styles from "./ExpandableDescription.module.css";

type ExpandableDescriptionProps = {
  text: string;
  variant?: "card" | "product";
};

const COLLAPSE_TOGGLE_MIN_LENGTH = 120;

export default function ExpandableDescription({ text, variant = "card" }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = useId();
  const shouldShowToggle = text.length > COLLAPSE_TOGGLE_MIN_LENGTH;

  return (
    <div className={`${styles.wrapper} ${variant === "product" ? styles.product : ""}`}>
      <p
        id={descriptionId}
        className={`${styles.copy} ${expanded || !shouldShowToggle ? styles.copyExpanded : styles.copyCollapsed}`}
      >
        {text}
      </p>
      {shouldShowToggle ? (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((previous) => !previous)}
          aria-expanded={expanded}
          aria-controls={descriptionId}
        >
          <span>{expanded ? "Show less" : "Show more"}</span>
          <svg
            className={expanded ? styles.toggleIconExpanded : styles.toggleIcon}
            viewBox="0 0 12 8"
            fill="none"
            aria-hidden="true"
          >
            <path d="M1 1.25 6 6.25l5-5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
