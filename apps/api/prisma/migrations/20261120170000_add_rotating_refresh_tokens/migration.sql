ALTER TABLE "AuthSession"
ADD COLUMN "refreshTokenHash" TEXT;

CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key"
ON "AuthSession"("refreshTokenHash");
