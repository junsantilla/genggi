import { Resend } from "resend";

// Default to Resend's shared testing sender so emails work before a custom
// domain is verified. Set RESEND_FROM to something like
// "noreply@genggi.com" once your domain is verified in Resend.
const FROM = process.env.RESEND_FROM || "genggi.com <onboarding@resend.dev>";

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn("RESEND_API_KEY is not set; skipping email.");
        return null;
    }
    return new Resend(apiKey);
}

export async function sendVerificationEmail(
    to: string,
    verifyUrl: string,
): Promise<void> {
    const resend = getResend();
    if (!resend) return;
    const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject: "Verify your genggi.com email",
        text: `Welcome to genggi.com! Please confirm your email by opening this link (valid for 24 hours):\n\n${verifyUrl}\n\nIf you didn't create an account, you can safely ignore this email.`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #6699cc;">
        <div style="background: #2c4d80; color: #fff; padding: 10px 14px; font-size: 18px; font-weight: bold;">
          genggi.com — Confirm Your Email
        </div>
        <div style="padding: 14px; font-size: 13px; color: #333;">
          <p>Thanks for joining genggi.com! Please confirm your email address to activate your account.</p>
          <p>
            <a href="${verifyUrl}" style="display: inline-block; background: #2c4d80; color: #fff; text-decoration: none; padding: 8px 14px; font-weight: bold;">
              Verify my email
            </a>
          </p>
          <p>Or copy and paste this link into your browser:<br/>
            <a href="${verifyUrl}" style="color: #003399;">${verifyUrl}</a>
          </p>
          <p style="color: #666;">This link is valid for 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </div>
    `,
    });
    if (error) throw error;
}

export async function sendPasswordResetEmail(
    to: string,
    resetUrl: string,
): Promise<void> {
    const resend = getResend();
    if (!resend) return;
    const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject: "Reset your genggi.com password",
        text: `Someone asked to reset the password for your genggi.com account. Open this link to choose a new password (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #6699cc;">
        <div style="background: #2c4d80; color: #fff; padding: 10px 14px; font-size: 18px; font-weight: bold;">
          genggi.com — Password Reset
        </div>
        <div style="padding: 14px; font-size: 13px; color: #333;">
          <p>Someone asked to reset the password for your genggi.com account.</p>
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
