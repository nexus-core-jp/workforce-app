import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    tenantId: string;
    role: string;
    departmentId: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      tenantId: string;
      role: string;
      departmentId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string;
    role: string;
    departmentId: string | null;
  }
}
