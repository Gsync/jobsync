-- CreateTable
CREATE TABLE "LinkedInSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkedInSearch_userId_idx" ON "LinkedInSearch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInSearch_userId_url_key" ON "LinkedInSearch"("userId", "url");

-- AddForeignKey
ALTER TABLE "LinkedInSearch" ADD CONSTRAINT "LinkedInSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
