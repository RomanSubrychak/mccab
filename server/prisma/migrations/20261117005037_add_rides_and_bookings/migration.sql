-- CreateEnum
CREATE TYPE "RideDirection" AS ENUM ('TO_CAMPUS', 'FROM_CAMPUS');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('OPEN', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Ride" (
    "id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "campus" "Campus" NOT NULL,
    "direction" "RideDirection" NOT NULL,
    "departAt" TIMESTAMP(3) NOT NULL,
    "seatsOffered" INTEGER NOT NULL,
    "pricePerSeatCents" INTEGER NOT NULL,
    "startArea" TEXT NOT NULL,
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLng" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "status" "RideStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "rideId" INTEGER NOT NULL,
    "riderId" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ride_campus_departAt_idx" ON "Ride"("campus", "departAt");

-- CreateIndex
CREATE INDEX "Ride_driverId_idx" ON "Ride"("driverId");

-- CreateIndex
CREATE INDEX "Booking_riderId_idx" ON "Booking"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_rideId_riderId_key" ON "Booking"("rideId", "riderId");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

