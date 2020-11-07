const path = require("path");
const puppeteer = require("puppeteer");
const url = require("url");

const DEVICES = {
    "iphone": "iPhone X",
    "iphone-landscape": "iPhone X landscape",
    "ipad": "iPad Pro",
    "ipad-landscape": "iPad Pro landscape",
};

const REPOSITORY_ROOT = path.resolve(__dirname, "../..");
const HTML_URL = url.pathToFileURL(path.join(REPOSITORY_ROOT, "battleground-state-changes.html"));

(async function () {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    async function screenshot(filename) {
        await page.goto(HTML_URL, { waitUntil: "networkidle0" });

        await page.screenshot({
            path: path.join(REPOSITORY_ROOT, `screenshot-${filename}.png`),
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
            path: path.join(REPOSITORY_ROOT, `screenshot-${filename}-scrolled.png`),
        });
    }

    await page.setViewport({
        width: 1920,
        height: 1080,
    });
    await screenshot("desktop");

    for (const [filename, name] of Object.entries(DEVICES)) {
        await page.emulate(puppeteer.devices[name]);
        await screenshot(filename);
    }

    await browser.close();
})();
