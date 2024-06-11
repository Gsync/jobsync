// createCompany SERVER ACTION in job.actions.ts has replaced the need of following route handler
// NOTE: code is kept here for an example use case
// ============================================
// import "server-only";
// import prisma from "@/lib/db";
// import { NextResponse } from "next/server";
// import { auth } from "@/auth";

// export const POST = async (req: any) => {
//   const session = await auth();
//   console.log("SESSION: ", session);
//   const userId = session?.accessToken.sub;
//   /* SESSION:  {
//     user: { name: 'Admin', email: 'admin@example.com' },
//     expires: '2024-07-04T06:16:33.616Z',
//     accessToken: {
//       name: 'Admin',
//       email: 'admin@example.com',
//       sub: '24c84c85-b6a9-40ea-bccb-1b883bcc64cd',
//       iat: 1717481780,
//       exp: 1720073780,
//       jti: '4b5bbd8a-aa0e-4552-b19c-82e2c2dbf130'
//     }
//   } */
//   if (!session || !session.user) {
//     return new NextResponse(JSON.stringify({ message: "Not Authenticated" }), {
//       status: 401,
//     });
//   }

//   const { label, value } = await req.json();
//   if (!value) {
//     return NextResponse.json(
//       { message: "Company name is required" },
//       { status: 400 }
//     );
//   }

//   try {
//     // Upsert the name (create if it does not exist, update if it exists)
//     const upsertedName = await prisma.company.upsert({
//       where: { value },
//       update: { label },
//       create: { label, value, createdBy: userId },
//     });

//     return NextResponse.json(upsertedName, { status: 201 });
//   } catch (error) {
//     console.error("Error upserting name:", error);
//     return NextResponse.json(
//       { message: "Internal server error" },
//       { status: 500 }
//     );
//   }
// };
