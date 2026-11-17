import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Unset during `next build`; a malformed URL is rejected at boot by wait-for-db
const schemaFromUrl = (url: string | undefined) => {
  if (!url || !URL.canParse(url)) return undefined;
  return new URL(url).searchParams.get("schema") ?? undefined;
};

export function createPrismaClient(url: string | undefined): PrismaClient {
  const schema = schemaFromUrl(url);
  // Prisma 6's timeouts: pg would otherwise wait forever and idle out at 10 s
  const adapter = new PrismaPg(
    { connectionString: url, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 300_000 },
    schema ? { schema } : undefined,
  );
  return new PrismaClient({ adapter });
}

const prismaClientSingleton = () => {
  return createPrismaClient(process.env.DATABASE_URL);
  //   {
  //   log: ["query"],
  // }
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
