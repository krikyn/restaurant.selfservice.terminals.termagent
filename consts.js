import {config} from 'dotenv';
import * as path from 'path';

config();

export const FRONTEND_URL = process.env.APP_URL || "http://localhost:9000";
export const API_URL = process.env.API_URL || "http://localhost:8080";
export const BASE_WS_URL = process.env.SERVER_URL || "ws://localhost:8080/ws";
export const USERNAME = process.env.WS_USERNAME || "test";
export const PASSWORD = process.env.WS_PASSWORD || "test";
export const UPDATE_INTERVAL = Number(process.env.UPDATE_INTERVAL || "3600000");
export const AGENT_DEBUG = !process.env.AGENT_DEBUG;
export const PILOT_FOLDER_PATH = path.resolve(process.env.PILOT_FOLDER_PATH || ".");
export const PILOT_EXECUTABLE_PATH = path.join(PILOT_FOLDER_PATH, "sb_pilot.exe");
export const PILOT_E_FILE_PATH = path.join(PILOT_FOLDER_PATH, "e");
export const PILOT_P_FILE_PATH = path.join(PILOT_FOLDER_PATH, "p");
