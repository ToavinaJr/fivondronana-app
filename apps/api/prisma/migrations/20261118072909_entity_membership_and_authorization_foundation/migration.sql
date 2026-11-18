-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATOR', 'RESPONSIBLE', 'ENTITY_MANAGER', 'GENERAL_MANAGER');

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "OfficialResponsibility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficialResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserResponsibility" (
    "userId" TEXT NOT NULL,
    "responsibilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserResponsibility_pkey" PRIMARY KEY ("userId","responsibilityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entity_name_key" ON "Entity"("name");

-- CreateIndex
CREATE INDEX "Group_entityId_isActive_idx" ON "Group"("entityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Group_id_entityId_key" ON "Group"("id", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_entityId_name_key" ON "Group"("entityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EntityMembership_userId_key" ON "EntityMembership"("userId");

-- CreateIndex
CREATE INDEX "EntityMembership_entityId_idx" ON "EntityMembership"("entityId");

-- CreateIndex
CREATE INDEX "EntityMembership_groupId_idx" ON "EntityMembership"("groupId");

-- CreateIndex
CREATE INDEX "UserRole_role_userId_idx" ON "UserRole"("role", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialResponsibility_name_key" ON "OfficialResponsibility"("name");

-- CreateIndex
CREATE INDEX "UserResponsibility_responsibilityId_idx" ON "UserResponsibility"("responsibilityId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityMembership" ADD CONSTRAINT "EntityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityMembership" ADD CONSTRAINT "EntityMembership_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityMembership" ADD CONSTRAINT "EntityMembership_groupId_entityId_fkey" FOREIGN KEY ("groupId", "entityId") REFERENCES "Group"("id", "entityId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserResponsibility" ADD CONSTRAINT "UserResponsibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserResponsibility" ADD CONSTRAINT "UserResponsibility_responsibilityId_fkey" FOREIGN KEY ("responsibilityId") REFERENCES "OfficialResponsibility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
