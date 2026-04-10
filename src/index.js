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

  await bot.initialize();

  const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
  const subscription = pubsub.subscription(process.env.GCP_SUBSCRIPTION_NAME);

  log.info("👂 Monitoring Gmail notifications...");

  subscription.on("message", async (message) => {
    message.ack(); // Acknowledge immediately
    log.info("🔔 Trigger received.");
    await bot.triggerAccept();
  });
}

main().catch((err) => log.error(err));
