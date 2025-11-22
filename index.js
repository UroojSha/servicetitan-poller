// index.js
import axios from "axios";

// ----------------------------
// SANDBOX CREDENTIALS (TEST ONLY)
// ----------------------------
const TENANT_ID = "1690697528";
const CLIENT_ID = "cid.0vjruwfy5yhdmgotpo4x1xftz";
const CLIENT_SECRET = "cs9.vr1bljux9xbjvlakfeq5j69mwwqob96ibikz88d7zatuj6a2lp";
const APP_KEY = "ak1.7un1r6auptrsisx1ibm3e251p";

const GHL_API_KEY = "pit-247ae836-29bc-480f-84ef-d9571cd34927";
const GHL_CALENDAR_ID = "8RbfO1qvL8BojjVylXoP";

// Track last sync timestamp
let lastTimestamp = new Date().toISOString();

// Sleep helper
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ----------------------------
// GET SERVICE TITAN SANDBOX TOKEN
// ----------------------------
async function getAccessToken() {
  const url = "https://auth-integration.servicetitan.io/connect/token";

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "openid offline_access", // this was causing invalid_scope before
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "ST-App-Key": APP_KEY,
  };

  try {
    const res = await axios.post(url, body, { headers });
    console.log("🔑 ST sandbox token obtained");
    return res.data.access_token;
  } catch (err) {
    console.error("❌ Failed to get ST token:", err.response?.data || err.message);
    throw err;
  }
}

// ----------------------------
// POLL SERVICE TITAN FOR JOBS
// ----------------------------
async function pollServiceTitan(token) {
  const url = `https://api-integration.servicetitan.io/crm/v2/tenant/${TENANT_ID}/jobs?modifiedOnStart=${lastTimestamp}`;

  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ST-App-Key": APP_KEY,
      },
    });

    const jobs = res.data?.data || [];
    if (jobs.length > 0) {
      console.log(`📌 Found ${jobs.length} new/updated jobs`);
      for (const job of jobs) {
        await sendJobToGHL(job);
      }
      lastTimestamp = new Date().toISOString();
    }
  } catch (err) {
    console.error("❌ Polling ST failed:", err.response?.data || err.message);
  }
}

// ----------------------------
// SEND JOB TO GHL
// ----------------------------
async function sendJobToGHL(job) {
  const url = "https://rest.gohighlevel.com/v1/appointments/";
  const payload = {
    calendarId: GHL_CALENDAR_ID,
    title: `Job #${job.id} - ${job.customer?.name ?? "No Name"}`,
    startTime: job.start,
    endTime: job.end,
    name: job.customer?.name || "Unknown",
    email: job.customer?.email || "",
    phone: job.customer?.phone || "",
  };

  try {
    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    console.log(`✅ Sent job ${job.id} to GHL`);
  } catch (err) {
    console.error("❌ GHL sync failed:", err.response?.data || err.message);
  }
}

// ----------------------------
// MAIN LOOP
// ----------------------------
async function main() {
  console.log("🚀 ST Sandbox → GHL Sync Started");
  let token = await getAccessToken();

  while (true) {
    try {
      await pollServiceTitan(token);
    } catch (err) {
      console.log("⚠️ Token expired or error — refreshing…");
      token = await getAccessToken();
    }
    await sleep(3000); // poll every 3 seconds
  }
}

// Run the sync
main();
