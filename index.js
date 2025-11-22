import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// ENVIRONMENT VARIABLES
const TENANT_ID = process.env.ST_TENANT_ID;
const CLIENT_ID = process.env.ST_CLIENT_ID;
const CLIENT_SECRET = process.env.ST_CLIENT_SECRET;
const APP_KEY = process.env.ST_APP_KEY;

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_CALENDAR_ID = process.env.GHL_CALENDAR_ID;

let lastTimestamp = new Date().toISOString();

// Sleep function
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* --------------------------------------
   SERVICE TITAN AUTH (SANDBOX)
---------------------------------------*/
async function getAccessToken() {
  const url = "https://auth-integration.servicetitan.io/connect/token";

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "openid offline_access",
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "ST-App-Key": APP_KEY,
  };

  try {
    const res = await axios.post(url, body, { headers });
    console.log("🔑 ServiceTitan sandbox token obtained");
    return res.data.access_token;
  } catch (err) {
    console.error("❌ Failed to get ST token:", err.response?.data || err);
    throw err;
  }
}

/* --------------------------------------
   POLL SERVICE TITAN FOR JOB UPDATES
---------------------------------------*/
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
    console.error("❌ Polling ST failed:", err.response?.data || err);
  }
}

/* --------------------------------------
   SEND JOB TO GHL
---------------------------------------*/
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

    console.log(`✅ Synced job ${job.id} → GHL`);
  } catch (err) {
    console.error("❌ GHL sync failed:", err.response?.data || err);
  }
}

/* --------------------------------------
   MAIN LOOP
---------------------------------------*/
async function main() {
  console.log("🚀 ServiceTitan Sandbox → GHL Sync Started");
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

main();
