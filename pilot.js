import PQueue from 'p-queue';
import {execa} from 'execa';
import {readFile, unlink} from 'node:fs/promises';
import {PILOT_E_FILE_PATH, PILOT_EXECUTABLE_PATH, PILOT_P_FILE_PATH} from "./consts.js";
import timers from "node:timers/promises";
import {waitForFiles} from "./util.js";


const queue = new PQueue({concurrency: 1});

// no throw
async function executePilotTask(args) {
  try {
    try {
      await unlink(PILOT_E_FILE_PATH);
    } catch (ignored) {
    }

    try {
      await unlink(PILOT_P_FILE_PATH);
    } catch (ignored) {
    }

    console.log(`Executing sb_pilot with args ${args}...`);
    const result = await execa(PILOT_EXECUTABLE_PATH, args, {
      all: true,
    });
    console.log(`Executed sb_pilot with args ${args}: ${result}`);

    const {all, message, exitCode} = result;

    await waitForFiles([PILOT_E_FILE_PATH, PILOT_P_FILE_PATH], {
      timeout: 300000,
      delay: 333
    });

    let eText = null;
    try {
      eText = (await readFile(PILOT_E_FILE_PATH)).toString();
    } catch (ignored) {
    }

    await timers.setTimeout(100);

    let pText = null;
    try {
      pText = (await readFile(PILOT_P_FILE_PATH)).toString();
    } catch (ignored) {
    }

    return {
      eText,
      pText,
      output: all?.toString() ?? message?.toString(),
      exitCode
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
