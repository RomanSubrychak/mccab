import "dotenv/config";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || SMTP_USER;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!SMTP_HOST) {
    console.warn(
        IS_PRODUCTION
            ? "SMTP_HOST is not set: verification emails can't be sent."
            : "SMTP_HOST is not set: verification codes will be printed here instead of emailed.",
    );
}

const transporter = SMTP_HOST
    ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          // Port 465 is encrypted from the start. Other ports upgrade with STARTTLS.
          secure: SMTP_PORT === 465,
          auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
          // Registration waits for this send, so don't let a bad host hang the request.
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
      })
    : null;

export async function sendVerificationEmail(
    to: string,
    code: string,
    expiresInMinutes: number,
): Promise<void> {
    if (!transporter) {
        // Codes must never reach production logs.
        if (IS_PRODUCTION) {
            throw new Error("SMTP_HOST is not set.");
        }
        console.log(`Verification code for ${to}: ${code}`);
        return;
    }

    // School mail filters (Microsoft 365) silently dropped mail that looked automated,
    // so: plain + HTML versions, simple HTML (no images or links), no code in the subject.
    await transporter.sendMail({
        from: EMAIL_FROM,
        replyTo: EMAIL_FROM,
        to,
        subject: "Verify your MCCab account",
        text: verificationText(code, expiresInMinutes),
        html: verificationHtml(code, expiresInMinutes),
    });
}

function verificationText(code: string, expiresInMinutes: number): string {
    return [
        "Hi,",
        "",
        "Thanks for signing up for MCCab, the student ride-share app.",
        "Enter this code in the app to verify your email:",
        "",
        `    ${code}`,
        "",
        `The code expires in ${expiresInMinutes} minutes.`,
        "If you didn't create a MCCab account, you can ignore this email.",
    ].join("\n");
}

function verificationHtml(code: string, expiresInMinutes: number): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your MCCab account</title>
  </head>
  <body style="margin:0;padding:24px;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e6ea;border-radius:8px;padding:28px;">
      <p style="margin:0 0 16px;font-size:16px;">Hi,</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
        Thanks for signing up for MCCab, the student ride-share app.
        Enter this code in the app to verify your email:
      </p>
      <p style="margin:0 0 16px;font-size:28px;font-weight:600;letter-spacing:6px;text-align:center;">${code}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#52606d;">The code expires in ${expiresInMinutes} minutes.</p>
      <p style="margin:0;font-size:14px;color:#52606d;">If you didn't create a MCCab account, you can ignore this email.</p>
    </div>
  </body>
</html>`;
}
