import { describe, it, expect } from "vitest";
import { toSessionUser } from "@/lib/session";

describe("toSessionUser", () => {
  it("extracts valid session user", () => {
    const raw = {
      id: "user1",
      email: "test@example.com",
      name: "Test User",
      tenantId: "tenant1",
      role: "ADMIN",
      departmentId: "dept1",
    };
    const result = toSessionUser(raw);
    expect(result).toEqual({
      id: "user1",
      email: "test@example.com",
      name: "Test User",
      tenantId: "tenant1",
      role: "ADMIN",
      departmentId: "dept1",
    });
  });

  it("uses sub as id fallback", () => {
    const raw = {
      sub: "user1",
      email: "test@example.com",
      tenantId: "tenant1",
      role: "EMPLOYEE",
    };
    const result = toSessionUser(raw);
    expect(result?.id).toBe("user1");
  });

  it("returns null when id/sub is missing", () => {
    const raw = {
      email: "test@example.com",
      tenantId: "tenant1",
      role: "EMPLOYEE",
    };
    const result = toSessionUser(raw);
    expect(result).toBeNull();
  });

  it("returns null when tenantId is missing", () => {
    const raw = {
      id: "user1",
      email: "test@example.com",
      role: "EMPLOYEE",
    };
    const result = toSessionUser(raw);
    expect(result).toBeNull();
  });

  it("returns null when role is missing", () => {
    const raw = {
      id: "user1",
      email: "test@example.com",
      tenantId: "tenant1",
    };
    const result = toSessionUser(raw);
    expect(result).toBeNull();
  });

  it("returns null when email is missing", () => {
    const raw = {
      id: "user1",
      tenantId: "tenant1",
      role: "EMPLOYEE",
    };
    const result = toSessionUser(raw);
    expect(result).toBeNull();
  });

  it("handles null name gracefully", () => {
    const raw = {
      id: "user1",
      email: "test@example.com",
      name: null,
      tenantId: "tenant1",
      role: "ADMIN",
    };
    const result = toSessionUser(raw);
    expect(result?.name).toBeNull();
  });

  it("handles missing departmentId gracefully", () => {
    const raw = {
      id: "user1",
      email: "test@example.com",
      tenantId: "tenant1",
      role: "EMPLOYEE",
    };
    const result = toSessionUser(raw);
    expect(result?.departmentId).toBeNull();
  });
});
