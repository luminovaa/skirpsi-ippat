import mqtt from "mqtt/*";

const MQTT_TOPIC_1 =  process.env.MQTT_TOPIC_1;
const MQTT_TOPIC_2 =  process.env.MQTT_TOPIC_2;

function createMqttClient() {
    return mqtt.connect({
        host: process.env.MQTT_HOST,
        port: parseInt(process.env.MQTT_PORT!),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD
      });
}

export { MQTT_TOPIC_1, MQTT_TOPIC_2, createMqttClient };