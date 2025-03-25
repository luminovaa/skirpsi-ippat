import axios from "axios";

const service = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    timeout: 5000,
});

export default service;