import "server-only";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  if (!name) {
    return NextResponse.json(
      { message: "Company name is required" },
      { status: 400 }
    );
  }

  try {
    // Upsert the name (create if it does not exist, update if it exists)
    const upsertedName = await prisma.company.upsert({
      where: { name },
      update: { name },
      create: { name },
    });

    return NextResponse.json(upsertedName, { status: 201 });
  } catch (error) {
    console.error("Error upserting name:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
