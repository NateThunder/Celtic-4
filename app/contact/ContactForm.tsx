"use client";

import { FormEvent, useState } from "react";
import styles from "./contact.module.css";

const SUBJECTS = ["Bookings", "An order", "Press", "Sheet music", "Something else"];

export default function ContactForm() {
  const [showNotice, setShowNotice] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowNotice(true);
  }

  return (
    <div className={styles.crate}>
      <h1 className={styles.crateTitle}>Send us a message</h1>
      <a className={styles.emailLink} href="mailto:info@celticworship.co.uk">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5.5h18v13H3zM3 7l9 7 9-7" />
        </svg>
        <span>info@celticworship.co.uk</span>
      </a>
      <form className={styles.sleeve} onSubmit={handleSubmit}>
        <div className={styles.twoColumns}>
          <label className={styles.field}><span>Your name</span><input name="name" type="text" autoComplete="name" required /></label>
          <label className={styles.field}><span>Email address</span><input name="email" type="email" autoComplete="email" required /></label>
        </div>
        <label className={styles.field}>
          <span>Subject</span>
          <select name="subject" defaultValue="" required>
            <option value="" disabled>Choose a subject</option>
            {SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>
        <label className={styles.field}><span>Message</span><textarea name="message" rows={4} required /></label>
        <button className={styles.submit} type="submit">Send it</button>
        <p className={styles.formStatus} aria-live="polite">
          {showNotice ? "Online sending is not connected yet. Your message has not been submitted." : "Online sending will be available soon."}
        </p>
      </form>
    </div>
  );
}
