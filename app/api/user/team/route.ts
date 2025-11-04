import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/team
 * Returns the user's team information including profession
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            profession: true,
            type: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      team: user.team
    });
  } catch (error) {
    console.error('Error fetching user team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team information' },
      { status: 500 }
    );
  }
}
