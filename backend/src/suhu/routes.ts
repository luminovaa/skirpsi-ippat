import  express from "express";
import { downloadSuhuExcel, getAllSuhu, getAverageSuhuToday, getLatestSuhu } from "./controller/get-suhu";
import { postSuhu } from "./controller/post-suhu";

const suhuRouter = express.Router();

suhuRouter.get("/", getAllSuhu,);
suhuRouter.post("/", postSuhu,);
suhuRouter.get("/today-average", getAverageSuhuToday);
suhuRouter.get("/latest", getLatestSuhu);
suhuRouter.get("/download-excel", downloadSuhuExcel);

export default suhuRouter;