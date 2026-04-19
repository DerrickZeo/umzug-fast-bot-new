require("dotenv").config();
const pino = require("pino");
const { PubSub } = require("@google-cloud/pubsub");
const { UmzugAutomator } = require("./automator");

const log = pino({ transport: { target: "pino-pretty" } });

async function main() {
  const bot = new UmzugAutomator(
    {
      username: process.env.LOGIN_USERNAME,
      password: process.env.LOGIN_PASSWORD,
      baseUrl: process.env.BASE_URL,
    },
    log,
  );
  console.log(
    "Checking Env:",
    process.env.LOGIN_USERNAME,
    process.env.LOGIN_PASSWORD,
  );

  await bot.initialize();

  const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
  const subscription = pubsub.subscription(process.env.GCP_SUBSCRIPTION_NAME);

  log.info("👂 Monitoring Gmail notifications...");

  let isProcessing = false; // Flag to prevent concurrent processing

  subscription.on("message", async (message) => {
    message.ack(); // Acknowledge immediately
    log.info("🔔 Trigger received.");
    if (isProcessing) {
      log.info("⏳ Trigger ignored: Bot is already busy processing a job.");
      return;
    }
    isProcessing = true;
    try {
      await bot.triggerAccept();
    } catch (err) {
      log.error("❌ Execution error:", err.message);
    } finally {
      isProcessing = false;
      log.info("🏁 Ready for the next trigger.");
    }
  });
}

main().catch((err) => log.error(err));
