import { env } from "../env";

/**
 * Send OTP email
 * Uses Resend if API key is available, otherwise logs for development
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  name: string,
  event: "new_user" | "update_password"
): Promise<void> {
  const subject = event === "new_user" ? "Verify Your Email" : "Reset Your Password";
  const greeting = event === "new_user" ? "Welcome to Engage!" : "Password Reset Request";
  const description =
    event === "new_user"
      ? "Use this code to verify your email and create your account."
      : "Use this code to reset your password.";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 20px;
            text-align: center;
          }
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0 0 16px 0;
          }
          .description {
            font-size: 16px;
            color: #666666;
            line-height: 1.6;
            margin: 0 0 32px 0;
          }
          .otp-box {
            background-color: #f8f8f8;
            border: 2px solid #667eea;
            border-radius: 8px;
            padding: 24px;
            margin: 32px 0;
          }
          .otp-label {
            font-size: 12px;
            color: #999999;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 12px 0;
          }
          .otp-code {
            font-size: 48px;
            font-weight: 700;
            color: #667eea;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 0;
            word-break: break-all;
          }
          .expiry {
            font-size: 14px;
            color: #999999;
            margin-top: 24px;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #999999;
          }
          .security-note {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px 16px;
            margin: 24px 0;
            border-radius: 4px;
            font-size: 14px;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Engage</h1>
          </div>
          <div class="content">
            <h2 class="greeting">${greeting}</h2>
            <p class="description">${description}</p>

            <div class="otp-box">
              <div class="otp-label">Your verification code</div>
              <p class="otp-code">${otp}</p>
            </div>

            <div class="security-note">
              Do not share this code with anyone. We will never ask you for this code via email or phone.
            </div>

            <p class="expiry">This code expires in 10 minutes</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Engage. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // If Resend API key is available, use it
    if (env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(env.RESEND_API_KEY);

      const response = await resend.emails.send({
        from: "noreply@engage.app",
        to: email,
        subject,
        html: htmlContent,
      });

      if (response.error) {
        throw new Error(`Resend error: ${response.error.message}`);
      }

      console.log(`[OTP Email Sent] To: ${email}, Event: ${event}, Message ID: ${response.data?.id}`);
    } else {
      // Development mode: log OTP to console
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[OTP_DEV_MODE] Email would be sent to: ${email}`);
      console.log(`[OTP_DEV_MODE] Subject: ${subject}`);
      console.log(`[OTP_DEV_MODE] OTP Code: ${otp}`);
      console.log(`[OTP_DEV_MODE] Name: ${name}`);
      console.log(`${'='.repeat(60)}\n`);
    }
  } catch (error) {
    console.error(
      `[OTP Email Error] Failed to send OTP email to ${email}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

