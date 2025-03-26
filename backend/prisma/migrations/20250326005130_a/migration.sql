/*
  Warnings:

  - You are about to drop the `sensordata` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `sensordata`;

-- CreateTable
CREATE TABLE `pzem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voltage` DOUBLE NOT NULL,
    `current` DOUBLE NOT NULL,
    `power` DOUBLE NOT NULL,
    `pf` DOUBLE NOT NULL,
    `energy` DOUBLE NOT NULL,
    `va` DOUBLE NOT NULL,
    `var` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suhu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `temperature` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
