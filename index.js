// import { globby } from "globby";

const globby = import("globby");

const { Builder, By, Key, until } = require("selenium-webdriver");
let chrome = require("selenium-webdriver/chrome");
const fs = require("fs");

let options = new chrome.Options();

options.addArguments("--disable-notifications");
options.addArguments("--disable-popup-blocking");

async function sendPosts({ textPath, linksPath }) {
  const linksString = fs.readFileSync(linksPath, "utf8");
  const links = linksString.split("\n");
  const message = fs.readFileSync(textPath, "utf8");

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
      await driver.executeScript("window.scrollTo(0, 600)");
      // await timeout(50000);

      await selectPostTextField(driver);

      await timeout(5000);

      await driver.switchTo().activeElement().sendKeys(message);
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

      await driver.findElement(By.css('div[aria-label="Foto/Video"]')).click();

      const imagesRaw = await fs.promises.readdir("./images");
      const images = imagesRaw
        .filter(
          (image) =>
            image.endsWith(".png") ||
            image.endsWith(".jpg") ||
            image.endsWith(".jpeg")
        )
        .map((image) => `${process.cwd()}/images/${image}`)
        .join(" \n ");

      await driver
        .findElement(By.css(`input[multiple][type="file"]`))
        .sendKeys(images);

      await submit(driver);

      await timeout(5000);
    }
    await timeout(100000);
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
  console.log("clicked");
  return await driver.findElement(By.css('div[aria-label="Postează"]')).click();
}

async function selectPostTextField(driver) {
  await driver
    .findElement(
      By.css('div[data-pagelet="GroupInlineComposer"] div[role="button"] span')
    )
    .click();
}

async function sendRomanianPosts() {
  console.log('start')
  await sendPosts({
    textPath: "./textRo.txt",
    linksPath: "./linksRomanian.txt",
  });
}

function sendPolandPosts() {
  await sendPosts({
    textPath: "./textPl.txt",
    linksPath: "./linksPoland.txt",
  });
}

module.exports = { sendPolandPosts, sendRomanianPosts };
