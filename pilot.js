import PQueue from 'p-queue';
import iconv from 'iconv-lite'
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

    let all, message, exitCode;

    console.log(`Executing sb_pilot with args ${args}...`);
    try {
      const result = await execa(PILOT_EXECUTABLE_PATH, args, {
        all: true,
      });
      ({all, message, exitCode} = result);
    } catch (e) {
      ;({all, message, exitCode} = e);
    }
    console.log(`Executed sb_pilot with args ${args} with exit code ${exitCode}, awaiting result...`);

    await waitForFiles([PILOT_E_FILE_PATH, PILOT_P_FILE_PATH], {
      timeout: 300000,
      delay: 333
    });

    let eText = null;
    try {
      const buffer = await readFile(PILOT_E_FILE_PATH);
      eText = iconv.decode(buffer, 'cp866');
    } catch (ignored) {
    }

    await timers.setTimeout(100);

    let pText = null;
    try {
      const buffer = await readFile(PILOT_P_FILE_PATH);
      pText = iconv.decode(buffer, 'cp866');
    } catch (ignored) {
    }

    console.log(`Got result for sb_pilot call with args ${args}: eText=${eText} pText=${pText}`);

    return {
      eText,
      pText,
      output: all?.toString() || message?.toString(),
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
