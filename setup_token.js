const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const TOKEN_PATH = path.resolve(__dirname, "token.json");
const CREDENTIALS_PATH = path.resolve(__dirname, "config", "credentials.json");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Missing credentials.json at ${CREDENTIALS_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  console.log(`Token saved to ${TOKEN_PATH}`);
}

async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question("Enter the code from that page here: ", (value) => {
      rl.close();
      resolve(value);
    });
  });

  const token = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(token.tokens);
  saveToken(token.tokens);
}

async function main() {
  const credentials = loadCredentials();
  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web || {};

  if (!client_id || !client_secret || !redirect_uris?.length) {
    throw new Error(
      "Invalid OAuth client credentials in config/credentials.json",
    );
  }

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );
  await getAccessToken(oAuth2Client);
}

main().catch((error) => {
  console.error("Error setting up token:", error.message);
  process.exit(1);
});
