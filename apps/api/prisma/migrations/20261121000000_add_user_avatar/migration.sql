-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarKey_key" ON "User"("avatarKey");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarKey_fkey" FOREIGN KEY ("avatarKey") REFERENCES "FileObject"("storageKey") ON DELETE RESTRICT ON UPDATE CASCADE;
