import os from "os";
import fs from "node:fs/promises";
import timers from "node:timers/promises";
import {openWindows} from "get-windows";

let lastTicks = {
  idle: 0,
  total: 0,
}

export function getCpuLoad() {
  const osCpuInfo = os.cpus()
  let curTicks = {
    idle: 0,
    total: 0,
  }

  osCpuInfo.forEach(({times}) => {
    const total = times.user + times.nice + times.sys + times.idle + times.irq
    curTicks.total += total
    curTicks.idle += times.idle
  })

  const totalDelta = curTicks.total - lastTicks.total
  const idleDelta = curTicks.idle - lastTicks.idle
  Object.assign(lastTicks, curTicks)

  return 1 - (idleDelta / totalDelta)
}

export async function waitForFiles(
  filePaths,
  {timeout = 30_000, delay = 333} = {}
) {
  const startTime = Date.now()

  do {
    for (const filePath of filePaths) {
      try {
        const file = await fs.readFile(filePath, {encoding: "utf-8"});
        return file;
      } catch (err) {
      }
    }

    await timers.setTimeout(delay);
  } while (Date.now() - startTime < timeout)

  const msg = `Timeout of ${timeout} ms exceeded waiting for ${filePaths}`;
  throw Error(msg);
}

export async function closeAllWindows() {
  const windows = await openWindows()

  windows?.forEach((window) => {
    const processId = window.owner.processId
    process.kill(processId, 'SIGKILL');
  })
}