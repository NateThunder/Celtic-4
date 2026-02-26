"use client";

import { useId, useState } from "react";
import styles from "./ExpandableDescription.module.css";

type ExpandableDescriptionProps = {
  text: string;
};

const COLLAPSE_TOGGLE_MIN_LENGTH = 120;

export default function ExpandableDescription({ text }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = useId();
  const shouldShowToggle = text.length > COLLAPSE_TOGGLE_MIN_LENGTH;

  return (
    <div className={styles.wrapper}>
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
          {expanded ? "Show less" : "Expand"}
        </button>
      ) : null}
    </div>
  );
}
