import  express from "express";
import { getAllSuhu, getAverageSuhuToday, getHistorySuhu, getLatestSuhu } from "./controller/get-suhu";
import { postSuhu } from "./controller/post-suhu";

const suhuRouter = express.Router();

suhuRouter.get("/", getAllSuhu,);
suhuRouter.post("/", postSuhu,);
suhuRouter.get("/today-average", getAverageSuhuToday);
suhuRouter.get("/latest", getLatestSuhu);
suhuRouter.get("/history", getHistorySuhu);

export default suhuRouter;