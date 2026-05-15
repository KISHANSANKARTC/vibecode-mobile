import { Hono } from "hono";
import { sendOTPEmail } from "../lib/email";

interface SendOTPRequest {
  email: string;
  name: string;
  event: 'new_user' | 'update_password';
}

interface VerifyOTPRequest {
  email: string;
  otp: string;
  event: 'new_user' | 'update_password';
}

// In-memory OTP storage (in production, use Redis or database)
interface StoredOTP {
  otpHash: string; // In production, hash the OTP
  createdAt: number;
  attempts: number;
  verified: boolean;
  email: string;
}

const otpStorage = new Map<string, StoredOTP>();
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const ATTEMPT_RESET_MINUTES = 5;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp: string): string {
  // Simple hash for demo - in production use bcrypt or similar
  return Buffer.from(otp).toString('base64');
}

function verifyOTPHash(otp: string, hash: string): boolean {
  return hashOTP(otp) === hash;
}

export const authRouter = new Hono();

// Send OTP to email
authRouter.post("/send-otp", async (c) => {
  try {
    const { email, name, event } = await c.req.json<SendOTPRequest>();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return c.json(
        { error: { message: "Valid email is required", code: "INVALID_EMAIL" } },
        400
      );
    }

    if (!name || typeof name !== "string") {
      return c.json(
        { error: { message: "Name is required", code: "INVALID_INPUT" } },
        400
      );
    }

    if (!["new_user", "update_password"].includes(event)) {
      return c.json(
        { error: { message: "Invalid event type", code: "INVALID_EVENT" } },
        400
      );
    }

    // Check if there's an existing OTP request for this email
    const existingKey = Array.from(otpStorage.keys()).find(
      (key) => key.startsWith(`otp_${email}_`)
    );

    if (existingKey) {
      const stored = otpStorage.get(existingKey)!;
      const now = Date.now();
      const minutesPassed = (now - stored.createdAt) / (1000 * 60);

      // Reset attempts if enough time has passed
      if (minutesPassed >= ATTEMPT_RESET_MINUTES) {
        stored.attempts = 0;
      }

      // Rate limit: max 5 attempts per 5 minutes
      if (stored.attempts >= MAX_ATTEMPTS) {
        return c.json(
          {
            error: {
              message: "Too many OTP requests. Please try again in 5 minutes.",
              code: "RATE_LIMIT",
            },
          },
          429
        );
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const storageKey = `otp_${email}_${Date.now()}`;

    // Send OTP email via Supabase Edge Function first
    try {
      await sendOTPEmail(email, otp, name, event);
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      return c.json(
        {
          error: {
            message: "Failed to send OTP email. Please try again.",
            code: "EMAIL_SEND_FAILED",
          },
        },
        500
      );
    }

    // Store OTP hash only after successful send
    otpStorage.set(storageKey, {
      otpHash,
      createdAt: Date.now(),
      attempts: 0,
      verified: false,
      email,
    });

    return c.json({
      data: {
        message: `OTP sent to ${email}`,
        email,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      },
    });
  } catch (error) {
    console.error("Error in send-otp:", error);
    return c.json(
      {
        error: {
          message: "Failed to send OTP",
          code: "INTERNAL_ERROR",
        },
      },
      500
    );
  }
});

// Verify OTP code
authRouter.post("/verify-otp", async (c) => {
  try {
    const { email, otp, event } =
      await c.req.json<VerifyOTPRequest>();

    if (!email || !otp || !event) {
      return c.json(
        {
          error: {
            message: "Email, OTP code, and event are required",
            code: "INVALID_INPUT",
          },
        },
        400
      );
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return c.json(
        {
          error: {
            message: "OTP must be a 6-digit code",
            code: "INVALID_OTP_FORMAT",
          },
        },
        400
      );
    }

    // Find OTP for this email
    const storageKey = Array.from(otpStorage.keys()).find(
      (key) => key.startsWith(`otp_${email}_`)
    );

    if (!storageKey) {
      return c.json(
        {
          error: {
            message: "No OTP request found for this email",
            code: "NO_OTP_REQUEST",
          },
        },
        400
      );
    }

    const stored = otpStorage.get(storageKey)!;

    // Check if OTP has expired
    const now = Date.now();
    const minutesPassed = (now - stored.createdAt) / (1000 * 60);

    if (minutesPassed > OTP_EXPIRY_MINUTES) {
      otpStorage.delete(storageKey);
      return c.json(
        {
          error: {
            message: "OTP has expired. Please request a new one.",
            code: "OTP_EXPIRED",
          },
        },
        400
      );
    }

    // Verify OTP
    if (!verifyOTPHash(otp, stored.otpHash)) {
      stored.attempts += 1;

      if (stored.attempts >= MAX_ATTEMPTS) {
        otpStorage.delete(storageKey);
        return c.json(
          {
            error: {
              message: "Too many failed attempts. Please request a new OTP.",
              code: "MAX_ATTEMPTS_EXCEEDED",
            },
          },
          400
        );
      }

      return c.json(
        {
          error: {
            message: `Invalid OTP code. ${MAX_ATTEMPTS - stored.attempts} attempts remaining.`,
            code: "INVALID_OTP",
          },
        },
        400
      );
    }

    // Mark as verified
    stored.verified = true;

    // Generate verification token (valid for 15 minutes)
    const verificationToken = `verified_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    otpStorage.set(`token_${verificationToken}`, {
      otpHash: verificationToken,
      createdAt: Date.now(),
      attempts: 0,
      verified: true,
      email,
    });

    return c.json({
      data: {
        verified: true,
        verificationToken,
        email,
        message: "OTP verified successfully",
      },
    });
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return c.json(
      {
        error: {
          message: "Failed to verify OTP",
          code: "INTERNAL_ERROR",
        },
      },
      500
    );
  }
});

// Validate verification token (internal use)
authRouter.post("/validate-token", async (c) => {
  try {
    const { verificationToken } = await c.req.json<{
      verificationToken: string;
    }>();

    if (!verificationToken) {
      return c.json(
        {
          error: {
            message: "Verification token is required",
            code: "INVALID_INPUT",
          },
        },
        400
      );
    }

    const tokenKey = `token_${verificationToken}`;
    const stored = otpStorage.get(tokenKey);

    if (!stored || !stored.verified) {
      return c.json(
        {
          error: {
            message: "Invalid or expired verification token",
            code: "INVALID_TOKEN",
          },
        },
        400
      );
    }

    // Check if token has expired (15 minutes)
    const now = Date.now();
    const minutesPassed = (now - stored.createdAt) / (1000 * 60);

    if (minutesPassed > 15) {
      otpStorage.delete(tokenKey);
      return c.json(
        {
          error: {
            message: "Verification token has expired",
            code: "TOKEN_EXPIRED",
          },
        },
        400
      );
    }

    return c.json({
      data: {
        valid: true,
        email: stored.email,
        message: "Token is valid",
      },
    });
  } catch (error) {
    console.error("Error in validate-token:", error);
    return c.json(
      {
        error: {
          message: "Failed to validate token",
          code: "INTERNAL_ERROR",
        },
      },
      500
    );
  }
});

// Cleanup expired OTPs (run periodically)
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  otpStorage.forEach((value, key) => {
    const minutesPassed = (now - value.createdAt) / (1000 * 60);

    // Delete if expired (OTPs after 10 min, tokens after 15 min)
    if (key.startsWith("token_")) {
      if (minutesPassed > 15) {
        keysToDelete.push(key);
      }
    } else {
      if (minutesPassed > OTP_EXPIRY_MINUTES) {
        keysToDelete.push(key);
      }
    }
  });

  keysToDelete.forEach((key) => otpStorage.delete(key));
}, 60000); // Run every minute
