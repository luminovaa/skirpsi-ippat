import { PrismaClient } from "@prisma/client";
import { createMqttClient, MQTT_TOPIC_1 } from "../config/mqtt";

interface PzemData {
    voltage: number;
    current: number;
    frequency: number;
    power: number;
    power_factor: number;
    energy: number;
    va: number;
    var: number;
}

class PzemMQTT {  
    private mqttClient: ReturnType<typeof createMqttClient>;
    private prisma: PrismaClient;

    constructor() {
        this.mqttClient = createMqttClient();
        this.prisma = new PrismaClient();
        this.setupMQTTListeners();
    }

    private setupMQTTListeners(): void {
        this.mqttClient.on("connect", () => {
            console.log("Terhubung ke broker MQTT");
            this.mqttClient.subscribe(MQTT_TOPIC_1!);
        });

        this.mqttClient.on("message", (topic: string, message: Buffer) => {
            this.handleMessage(topic, message);
        });
    }

    private handleMessage(topic: string, message: Buffer): void {
        if (topic === MQTT_TOPIC_1) {
            try {
                const data: PzemData = JSON.parse(message.toString());
                console.log("Data diterima:", data);

                this.saveToDatabase(data);
            } catch (error) {
                console.error("Error parsing MQTT message:", error);
            }
        }
    }

    private async saveToDatabase(data: PzemData): Promise<void> {
        try {
            const result = await this.prisma.pzem.create({
                data: {
                    voltage: data.voltage,
                    current: data.current,
                    frequency: data.frequency,
                    power: data.power,
                    power_factor: data.power_factor,
                    energy: data.energy,
                    va: data.va,
                    var: data.var
                }
            });
            
            console.log("Data berhasil disimpan ke database dengan ID:", result.id);
        } catch (error) {
            console.error("Gagal menyimpan data ke database:", error);
        }
    }
}

export default PzemMQTT;