"use client";

import Image from "next/image";
import { KeyboardEvent, useState } from "react";

export default function AlbumStack() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded((current) => !current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleExpanded();
  };

  return (
    <div
      className={`album-stack${isExpanded ? " is-expanded" : ""}`}
      aria-label="Stacked albums"
      role="button"
      tabIndex={0}
      aria-pressed={isExpanded}
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
    >
      <figure className="album-card album-homeward">
        <Image
          src="/HOMEWARD.jpeg"
          alt="Celtic Worship Homeward album art"
          width={320}
          height={320}
        />
      </figure>
      <figure className="album-card album-morningtide">
        <Image
          src="/MORNINGTIDE.webp"
          alt="Celtic Worship Morningtide album art"
          width={320}
          height={320}
        />
      </figure>
      <figure className="album-card album-come-behold">
        <Image
          src="/COME%20BEHOLD.webp"
          alt="Celtic Worship Come Behold album art"
          width={320}
          height={320}
        />
      </figure>
      <figure className="album-card album-harvest">
        <Image
          src="/Harvest.webp"
          alt="Celtic Worship Harvest album art"
          width={320}
          height={320}
        />
      </figure>
    </div>
  );
}
