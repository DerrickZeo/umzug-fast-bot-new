const { chromium } = require("playwright");
class UmzugAutomator {
  // ... constructor stays the same ...
  constructor(cfg, log) {
    this.cfg = cfg;
    this.log = log;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.ready = false;
    this.isLoggedIn = false;
    this.keepAliveTimer = null;
  }

  async initialize() {
    this.log.info("🚀 Launching persistent browser on Login Page...");
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-images",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    // --- SPEED OPTIMIZATION: RESOURCE BLOCKING ---
    // Blocks images, css, and fonts to save bandwidth and CPU cycles

    //await this.page.route("**/*", (route) => {
    //const type = route.request().resourceType();
    //if (["image", "font", "stylesheet", "media"].includes(type)) {
    //  route.abort();
    //} else {
    //  route.continue();
    // }
    //});

    //await this._dismissOverlays();
    await this._prepareLoginPage();
    this.ready = true;
    this.log.info("✅ Parked on Login Page. Credentials pre-filled.");
  }

  // Prepare the login page
  async _prepareLoginPage() {
    try {
      // Force a fresh state by clearing cookies/storage
      await this.context.clearCookies();

      await this.page.goto(this.cfg.baseUrl + "/login", {
        waitUntil: "networkidle",
      });

      await this._dismissOverlays();

      // Wait for the selector specifically before filling
      await this.page.waitForSelector("#username", { timeout: 3000 });

      await this.page.fill("input#username", this.cfg.username);
      await this.page.fill("input#password", this.cfg.password);
    } catch (err) {
      this.log.error(`Failed to prepare login page: ${err.message}`);
    }
  }

  /*async _dismissOverlays() {
    await this.page
      .evaluate(() => {
        // Add cms-accept-tags specifically and any dialogs
        const selectors =
          "cms-accept-tags, .mod_cms_accept_tags, [role='dialog'], .cookiebar, #cookiebar, .modal-backdrop";
        document.querySelectorAll(selectors).forEach((n) => {
          n.style.display = "none"; // Hide it
          n.remove(); // Then delete it
        });
      })
      .catch(() => {});
  }*/

  async _dismissOverlays() {
    await this.page
      .evaluate(() => {
        // 1. Identify all possible blocking elements
        const selectors = [
          "cms-accept-tags",
          ".mod_cms_accept_tags",
          "[role='dialog']",
          ".cookiebar",
          ".modal-backdrop",
          "#cn-container",
        ];

        selectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => {
            el.remove(); // Physically delete from DOM
          });
        });

        // 2. IMPORTANT: Reset the body overflow to ensure we can click/scroll
        document.body.style.overflow = "auto";
        document.body.style.pointerEvents = "auto";

        // 3. Remove any 'modal-open' classes that lock the screen
        document.documentElement.classList.remove("modal-open");
        document.body.classList.remove("modal-open");
      })
      .catch(() => {});
  }

  async triggerAccept() {
    if (!this.ready) return;
    this.log.info("⚡ Executing: Login -> Navigate -> Accept");

    try {
      // 1. Submit the pre-filled form
      // We click and wait for the URL change separately to avoid race conditions
      //await this.page.click('button[type="submit"]');

      // Replace your old click line with this:
      await this.page.$eval('button[type="submit"]', (el) => el.click());

      // Wait for the 'intern' area (increased timeout to 10s)
      await this.page.waitForURL(/\/intern\//, { timeout: 5000 });

      // --- NEW STABILITY STEP ---
      // Clear overlays AGAIN now that we are on the dashboard
      await this._dismissOverlays();

      // 2. Click the 'Meine Jobs' navigation link instead of a direct URL jump
      this.log.info("🖱️ Clicking 'Meine Jobs' navigation...");
      await this.page.click('a[href="intern/meine-jobs"]');

      /*// 2. Jump to Jobs immediately
      await this.page.goto(this.cfg.baseUrl + "/intern/meine-jobs", {
        waitUntil: "commit",
      });*/

      // 3. Find and Click Accept
      // 'visible' is safer than just checking if it exists
      const acceptButton = this.page.locator("button#ctrl_accept").first();
      if (await acceptButton.isVisible({ timeout: 3000 })) {
        // Add another overlay clear right before the click
        await this._dismissOverlays();

        //await acceptButton.click();
        // Use force: true to click through transparent overlays
        await acceptButton.click({ force: true });
        this.log.info("================================\n");
        this.log.info("🎯 JOB ACCEPTED SUCCESSFULLY!\n");
        this.log.info("================================");
      } else {
        this.log.warn("⚠️ No accept button found. Job might be gone.");
      }
    } catch (err) {
      this.log.error(`Execution failed: ${err.message}`);
    } finally {
      // 4. RESET: Always go back to login and re-fill for the next trigger
      this.log.info("🔄 Resetting to Login Page for next trigger...");
      await this._prepareLoginPage();
    }
  }
}

module.exports = { UmzugAutomator };
