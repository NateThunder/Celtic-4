import nodemailer from "nodemailer";
import type { CommunitySignup } from "./communitySignup";

const DESTINATION = "info@celticworship.co.uk";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} email configuration.`);
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

export async function deliverCommunitySignup(signup: CommunitySignup): Promise<void> {
  const host = requiredEnvironment("SMTP_HOST");
  const user = requiredEnvironment("SMTP_USER");
  const password = requiredEnvironment("SMTP_PASSWORD");
  const port = Number(process.env.SMTP_PORT || "465");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Invalid SMTP_PORT email configuration.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
  const fullName = `${signup.firstName} ${signup.lastName}`;

  const result = await transporter.sendMail({
    to: DESTINATION,
    from: { address: user, name: "Celtic Worship website" },
    replyTo: { address: signup.email, name: fullName },
    subject: `Community sign-up request — ${fullName}`,
    text: [
      "A visitor has requested to join the Celtic Worship community mailing list.",
      "",
      `Name: ${fullName}`,
      `Email: ${signup.email}`,
      "Consent: The visitor agreed to receive email updates from Celtic Worship.",
    ].join("\n"),
    html: `<h1>Community sign-up request</h1><p>A visitor has requested to join the Celtic Worship community mailing list.</p><dl><dt>Name</dt><dd>${escapeHtml(fullName)}</dd><dt>Email</dt><dd>${escapeHtml(signup.email)}</dd><dt>Consent</dt><dd>The visitor agreed to receive email updates from Celtic Worship.</dd></dl>`,
  });

  console.log(JSON.stringify({ event: "community_signup_delivered", messageId: result.messageId }));
}
