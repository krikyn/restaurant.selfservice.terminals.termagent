import PQueue from 'p-queue';
import iconv from 'iconv-lite'
import {execa} from 'execa';
import {readFile, unlink} from 'node:fs/promises';
import {PILOT_E_FILE_PATH, PILOT_EXECUTABLE_PATH, PILOT_P_FILE_PATH} from "./consts.js";
import timers from "node:timers/promises";
import {waitForFiles} from "./util.js";


const queue = new PQueue({concurrency: 1});

// no throw
async function executePilotTask(args, payload, remoteLogger) {
  const sessionId = payload.sessionId ?? null
  const orderId = payload.orderId ?? null

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

    remoteLogger.log(`Executing sb_pilot with args ${args}...`, {sessionId, orderId});
    try {
      const result = await execa(PILOT_EXECUTABLE_PATH, args, {
        all: true,
      });
      ({all, message, exitCode} = result);
    } catch (e) {
      ;({all, message, exitCode} = e);
    }
    remoteLogger.log(`Executed sb_pilot with args ${args} with exit code ${exitCode}, awaiting result...`, {
      sessionId,
      orderId
    });

    await waitForFiles([PILOT_E_FILE_PATH, PILOT_P_FILE_PATH], {
      timeout: 300000,
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

    remoteLogger.log(`Got result for sb_pilot call with args ${args}`, {sessionId, orderId});

    return {
      eText,
      pText,
      output: all?.toString() || message?.toString(),
      exitCode
    }
  } catch (e) {
    remoteLogger.log(`Failed to execute sb_pilot with args ${args}: ${e}`, {level: 'error', sessionId, orderId});

    return {
      error: e.toString()
    }
  }
}

export async function queuePilotTask(args, payload, remoteLogger) {
  return queue.add(() => executePilotTask(args, payload, remoteLogger))
}
