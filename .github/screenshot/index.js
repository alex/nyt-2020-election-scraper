const finalhandler = require("finalhandler");
const http = require("http");
const path = require("path");
const serveStatic = require("serve-static");

let puppeteer;
let puppeteerDevices;
let puppeteerProduct;
let puppeteerHeadless;
let puppeteerSetViewport;
let puppeteerEmulate;

if (process.env.PUPPETEER_PRODUCT === "webkit") {
    puppeteer = require("playwright-webkit").webkit;
    puppeteerDevices = require("playwright-webkit").devices;
    puppeteerProduct = "webkit";
    puppeteerHeadless = false;
    puppeteerSetViewport = "setViewportSize";
    puppeteerEmulate = async function (browser, device) {
        return await browser.newPage(device);
    }
} else {
    puppeteer = require("puppeteer");
    puppeteerDevices = puppeteer.devices;
    puppeteerProduct = puppeteer.product;
    puppeteerHeadless = true;
    puppeteerSetViewport = "setViewport";
    puppeteerEmulate = async function (browser, device) {
        const page = await browser.newPage();
        await page.emulate(device);
        return page;
    }
}

const DEVICES = {
    "iphone": "iPhone X",
    "iphone-landscape": "iPhone X landscape",
    "ipad": "iPad Pro",
    "ipad-landscape": "iPad Pro landscape",
};

const REPOSITORY_ROOT = path.resolve(__dirname, "../..");

/* Exit on uncaught asynchronous exceptions to propagate the error to CI */
process.on("unhandledRejection", (reason, promise) => {
    console.error(reason);
    process.exit(1);
});

(async function () {
    /*
     * Firefox's Puppeteer implementation doesn't play well with file:// URLs,
     * see https://github.com/puppeteer/puppeteer/issues/5504.
     *
     * As a workaround, run an HTTP server. :(
     */
    const serve = serveStatic(REPOSITORY_ROOT);
    const server = http.createServer((request, response) => {
        /* https://expressjs.com/en/resources/middleware/serve-static.html#serve-files-with-vanilla-nodejs-http-server */
        serve(request, response, finalhandler(request, response));
    });
    server.listen();

    const pageUrl = `http://127.0.0.1:${server.address().port}/battleground-state-changes.html`;
    console.log(`Server listening at ${pageUrl}`);

    /*
     * Puppeteer refuses to install Chromium and Firefox at the same time, so
     * we have to use PUPPETEER_PRODUCT to choose which browser to install and
     * use. Sigh.
     */
    console.log(`Launching ${puppeteerProduct}`);

    const browser = await puppeteer.launch({ headless: puppeteerHeadless });

    async function screenshot(page, filename) {
        console.log(`Generating ${filename}`);
        await page.goto(pageUrl, { waitUntil: "load" });

        await page.screenshot({
            path: path.join(REPOSITORY_ROOT, `screenshot-${puppeteerProduct}-${filename}.png`),
            fullPage: true,
        });

        await page.evaluate(() => {
            (() => {
                const feature = features["shrunk"];
                feature.onDisable($(feature.buttonId));

                document.querySelector("#arizona tr:nth-last-child(5)").scrollIntoView(true);
            })();
        });
        await page.screenshot({
            path: path.join(REPOSITORY_ROOT, `screenshot-${puppeteerProduct}-${filename}-scrolled.png`),
        });
    }

    const page = await browser.newPage();
    await page[puppeteerSetViewport]({
        width: 1280,
        height: 720,
    });
    await screenshot(page, "desktop");
    await page.close();

    for (const [filename, name] of Object.entries(DEVICES)) {
        const page = await puppeteerEmulate(browser, puppeteerDevices[name]);
        await screenshot(page, filename);
        await page.close();
    }

    await browser.close();
    server.close();
})();
