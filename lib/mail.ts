import { Resend } from "resend";

// Default to Resend's shared testing sender so emails work before a custom
// domain is verified. Set RESEND_FROM to something like
// "noreply@genggeng.pro" once your domain is verified in Resend.
const FROM =
  process.env.RESEND_FROM || "genggeng.pro <onboarding@resend.dev>";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping password reset email.");
    return;
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your genggeng.pro password",
    text: `Someone asked to reset the password for your genggeng.pro account. Open this link to choose a new password (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #6699cc;">
        <div style="background: #2c4d80; color: #fff; padding: 10px 14px; font-size: 18px; font-weight: bold;">
          genggeng<span style="color: #ffde00;">.pro</span> — Password Reset
        </div>
        <div style="padding: 14px; font-size: 13px; color: #333;">
          <p>Someone asked to reset the password for your genggeng.pro account.</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; background: #2c4d80; color: #fff; text-decoration: none; padding: 8px 14px; font-weight: bold;">
              Reset your password
            </a>
          </p>
          <p>Or copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #003399;">${resetUrl}</a>
          </p>
          <p style="color: #666;">This link is valid for 1 hour. If you didn't request a reset, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
  if (error) throw error;
}
