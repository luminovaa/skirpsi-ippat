import  express from "express";
import { getAllSuhu, getAverageSuhuToday, getLatestSuhu } from "./controller/get-suhu";

const suhuRouter = express.Router();

suhuRouter.get("/", getAllSuhu,);
suhuRouter.get("/today-average", getAverageSuhuToday);
suhuRouter.get("/latest", getLatestSuhu);

export default suhuRouter;