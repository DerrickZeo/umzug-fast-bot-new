const fs = require("fs");
const { google } = require("googleapis");

// Scopes must match what you set in the console
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = "token.json";

async function generateToken() {
  const content = fs.readFileSync("credentials.json");
  const { client_secret, client_id, redirect_uris } =
    JSON.parse(content).installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline", // Required to get a Refresh Token
    scope: SCOPES,
  });

  print(`🔗 Open this link in your browser to authorize:\n${authUrl}`);

  // After you authorize, you'll get a code in the URL.
  // Paste it into your terminal when prompted.
  const code = "PASTE_CODE_FROM_BROWSER_HERE";

  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log("✅ token.json generated successfully!");
}

generateToken();
