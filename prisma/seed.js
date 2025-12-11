const { STATUS_DATA, JOB_SOURCES } = require("../src/lib/data/seedData");

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedUser() {
  try {
    const email = process.env.USER_EMAIL;
    if (!email || email.trim() === "") {
      console.warn(
        "\x1b[33m[WARNING] USER_EMAIL environment variable is blank or not set. Please set USER_EMAIL in your .env file. Seeding will continue, but user will not be created.\x1b[0m"
      );
      return;
    }
    const password = await bcrypt.hash(process.env.USER_PASSWORD, 10);
    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email,
          name: "Admin",
          password,
        },
      });
      console.log("Seeded new user: ", { email });
    } else {
      console.log("User already exists: ", { email });
    }
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
          value: status.value,
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

async function seedJobSouces() {
  try {
    const sources = JOB_SOURCES;
    for (const source of sources) {
      const { label, value } = source;
      await prisma.jobSource.upsert({
        where: {
          value,
        },
        update: { label, value },
        create: { label, value },
      });
    }
    console.log("Seeded job sources");
  } catch (error) {
    console.error("Error seeding job sources: ", error);
    throw error;
  }
}

async function main() {
  await seedUser();
  await seedStatus();
  await seedJobSouces();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
