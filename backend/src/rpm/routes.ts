import  express from "express";
import { postRpm } from "./controller/post-rpm";

const rpmRouter = express.Router();

rpmRouter.post("/", postRpm);

export default rpmRouter;