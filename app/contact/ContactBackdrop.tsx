"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./contact.module.css";

export default function ContactBackdrop() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`${styles.backdrop} ${isLoaded ? styles.backdropLoaded : ""}`}>
      <Image
        className={styles.backdropImage}
        src="/photos/celtic-still-gold-v2.png"
        alt=""
        fill
        priority
        sizes="100vw"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}
