const { STATUS_DATA } = require("../src/lib/seedData");

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedUser() {
  try {
    const password = await bcrypt.hash("password123", 10);

    const user1 = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        email: "admin@example.com",
        name: "Admin",
        password,
      },
    });

    console.log("Seeded user: ", { user1 });
  } catch (error) {
    console.error("Error seeding user: ", error);
    throw error;
  }
}

async function seedStatus() {
  try {
    const statuses = STATUS_DATA;
    for (const status of statuses) {
      // Check if the status already exists
      const existingStatus = await prisma.jobStatus.findUnique({
        where: {
          statusName: status.statusName,
        },
      });

      // If the status does not exist, create it
      if (!existingStatus) {
        await prisma.jobStatus.create({
          data: status,
        });
      }
    }
    console.log("Seeded statuses");
  } catch (error) {
    console.error("Error seeding status: ", error);
    throw error;
  }
}

async function main() {
  await seedUser();
  await seedStatus();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
