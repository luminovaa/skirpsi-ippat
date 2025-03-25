import  express from "express";
import { getAllPzem, getAveragePzemToday, getLatestPzem } from "./controller/get-pzem";

const pzemRouter = express.Router();

pzemRouter.get("/", getAllPzem,);
pzemRouter.get("/today-average", getAveragePzemToday);
pzemRouter.get("/latest", getLatestPzem);

export default pzemRouter;