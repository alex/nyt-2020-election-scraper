const finalhandler = require("finalhandler");
const http = require("http");
const path = require("path");
const puppeteer = require("puppeteer");
const serveStatic = require("serve-static");
const url = require("url");

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

    const address = server.address();
    const pageUrl = url.format({
        protocol: "http",
        hostname: address.address,
        port: address.port,
        pathname: "battleground-state-changes.html",
    });
    console.log(`Server listening at ${pageUrl}`);

    /*
     * Puppeteer refuses to install Chromium and Firefox at the same time, so
     * we have to use PUPPETEER_PRODUCT to choose which browser to install and
     * use. Sigh.
     */
    const product = puppeteer.product;
    console.log(`Launching ${product}`);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    async function screenshot(filename) {
        console.log(`Generating ${filename}`);
        await page.goto(pageUrl, { waitUntil: "load" });

        await page.screenshot({
            path: path.join(REPOSITORY_ROOT, `screenshot-${product}-${filename}.png`),
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
            path: path.join(REPOSITORY_ROOT, `screenshot-${product}-${filename}-scrolled.png`),
        });
    }

    await page.setViewport({
        width: 1280,
        height: 720,
    });
    await screenshot("desktop");

    for (const [filename, name] of Object.entries(DEVICES)) {
        await page.emulate(puppeteer.devices[name]);
        await screenshot(filename);
    }

    await browser.close();
    server.close();
})();
