import PQueue from 'p-queue';
import {execa} from 'execa';
import {readFile, unlink} from 'node:fs/promises';
import {PILOT_E_FILE_PATH, PILOT_EXECUTABLE_PATH, PILOT_P_FILE_PATH} from "./consts.js";


const queue = new PQueue({concurrency: 1});

// no throw
async function executePilotTask(args) {
  try {
    const result = await execa(PILOT_EXECUTABLE_PATH, args);
    console.log(`Executed sb_pilot with args ${args}: ${result}`)

    let eText = null;
    try {
      eText = (await readFile(PILOT_E_FILE_PATH)).toString();
    } catch (ignored) {
    }

    let pText = null;
    try {
      pText = (await readFile(PILOT_P_FILE_PATH)).toString();
    } catch (ignored) {
    }

    await Promise.all([unlink(PILOT_E_FILE_PATH), unlink(PILOT_P_FILE_PATH)]);

    return {
      eText,
      pText
    }
  } catch (e) {
    console.log(`Failed to execute sb_pilot with args ${args}`, e);

    return {
      error: e.toString()
    }
  }
}

export async function queuePilotTask(args) {
  return queue.add(() => executePilotTask(args))
}
