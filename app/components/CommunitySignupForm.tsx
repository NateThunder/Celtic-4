"use client";

import { FormEvent, useState } from "react";

type SubmissionState = "idle" | "submitting" | "success" | "error";

const statusCopy: Record<SubmissionState, string> = {
  idle: "Your details will be sent securely to the Celtic Worship team.",
  submitting: "Sending your sign-up request…",
  success: "Thank you — your sign-up request has been sent.",
  error: "We could not send your request. Please try again.",
};

export default function CommunitySignupForm() {
  const [state, setState] = useState<SubmissionState>("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setState("submitting");

    try {
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          email: data.get("email"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
        }),
      });

      if (!response.ok) throw new Error("Signup request failed");
      form.reset();
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <form className="home-community-form" aria-describedby="community-status" onSubmit={submit}>
      <div className="home-community-name-row">
        <label>
          <span>First name</span>
          <input
            type="text"
            name="firstName"
            placeholder="First name*"
            autoComplete="given-name"
            maxLength={60}
            required
          />
        </label>
        <label>
          <span>Last name</span>
          <input
            type="text"
            name="lastName"
            placeholder="Last name*"
            autoComplete="family-name"
            maxLength={60}
            required
          />
        </label>
      </div>
      <label>
        <span>Email address</span>
        <input
          type="email"
          name="email"
          placeholder="Email*"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
        />
      </label>
      <label className="home-community-honeypot" aria-hidden="true">
        <span>Website</span>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending…" : "Join the community"}
      </button>
      <label className="home-community-consent">
        <input type="checkbox" name="consent" required />
        <span>I agree to receive email updates from Celtic Worship.</span>
      </label>
      <p
        id="community-status"
        className="home-community-status"
        data-state={state}
        role="status"
        aria-live="polite"
      >
        {statusCopy[state]}
      </p>
    </form>
  );
}
