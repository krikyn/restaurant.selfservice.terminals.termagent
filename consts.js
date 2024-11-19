import {config} from 'dotenv';
import * as path from 'path';

config();

export const FRONTEND_URL = process.env.APP_URL || "http://localhost:9000";
export const API_URL = process.env.API_URL || "http://localhost:8080";
export const BASE_WS_URL = process.env.SERVER_URL || "ws://localhost:8080/ws";
export const USERNAME = process.env.WS_USERNAME || "test";
export const PASSWORD = process.env.WS_PASSWORD || "test";
export const UPDATE_INTERVAL = Number(process.env.UPDATE_INTERVAL || "3600000");
export const GIT_REPOSITORY = process.env.GIT_REPOSITORY || "https://git.tchvrs.com/touchverse/termagent"
export const GIT_BRANCH = process.env.GIT_BRANCH || "main"
export const AGENT_DEBUG = !process.env.AGENT_DEBUG;
export const PILOT_FOLDER_PATH = path.resolve(process.env.PILOT_FOLDER_PATH || ".");
export const PILOT_EXECUTABLE_PATH = path.join(PILOT_FOLDER_PATH, "sb_pilot.exe");
export const PILOT_E_FILE_PATH = path.join(PILOT_FOLDER_PATH, "e");
export const PILOT_P_FILE_PATH = path.join(PILOT_FOLDER_PATH, "p");
export const SCANNER_PATH = process.env.SCANNER_PATH || "COM3";
export const SCANNER_BAUD_RATE = Number(process.env.SCANNER_BAUD_RATE) || 9600;
export const SCANNER_DELIMITER = (process.env.SCANNER_DELIMITER || "\\r\\n")
  .replaceAll("\\n", "\n")
  .replaceAll("\\r", "\r");
