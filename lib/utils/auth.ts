import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { team: true }
  });

  // Additional validation: ensure session email matches database user
  if (user && session.user.email !== user.email) {
    console.error(`Session validation failed - user mismatch. Session: ${session.user.email}, DB: ${user.email}`);
    throw new Error("Session validation failed - user mismatch");
  }

  return user;
}

export async function getCurrentTeamId() {
  const user = await getCurrentUser();
  return user?.teamId || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user || !user.teamId) {
    throw new Error("Unauthorized");
  }

  return { user, teamId: user.teamId };
}