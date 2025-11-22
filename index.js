import axios from "axios";

// Load environment variables
const TENANT_ID = process.env.ST_TENANT_ID;
const CLIENT_ID = process.env.ST_CLIENT_ID;
const CLIENT_SECRET = process.env.ST_CLIENT_SECRET;
const APP_KEY = process.env.ST_APP_KEY;

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_CALENDAR_ID = process.env.GHL_CALENDAR_ID;

let lastTimestamp = new Date().toISOString();

// Helper to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --------------------
// GET ACCESS TOKEN
// --------------------
async function getAccessToken() {
  const url = `https://auth.servicetitan.io/connect/token`;

  const data = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "openid offline_access"
  });

  const response = await axios.post(url, data, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  return response.data.access_token;
}

// --------------------
// POLL SERVICE TITAN
// --------------------
async function pollServiceTitan(token) {
  const url = `https://api.servicetitan.io/crm/v2/tenant/${TENANT_ID}/jobs?modifiedOnStart=${lastTimestamp}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "ST-App-Key": APP_KEY
    }
  });

  const jobs = response.data.data || [];

  if (jobs.length > 0) {
    console.log(`Found ${jobs.length} updated jobs`);

    for (const job of jobs) {
      await sendToGHL(job);
    }

    lastTimestamp = new Date().toISOString();
  }
}

// --------------------
// SEND JOB TO GHL
// --------------------
async function sendToGHL(job) {
  const url = `https://rest.gohighlevel.com/v1/appointments/`;

  const data = {
    calendarId: GHL_CALENDAR_ID,
    title: `Job #${job.id} - ${job.customer?.name ?? "Unknown"}`,
    startTime: job.start,
    endTime: job.end,
    name: job.customer?.name ?? "No Name",
    email: job.customer?.email ?? "",
    phone: job.customer?.phone ?? ""
  };

  try {
    await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`Synced job ${job.id} → GHL`);
  } catch (err) {
    console.error("GHL Sync Failed:", err.response?.data || err);
  }
}

// --------------------
// MAIN LOOP
// --------------------
async function main() {
  console.log("🚀 ServiceTitan → GHL Poller Started");
  let token = await getAccessToken();

  while (true) {
    try {
      await pollServiceTitan(token);
    } catch (err) {
      console.error("Error polling:", err);
      token = await getAccessToken(); // refresh token if needed
    }

    await sleep(3000); // 3 seconds
  }
}

main();
