CREATE TABLE "AccountInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "activatedAt" TIMESTAMP(3);
UPDATE "User" SET "activatedAt" = "createdAt" WHERE "isActive" = TRUE AND "activatedAt" IS NULL;

CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "subjectUserId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountInvitation_tokenHash_key" ON "AccountInvitation"("tokenHash");
CREATE INDEX "AccountInvitation_userId_consumedAt_expiresAt_idx" ON "AccountInvitation"("userId", "consumedAt", "expiresAt");
CREATE INDEX "AdminAuditEvent_actorUserId_createdAt_idx" ON "AdminAuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AdminAuditEvent_subjectUserId_createdAt_idx" ON "AdminAuditEvent"("subjectUserId", "createdAt");

ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_subjectUserId_fkey"
    FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OfficialResponsibility" ("id", "name", "isActive", "createdAt")
VALUES
    ('official-responsibility-haim-panahy', 'Haim-panahy', TRUE, CURRENT_TIMESTAMP),
    ('official-responsibility-fampitaovana', 'Fampitaovana', TRUE, CURRENT_TIMESTAMP),
    ('official-responsibility-mpitantsoratra', 'Mpitantsoratra', TRUE, CURRENT_TIMESTAMP),
    ('official-responsibility-mpitahiry-vola', 'Mpitahiry vola', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
