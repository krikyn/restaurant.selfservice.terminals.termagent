import os from "os";

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

export function getMemoryLoad() {
  const freeMem = os.freemem()
  const totalMem = os.totalmem()

  return (totalMem - freeMem) / totalMem
}

export function getUsedMemoryBytes() {
  return os.totalmem() - os.freemem()
}
