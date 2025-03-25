-- CreateTable
CREATE TABLE `SensorData` (
    `dataId` INTEGER NOT NULL AUTO_INCREMENT,
    `temperature` DOUBLE NOT NULL,
    `voltage` DOUBLE NOT NULL,
    `current` DOUBLE NOT NULL,
    `power` DOUBLE NOT NULL,
    `frequency` DOUBLE NOT NULL,
    `pf` DOUBLE NOT NULL,
    `energy` DOUBLE NOT NULL,
    `va` DOUBLE NOT NULL,
    `var` DOUBLE NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`dataId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
