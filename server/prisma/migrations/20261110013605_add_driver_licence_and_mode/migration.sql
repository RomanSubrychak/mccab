-- Students can be riders, drivers, or both, and a RIDER_DRIVER switches
-- between riding and driving. Drivers add their licence and insurance.

-- New role for students who only drive.
ALTER TYPE "RideRole" ADD VALUE 'DRIVER' BEFORE 'RIDER_DRIVER';

-- What a RIDER_DRIVER is doing right now.
CREATE TYPE "RideMode" AS ENUM ('RIDING', 'DRIVING');
ALTER TABLE "User" ADD COLUMN "activeMode" "RideMode" NOT NULL DEFAULT 'RIDING';

-- Driver's licence and insurance. Only the last 4 characters of each number are stored.
ALTER TABLE "User"
  ADD COLUMN "licenceState" TEXT,
  ADD COLUMN "licenceLast4" TEXT,
  ADD COLUMN "licenceExpiresOn" DATE,
  ADD COLUMN "insuranceProvider" TEXT,
  ADD COLUMN "insurancePolicyLast4" TEXT,
  ADD COLUMN "insuranceExpiresOn" DATE;
