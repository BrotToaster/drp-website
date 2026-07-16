import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      registrationCompleted: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    registrationCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    registrationCompleted?: boolean;
  }
}