import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { team: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profileData = await request.json();

    // Update team with profile information
    await prisma.team.update({
      where: { id: user.teamId },
      data: {
        type: profileData.type,
        companyName: profileData.companyName || null,
        companyActivity: profileData.companyActivity || null,
        employeeCount: profileData.employeeCount || null,
        revenueTier: profileData.revenueTier || null,
        profession: profileData.profession || null,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}