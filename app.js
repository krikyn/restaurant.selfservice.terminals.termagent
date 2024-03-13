import puppeteer from 'puppeteer';
import {getCpuLoad} from "./util.js";
import os from "os";
import {AGENT_DEBUG, FRONTEND_URL, PASSWORD, USERNAME} from "./consts.js";

export default class App {
  browser = null;
  page = null;
  state = {
    open: false,
    cpu: 0,
    memoryUsed: 0,
    memoryTotal: 0,
    uptime: 0,
  };

  constructor(sender) {
    this.sender = sender
  }

  init() {
    setInterval(this.sendState.bind(this), 10000)
  }

  // no throw
  async close() {
    if (!this.browser) {
      throw new Error('Browser is already closed')
    }

    try {
      await this.browser.close();
    } catch (e) {
      console.error('Failed to close browser', e);
    }

    this.browser = null
    this.page = null;
    this.state.open = false;

    await this.sendState();

    console.log('App closed');

  }

  async open() {
    if (this.browser) {
      throw new Error('Browser is already open')
    }

    try {
      this.browser = await puppeteer.launch({
        headless: false,
        devtools: AGENT_DEBUG,
        args: AGENT_DEBUG ? [] : ['--kiosk'],
        defaultViewport: {
          width: 1080,
          height: 1920,
        }
      })

      this.page = await this.browser.newPage();

      this.page
        .on('console', message =>
          console.log(`PAGE: ${message.type().toUpperCase()} ${message.text()}`))
        .on('pageerror', ({message}) => console.log(`PAGE: ${message}`))
        .on('requestfailed', request =>
          console.log(`PAGE: ${request.failure().errorText} ${request.url()}`))
        .on('close', this.close.bind(this))

      await this.page.evaluateOnNewDocument((data) => {
        window.AgentLoginData = data;
      }, {
        user: USERNAME,
        pass: PASSWORD
      });
      await this.page.goto(FRONTEND_URL);
    } catch (e) {
      await this.close();
      throw e;
    }

    this.state.open = true;

    await this.sendState();

    console.log('App opened');
  }

  async refresh() {
    if (!this.page) {
      throw new Error('App is not open yet')
    }

    await this.page.reload();
    await this.page.goto(FRONTEND_URL);
    await this.sendState();

    console.log('App refreshed');
  }

  // no throw
  sendState() {
    const cpuLoad = getCpuLoad()
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const usedMemory = totalMemory - freeMemory;

    this.state.cpu = cpuLoad;
    this.state.memoryTotal = totalMemory;
    this.state.memoryUsed = usedMemory;
    this.state.uptime = process.uptime();

    // no throw
    this.sender.send('/app/terminalStatus', JSON.stringify(this.state))
  }
}
