CREATE TABLE "Cv" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3) NOT NULL,
  "birthPlace" TEXT,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "facebook" TEXT,
  "province" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "fivondronana" TEXT NOT NULL,
  "extraPersonal" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "extraContact" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cv_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CvBranch" (
  "id" TEXT NOT NULL,
  "cvId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "group" TEXT NOT NULL,
  "project" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "CvBranch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CvActivity" (
  "id" TEXT NOT NULL,
  "cvId" TEXT NOT NULL,
  "name" TEXT,
  "responsibility" TEXT,
  "description" TEXT,
  "date" TIMESTAMP(3),
  CONSTRAINT "CvActivity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Cv_userId_key" ON "Cv"("userId");
CREATE INDEX "CvBranch_cvId_idx" ON "CvBranch"("cvId");
CREATE INDEX "CvActivity_cvId_idx" ON "CvActivity"("cvId");
ALTER TABLE "Cv" ADD CONSTRAINT "Cv_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CvBranch" ADD CONSTRAINT "CvBranch_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CvActivity" ADD CONSTRAINT "CvActivity_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "Cv"("id") ON DELETE CASCADE ON UPDATE CASCADE;
