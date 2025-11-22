import axios from "axios";

const CLIENT_ID = "cid.0vjruwfy5yhdmgotpo4x1xftz";
const CLIENT_SECRET = "cs9.vr1bljux9xbjvlakfeq5j69mwwqob96ibikz88d7zatuj6a2lp";
const APP_KEY = "ak1.7un1r6auptrsisx1ibm3e251p";

async function testToken() {
  const url = "https://auth-integration.servicetitan.io/connect/token";
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "openid offline_access"
  });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "ST-App-Key": APP_KEY
  };

  try {
    const res = await axios.post(url, body, { headers });
    console.log("✅ Token:", res.data.access_token);
  } catch (err) {
    console.error("❌ Failed:", err.response?.data || err.message);
  }
}

testToken();
