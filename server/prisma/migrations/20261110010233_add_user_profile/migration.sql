-- CreateEnum
CREATE TYPE "RideRole" AS ENUM ('RIDER', 'DRIVER', 'BOTH');

-- CreateEnum
CREATE TYPE "Campus" AS ENUM ('CHICAGO_MAIN', 'CHICAGO_DOWNTOWN', 'NAPERVILLE', 'EVERGREEN_PARK');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "ChatPreference" AS ENUM ('QUIET', 'SOME', 'CHATTY');

-- CreateEnum
CREATE TYPE "PhoneVisibility" AS ENUM ('CONFIRMED_RIDES', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "arriveBy" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "campus" "Campus",
ADD COLUMN     "chatPreference" "ChatPreference" NOT NULL DEFAULT 'SOME',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "homeArea" TEXT,
ADD COLUMN     "leaveAt" TEXT,
ADD COLUMN     "major" TEXT,
ADD COLUMN     "musicOk" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNews" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyRideUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVisibility" "PhoneVisibility" NOT NULL DEFAULT 'CONFIRMED_RIDES',
ADD COLUMN     "pricePerSeatCents" INTEGER,
ADD COLUMN     "rideDays" "Weekday"[],
ADD COLUMN     "rideRole" "RideRole" NOT NULL DEFAULT 'RIDER',
ADD COLUMN     "smokingOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_userId_key" ON "Vehicle"("userId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
