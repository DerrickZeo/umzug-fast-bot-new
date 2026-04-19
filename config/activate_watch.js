const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = "token_fleuwaing.json";

async function run() {
  // To this (if the JSON is in the same folder as the script):
  const path = require("path");
  const content = fs.readFileSync(path.join(__dirname, "credentials.json"));
  // const content = fs.readFileSync("credentials.json");
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("🔗 Open this URL in your browser:\n", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("\n➡️  Enter the code from the URL here: ", async (code) => {
    rl.close();

    try {
      // Clean the code (removes everything except the actual code)
      const cleanCode = code.split("&")[0].trim();

      const { tokens } = await oAuth2Client.getToken(cleanCode);
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      console.log("✅", TOKEN_PATH, "saved.");

      // FIX: Initialize the gmail object properly here
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      const res = await gmail.users.watch({
        userId: "me",
        requestBody: {
          topicName: "projects/umzug-bot/topics/gmail-notifications",
          labelIds: ["INBOX"],
        },
      });
      console.log("🚀 Gmail Watch is now ACTIVE!");
      console.log(
        "Expiration:",
        new Date(parseInt(res.data.expiration)).toLocaleString(),
      );
    } catch (err) {
      console.error(
        "❌ Error details:",
        err.response ? err.response.data : err.message,
      );
    }
  });
}

run();
