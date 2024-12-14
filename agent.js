import {createInterface} from 'readline';
import {Client} from '@stomp/stompjs'
import {WebSocket} from 'ws';
import os from "os";
import AutoGitUpdate from 'auto-git-update';

import App from "./app.js";
import {
  AGENT_DEBUG,
  BASE_WS_URL,
  GIT_BRANCH,
  GIT_REPOSITORY,
  SCANNER_BAUD_RATE,
  SCANNER_DELIMITER,
  SCANNER_ENABLED,
  SCANNER_PATH,
  UPDATE_INTERVAL
} from "./consts.js";
import {fetchToken} from "./api.js";
import {queuePilotTask} from "./pilot.js";
import {ReadlineParser, SerialPort} from "serialport";


Object.assign(global, {WebSocket});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

let client;
let app;

const remoteLogger = {
  log: remoteLog,
};

async function updateSelf() {
  const updater = new AutoGitUpdate({
    repository: GIT_REPOSITORY,
    branch: GIT_BRANCH,
    tempLocation: os.tmpdir(),
    exitOnComplete: true
  });

  await updater.autoUpdate();
}

async function main() {
  if (!AGENT_DEBUG) {
    await updateSelf()

    setInterval(updateSelf, UPDATE_INTERVAL)
  }

  const token = await fetchToken();
  const brokerURL = `${BASE_WS_URL}?token=${token}`;

  client = new Client({
    brokerURL
  })

  client.onConnect = () => {
    console.log('Connected')
    client.subscribe('/topic/commands', async (msg) => {
      try {
        remoteLog('Received message: ' + msg.body)
        await handleMessage(msg.body)
        remoteLog(`Successfully executed command ${msg.body}`)
      } catch (e) {
        remoteLog(`Failed to execute command ${msg.body}: ${e}`, {level: 'error'});
      }
    })
    app.sendState();
  }

  client.onDisconnect = (frame) => {
    console.error('Disconnected')
  }

  client.onWebSocketError = (frame) => {
    console.error('WebSocket error: ', frame)
  }

  client.onStompError = (frame) => {
    console.error('Stomp error: ', frame)
  }

  client.reconnect_delay = 5000;
  client.activate()

  app = new App({send}, remoteLogger);

  if (SCANNER_ENABLED) {
    console.log('Starting scanner...')

    const scannerPort = new SerialPort({path: SCANNER_PATH, baudRate: SCANNER_BAUD_RATE});
    scannerPort.on('error', (err) => {
      console.error('Scanner Error: ', err.message);
    });
    scannerPort.on('open', () => {
      console.log('Scanner port opened!');
    });

    const scannerParser = scannerPort.pipe(new ReadlineParser({delimiter: SCANNER_DELIMITER}));

    scannerParser.on('data', (data) => {
      console.log(`Scanner data: ${data}`);
      send('/app/scannerData', data)
    });
  } else {
    console.log('Scanner is not enabled')
  }

  app.init();
  await app.open();
  console.log('Agent started');
}

async function handleMessage(msg) {
  const json = JSON.parse(msg)
  const {cmd} = json

  switch (cmd) {
    case 'open':
      await app.open();
      break;
    case 'close':
      await app.close();
      break;
    case 'refresh':
      await app.refresh();
      break;
    case 'pilot':
      const {args, payload} = json
      queuePilotTask(args, payload, remoteLogger).then((result) => {
        send('/app/pilotResult', JSON.stringify({
          payload,
          ...result
        }))
      })
      break
    case 'kill':
      console.log('Kill requested');
      try {
        await app.close();
      } finally {
        await gracefulExit();
      }
      break;
    default:
      throw new Error(`Invalid command: ${cmd}`)
  }
}

function send(destination, body) {
  try {
    client.publish({destination, body})
  } catch (e) {
    console.error(`Failed to send message ${JSON.stringify(body)} to destination ${destination}`)
  }
}

function remoteLog(text, params) {
  if (!params) {
    params = {level: 'info', sessionId: null, orderId: null}
  }

  if (!params.level) {
    params.level = 'info'
  }

  if (params.level === 'warn') {
    console.warn(text)
  } else if (params.level === 'error') {
    console.error(text)
  } else {
    console.log(text)
  }

  send('/app/log', JSON.stringify({
    text,
    ...params
  }))
}

async function gracefulExit() {
  console.log("Shutting down...");

  try {
    await app.close()
  } catch (e) {
  }

  try {
    await client.deactivate()
  } catch (e) {
  }

  process.nextTick(() => process.exit(0));
}

process.on('SIGINT', () => {
  gracefulExit().then(() => {
  });
});
process.on('SIGTERM', () => {
  gracefulExit().then(() => {
  });
});
process.on('SIGQUIT', () => {
  gracefulExit().then(() => {
  });
});
process.on('SIGPIPE', () => {
  gracefulExit().then(() => {
  });
});
process.on('uncaughtException', (e) => {
  console.error(e);
  gracefulExit().then(() => {
  });
});
rl.on('close', function () {
  gracefulExit().then(() => {
  });
});

main().catch((e) => {
  console.error(e);
  gracefulExit().then(() => {
  });
})
