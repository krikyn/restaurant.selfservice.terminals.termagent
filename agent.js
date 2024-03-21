import {createInterface} from 'readline';
import {Client} from '@stomp/stompjs'
import {WebSocket} from 'ws';
import os from "os";
import AutoGitUpdate from 'auto-git-update';

import App from "./app.js";
import {AGENT_DEBUG, BASE_WS_URL} from "./consts.js";
import {fetchToken} from "./api.js";
import {queuePilotTask} from "./pilot.js";


Object.assign(global, {WebSocket});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

let client;
let app;

async function updateSelf() {
  const updater = new AutoGitUpdate({
    repository: 'https://git.tchvrs.com/touchverse/termagent',
    branch: 'main',
    tempLocation: os.tmpdir(),
    exitOnComplete: true
  });

  await updater.autoUpdate();
}

async function main() {
  if (!AGENT_DEBUG) {
    await updateSelf()
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
        console.log('Received message: ' + msg.body)
        await handleMessage(msg.body)
        console.log('OK')
      } catch (e) {
        console.error('Failed to execute command', e);
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

  app = new App({
    send
  });

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
      queuePilotTask(args).then((result) => {
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
