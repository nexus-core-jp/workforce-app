import { z } from "zod";

/**
 * Shared password validation schema.
 * Requires: 8+ characters, at least 1 uppercase, 1 lowercase, 1 digit.
 */
export const passwordSchema = z
  .string()
  .min(8, "パスワードは8文字以上必要です")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "大文字・小文字・数字をそれぞれ1文字以上含めてください",
  );
