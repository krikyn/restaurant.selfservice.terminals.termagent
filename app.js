import puppeteer from 'puppeteer';
import sharp from 'sharp';
import {getCpuLoad} from "./util.js";
import os from "os";
import {PASSWORD, USERNAME} from "./consts.js";

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
    setInterval(this.sendState.bind(this), 5000)
    setInterval(this.sendScreenshot.bind(this), 600000)
  }

  // no throw
  async sendScreenshot() {
    if (!this.page) {
      return
    }

    try {
      await this.page.screenshot({path: 'screenshot.jpg', captureBeyondViewport: false});

      const resizedImageBuf = await sharp('screenshot.jpg')
        .resize(108, 192)
        .toBuffer();

      this.sender.send('/app/terminalScreen', resizedImageBuf.toString('base64'));
      console.log('Screenshot sent');
    } catch (e) {
      console.error('Failed to send screenshot', e);
    }
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

  async open(url) {
    if (this.browser) {
      throw new Error('Browser is already open')
    }

    try {
      this.browser = await puppeteer.launch({
        headless: false,
        // args: ['--kiosk'],
        defaultViewport: {
          width: 1080,
          height: 1920
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
      await this.page.goto(url);

      this.page.on("framenavigated", this.sendScreenshot.bind(this));
    } catch (e) {
      await this.close();
      throw e;
    }

    this.state.open = true;

    await this.sendState();
    await this.sendScreenshot();

    console.log('App opened');
  }

  async refresh() {
    if (!this.page) {
      throw new Error('App is not open yet')
    }

    await this.page.reload();
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
