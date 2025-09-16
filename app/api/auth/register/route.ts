import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validatedData = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create a transaction to create both team and user
    const result = await prisma.$transaction(async (tx) => {
      // Create a team for the new user
      const team = await tx.team.create({
        data: {
          name: `${validatedData.name || validatedData.email.split('@')[0]}'s Team`
        }
      });

      // Create the user and assign to the team
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          teamId: team.id
        },
        select: {
          id: true,
          email: true,
          name: true,
          teamId: true
        }
      });

      return { user, team };
    });

    const { user } = result;

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}