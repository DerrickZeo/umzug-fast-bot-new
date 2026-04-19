const { chromium } = require("playwright");

class UmzugAutomator {
  constructor(cfg, log) {
    this.cfg = cfg;
    this.log = log;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.ready = false;
  }

  async initialize() {
    this.log.info("🚀 Launching High-Speed Persistent Browser...");
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
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
    await this.page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "stylesheet", "media"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await this._prepareLoginPage();
    this.ready = true;
    this.log.info("✅ Parked on Login Page. Race Mode Active.");
  }

  async _prepareLoginPage() {
    try {
      await this.context.clearCookies();
      // Use 'commit' instead of 'networkidle' for immediate interaction
      await this.page.goto(this.cfg.baseUrl + "/login", {
        waitUntil: "commit",
        timeout: 5000,
      });

      // Parallelize overlay removal and filling
      await Promise.all([
        this._dismissOverlays(),
        this.page.waitForSelector("#username", { timeout: 5000 }),
      ]);

      await this.page.fill("#username", this.cfg.username);
      await this.page.fill("#password", this.cfg.password);
    } catch (err) {
      this.log.error(`Failed to prepare login page: ${err.message}`);
    }
  }

  async _dismissOverlays() {
    // Run without awaiting to keep the main thread moving
    this.page
      .evaluate(() => {
        const selectors =
          "cms-accept-tags, .mod_cms_accept_tags, [role='dialog'], .cookiebar, #cookiebar, .modal-backdrop";
        document.querySelectorAll(selectors).forEach((n) => {
          n.style.display = "none";
          n.remove();
        });
      })
      .catch(() => {});
  }

  /*async triggerAccept() {
    if (!this.ready) return;
    this.log.info("⚡ Executing High-Speed Accept sequence...");

    try {
      // 1. Submit and wait for URL 'commit' (the moment the server responds)
      await Promise.all([
        this.page.click('button[type="submit"]', { force: true }),
        this.page.waitForURL(/\/intern\//, {
          waitUntil: "commit",
          timeout: 3000,
        }),
      ]);

      // 2. Click 'Meine Jobs' with force immediately
      // We don't wait for overlays here, we just force the click
      this.log.info("🖱️ Clicking 'Meine Jobs'...");
      await Promise.all([
        this.page.click('a[href="intern/meine-jobs"]', { force: true }),
        this.page.waitForSelector("button#ctrl_accept", {
          state: "attached",
          timeout: 7000,
        }),
      ]);

      // 3. Final Strike
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
      this.log.info("🔄 Quick Reset for next trigger...");
      await this._prepareLoginPage();
    }
  }*/
  async triggerAccept() {
    if (!this.ready) return;
    this.log.info("⚡ Executing High-Speed Accept sequence...");

    try {
      // 1. Submit the login form and wait for the redirect to START
      await Promise.all([
        this.page.click('button[type="submit"]', { force: true }),
        this.page.waitForURL(/\/intern\//, {
          waitUntil: "commit",
          timeout: 7000,
        }),
      ]);

      // 2. DIRECT STRIKE: Instead of clicking the menu, jump straight to the URL
      // This is often faster because it bypasses the dashboard's loading scripts
      this.log.info("🚀 Direct Jump to Jobs Page...");
      await this.page.goto(this.cfg.baseUrl + "/intern/meine-jobs", {
        waitUntil: "commit",
        timeout: 10000,
      });

      // 3. The Hunter: Look for the button OR the "No jobs" message
      // We wait for the button, but we catch the timeout gracefully
      const acceptButton = this.page.locator("button#ctrl_accept").first();

      try {
        await acceptButton.waitFor({ state: "visible", timeout: 5000 });
        await acceptButton.click({ force: true });
        this.log.info(
          "================================\n🎯 JOB ACCEPTED SUCCESSFULLY!\n================================",
        );
      } catch (e) {
        this.log.warn(
          "⚠️ Job page loaded, but no button appeared within 5s. (Job likely gone)",
        );
      }
    } catch (err) {
      this.log.error(`Execution failed: ${err.message}`);
    } finally {
      this.log.info("🔄 Quick Reset for next trigger...");
      await this._prepareLoginPage();
    }
  }
}

module.exports = { UmzugAutomator };
