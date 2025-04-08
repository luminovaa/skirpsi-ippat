import  express from "express";
import { getAllPzem, getAveragePzemToday, getLatestPzem } from "./controller/get-pzem";
import { postPzem } from "./controller/post-pzem";

const pzemRouter = express.Router();

pzemRouter.get("/", getAllPzem,);
pzemRouter.get("/today-average", getAveragePzemToday);
pzemRouter.get("/latest", getLatestPzem);
pzemRouter.post("/", postPzem);

export default pzemRouter;