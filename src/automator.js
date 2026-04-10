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
      args: ["--no-sandbox", "--disable-images"],
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    await this._prepareLoginPage();
    this.ready = true;
    this.log.info("✅ Parked on Login Page. Credentials pre-filled.");
  }

  // Prepare the login page
  async _prepareLoginPage() {
    await this.page.goto(this.cfg.baseUrl + "/login");
    await this._dismissOverlays();
    await this.page.fill('input[name="username"]', this.cfg.username);
    await this.page.fill('input[name="password"]', this.cfg.password);
  }

  async _dismissOverlays() {
    await this.page
      .evaluate(() => {
        document
          .querySelectorAll("cms-accept-tags, .cookiebar, #cookiebar")
          .forEach((n) => n.remove());
      })
      .catch(() => {});
  }

  async triggerAccept() {
    if (!this.ready) return;
    this.log.info("⚡ Trigger! Executing Login -> Navigate -> Accept");

    try {
      // 1. Submit pre-filled login form
      await Promise.all([
        this.page.click('button[type="submit"]'),
        this.page.waitForURL(/\/intern\//, { timeout: 5000 }),
      ]);

      // 2. Direct jump to Jobs
      await this.page.goto(this.cfg.baseUrl + "/intern/meine-jobs", {
        waitUntil: "commit",
      });

      // 3. Find and Click
      const acceptButton = this.page.locator("button#ctrl_accept").first();
      if (await acceptButton.isVisible({ timeout: 2000 })) {
        await acceptButton.click({ noWaitAfter: true });
        this.log.info("🎯 Job Accepted!");
      }

      // 4. RESET: Go back to login page for the next trigger
      // This ensures we don't get 'stuck' in an expired session
      await this.page.goto(this.cfg.baseUrl + "/login");
      await this.page.fill('input[name="username"]', this.cfg.username);
      await this.page.fill('input[name="password"]', this.cfg.password);
    } catch (err) {
      this.log.error(`Execution failed: ${err.message}`);
      // Emergency reset to login page
      await this.page.goto(this.cfg.baseUrl + "/login").catch(() => {});
    }
  }
}
