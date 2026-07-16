import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (
    !session.user.registrationCompleted &&
    session.user.id !== "demo-owner"
  ) {
    redirect("/registrieren");
  }
  return session.user;
}

export async function requireRole(required: Role) {
  const user = await requireUser();
  if (!hasMinimumRole(user.role, required)) redirect("/dashboard");
  return user;
}

export async function ensureDbUser() {
  const sessionUser = await requireUser();
  return prisma.user.upsert({
    where: { id: sessionUser.id },
    update: {
      name: sessionUser.name || "DRP Mitglied",
      email: sessionUser.email,
      avatar: sessionUser.image,
    },
    create: {
      id: sessionUser.id,
      name: sessionUser.name || "DRP Mitglied",
      email: sessionUser.email,
      avatar: sessionUser.image,
      role: sessionUser.role,
      registrationCompleted:
        sessionUser.registrationCompleted || sessionUser.id === "demo-owner",
    },
  });
}
