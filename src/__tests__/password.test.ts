import { describe, it, expect } from "vitest";
import { passwordSchema } from "@/lib/password";

describe("passwordSchema", () => {
  it("accepts valid password with uppercase, lowercase, digit", () => {
    const result = passwordSchema.safeParse("Password1");
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = passwordSchema.safeParse("Pass1");
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = passwordSchema.safeParse("password1");
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    const result = passwordSchema.safeParse("PASSWORD1");
    expect(result.success).toBe(false);
  });

  it("rejects password without digit", () => {
    const result = passwordSchema.safeParse("PasswordOnly");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = passwordSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("accepts complex password", () => {
    const result = passwordSchema.safeParse("C0mpl3x!Pass#word");
    expect(result.success).toBe(true);
  });

  it("accepts exactly 8 characters", () => {
    const result = passwordSchema.safeParse("Abcdefg1");
    expect(result.success).toBe(true);
  });
});
