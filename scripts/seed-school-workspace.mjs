#!/usr/bin/env node
/**
 * Seed the SCHOOL workspace + PI directory for Samuel's 8 live PhD targets.
 * Idempotent (skips existing workspace / contacts by name).
 *
 * Usage:
 *   DATABASE_URL="file:./dev.db" node scripts/seed-school-workspace.mjs --email=you@example.com
 *
 * Details (deadlines, paper angles) live in D:/my apps/reclip/{CAS-cold-emails,other-cold-emails}.
 */

import { PrismaClient } from "@prisma/client";

const TARGETS = [
  { name: "Prof. Sarthak Misra", org: "University of Twente", deadline: "2026-10-01", angle: "surgical micro-robotics" },
  { name: "Prof. Dong", org: "Vanderbilt University", deadline: "2026-10-15", angle: "surgical / magnetic robots" },
  { name: "Prof. Emmanuel Vander Poorten", org: "KU Leuven", deadline: "2026-10-30", angle: "robot-assisted catheterization (RAS group head)" },
  { name: "Prof. Hao Su", org: "New York University", deadline: "2026-12-01", angle: "surgical robotics + wearable robotics" },
  { name: "Prof. Stefanie Speidel", org: "TU Dresden / NCT", deadline: "rolling", angle: "computer-assisted surgery, shared autonomy" },
  { name: "Dr. Jake George", org: "University of Utah", deadline: "before 2027-01-01", angle: "neurorobotics / neural interfaces" },
  { name: "Dr. Shepherd", org: "Northeastern University", deadline: "any time", angle: "wearable robotics" },
];

const STAGES = ["Researching", "Outreach sent", "Applied", "Interview", "Offer", "Rejected / Withdrawn"];

const email = (process.argv.find((a) => a.startsWith("--email=")) ?? "").slice("--email=".length);
if (!email) {
  console.error("usage: node scripts/seed-school-workspace.mjs --email=you@example.com");
  process.exit(2);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`no user with email ${email}`);

  let ws = await prisma.workspace.findFirst({ where: { userId: user.id, type: "SCHOOL" } });
  if (!ws) {
    ws = await prisma.workspace.create({
      data: {
        userId: user.id,
        name: "School",
        type: "SCHOOL",
        stages: { create: STAGES.map((name, i) => ({ name, order: i + 1, isTerminal: name.startsWith("Rejected") })) },
      },
    });
    console.log(`created SCHOOL workspace + ${STAGES.length} stages`);
  } else {
    console.log("SCHOOL workspace already exists — skipping");
  }

  for (const t of TARGETS) {
    const exists = await prisma.contact.findFirst({ where: { createdBy: user.id, name: t.name } });
    if (exists) {
      console.log(`contact exists: ${t.name} — skipping`);
      continue;
    }
    await prisma.contact.create({
      data: {
        createdBy: user.id,
        name: t.name,
        title: "Professor / PI",
        relationship: "PhD supervisor prospect",
        notes: `${t.org} — ${t.angle}. Deadline: ${t.deadline}. See cold-email drafts in CAS-cold-emails / other-cold-emails.`,
      },
    });
    console.log(`created contact: ${t.name}`);
  }
} finally {
  await prisma.$disconnect();
}
