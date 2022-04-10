const { Builder, By, Key, until } = require("selenium-webdriver");
let chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone"); // dependent on utc plugin
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/London");

let options = new chrome.Options();

options.addArguments("--disable-notifications");
options.addArguments("--disable-popup-blocking");

async function sendPosts({ textPath, linksPath, logFile }) {
  const currentLogPath = "./current.txt";
  const linksString = fs.readFileSync(linksPath, "utf8");
  const links = linksString.split("\n");
  const postMessage = fs.readFileSync(textPath, "utf8");

  console.log(postMessage);

  if (fs.existsSync(currentLogPath)) {
    fs.unlinkSync(currentLogPath);
  }

  let driver = await new Builder()
    .withCapabilities({
      args: ["--disable-notifications"],
      args: ["--disable-plugins"],
      chromeOptions: {
        excludeSwitches: ["disable-popup-blocking"],
      },
    })
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.get("https://facebook.com");
    //Store the ID of the original window
    const originalWindow = await driver.getWindowHandle();
    await driver.wait(until.titleIs("Facebook – log in or sign up"), 100000);
    await timeout(1000);

    const cookieBanners = await driver.findElements(
      By.css(`div[aria-labelledby="manage_cookies_title"]`)
    );

    if (cookieBanners.length) {
      await driver
        .findElement(
          By.css(`button[data-cookiebanner="accept_only_essential_button"]`)
        )
        .click();
    }

    const emailInput = await driver.findElement(By.id("email"));
    const passwordInput = await driver.findElement(By.id("pass"));

    await emailInput.sendKeys("Daniela.p.1996@mail.ru");
    await passwordInput.sendKeys("19960609D");
    await passwordInput.sendKeys(Key.ENTER);
    await timeout(5000);

    for (const link of links) {
      await driver.get(link);
      await timeout(1000);
      const title = await (await driver.getTitle())
        .replace("| Facebook", "")
        .replace(/\(.*\)/, "");

      const message = `Postul in grupul [${title}]`;
      try {
        // await timeout(50000);

        await selectPostTextField(driver);

        await timeout(5000);

        const currentActive = await driver.switchTo().activeElement();

        await currentActive.sendKeys(postMessage);
        await timeout(2000);

        if (await isBlockDisabled(driver)) {
          await escape(driver);
          await escape(driver);
          await timeout(1000);
          await selectPostTextField(driver);
          if (await isBlockDisabled(driver)) {
            await escape(driver);
          }
        }
        await timeout(2000);

        await driver
          .findElement(By.css('div[aria-label="Foto/Video"]'))
          .click();

        const imagesRaw = await fs.promises.readdir("./dana/imagini");
        const images = imagesRaw
          .filter(
            (image) =>
              image.endsWith(".png") ||
              image.endsWith(".jpg") ||
              image.endsWith(".jpeg")
          )
          .map((image) => `${process.cwd()}/dana/imagini/${image}`)
          .join(" \n ");

        await driver
          .findElement(By.css(`input[multiple][type="file"]`))
          .sendKeys(images);

        const submitElement = await submit(driver);

        try {
          await driver.wait(until.elementIsNotVisible(submitElement), 10000);
        } catch (e) {
          if (e.name === "StaleElementReferenceError") {
            console.log(`${message} a fost postat cu succes`);
            fs.appendFileSync(
              currentLogPath,
              `${message} a fost postat cu succes\n`
            );
          } else {
            throw e;
          }
        }

        await timeout(5000);
      } catch (e) {
        console.log(`${message} a esuat ${e}`);
        fs.appendFileSync(currentLogPath, `${message} a esuat ${e}\n`);
      }
    }
    console.log("Done");
    fs.appendFileSync(currentLogPath, `Done`);
    fs.copyFileSync(currentLogPath, logFile);
  } finally {
    await driver.quit();
  }
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isBlockDisabled(driver) {
  const functionBlock = await driver.findElements(
    By.css('div[aria-label="Ai fost blocată temporar"]')
  );
  return functionBlock.length;
}

async function escape(driver) {
  return await driver.actions().sendKeys(Key.ESCAPE).perform();
}

async function submit(driver) {
  await timeout(1000);
  const submitElement = await driver.findElement(
    By.css('div[aria-label="Postează"]')
  );
  await submitElement.click();
  return submitElement;
}

async function selectPostTextField(driver) {
  const textFieldElements = await driver.findElements(
    By.css('div[data-pagelet="GroupInlineComposer"] div[role="button"] span')
  );

  if (!textFieldElements.length) {
    await driver.executeScript("window.scrollTo(0, 300)");
    return await selectPostTextField(driver);
  }

  await textFieldElements[0].click();
}

async function sendRomanianPosts() {
  await sendPosts({
    textPath: "./dana/textRo.txt",
    linksPath: "./dana/linksRomanian.txt",
    logFile: `./dana/executarilePrecedente/statusRO_${dayjs().format(
      "MMM D, YYYY h:mm A"
    )}.txt`,
  });
}

async function sendPolandPosts() {
  await sendPosts({
    textPath: "./dana/textPl.txt",
    linksPath: "./dana/linksPoland.txt",
    logFile: `./dana/executarilePrecedente/statusPL_${dayjs().format(
      "MMM D, YYYY h:mm A"
    )}.txt`,
  });
}

(async function run() {
  if (process.env.COUNTRY === "RO") await sendRomanianPosts();
  else if (process.env.COUNTRY === "PL") await sendPolandPosts();
})();
