import {createInterface} from 'readline';
import {Client} from '@stomp/stompjs'
import {WebSocket} from 'ws';

import App from "./app.js";

Object.assign(global, {WebSocket});

const APP_URL = process.env.APP_URL || "http://localhost:9000";
const BASE_SERVER_URL = process.env.SERVER_URL || "ws://localhost:8080/ws"
const TOKEN = process.env.TOKEN
const SERVER_URL = `${BASE_SERVER_URL}?token=${TOKEN}`

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function handleMessage(msg) {
  const {cmd} = JSON.parse(msg)

  switch (cmd) {
    case 'open':
      await app.open(APP_URL);
      break;
    case 'close':
      await app.close();
      break;
    case 'refresh':
      await app.refresh();
      break;
    case 'kill':
      await app.close();
      console.log('Kill requested');
      gracefulExit();
      break;
    default:
      throw new Error(`Invalid command: ${cmd}`)
  }
}


const client = new Client({
  brokerURL: SERVER_URL
})

function send(destination, body) {
  try {
    client.publish({destination, body})
  } catch (e) {
    console.error(`Failed to send message ${JSON.stringify(body)} to destination ${destination}`)
  }
}

client.onConnect = () => {
  console.log('Connected')
  client.subscribe('/topic/commands', async (msg) => {
    try {
      console.log('Received message: ' + msg.body)
      send('/app/terminalLog', {
        level: 'info',
        text: 'Received message ' + msg.body
      })

      await handleMessage(msg.body)

      send('/app/terminalLog', {
        level: 'info',
        text: 'OK'
      })
      console.log('OK')
    } catch (e) {
      console.error('Failed to execute command', e);
      send('/app/terminalLog', {
        level: 'error',
        text: e?.toString() ?? 'unknown error'
      })
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

const app = new App({
  send
});

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

app.init();
console.log('App started')
