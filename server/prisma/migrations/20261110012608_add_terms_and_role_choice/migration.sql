-- Students now accept the Terms and Conditions and then pick their role after
-- signing in, and both are saved on the server.

BEGIN;

-- The role starts empty until the student picks one. rideRole was only added in
-- the previous migration (same pull request), so nobody has chosen a role yet:
-- clear the default value everyone got.
ALTER TABLE "User" ALTER COLUMN "rideRole" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "rideRole" DROP NOT NULL;
UPDATE "User" SET "rideRole" = NULL;

-- Two roles instead of three: RIDER, or RIDER_DRIVER (rides and also drives).
CREATE TYPE "RideRole_new" AS ENUM ('RIDER', 'RIDER_DRIVER');
ALTER TABLE "User" ALTER COLUMN "rideRole" TYPE "RideRole_new" USING ("rideRole"::text::"RideRole_new");
ALTER TYPE "RideRole" RENAME TO "RideRole_old";
ALTER TYPE "RideRole_new" RENAME TO "RideRole";
DROP TYPE "RideRole_old";

-- When the student agreed to the terms. NULL means not yet.
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

COMMIT;
