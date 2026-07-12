import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, remove, update, onValue } from "firebase/database";

dotenv.config();

const DATA_FILE = path.join(process.cwd(), "crm_data_store.json");

// Lazy Firebase Realtime Database initializer
let firebaseApp: any = null;
let firebaseDatabase: any = null;
let isFirebaseInitialized = false;

function getFirebaseDB() {
  if (!isFirebaseInitialized) {
    try {
      let config: any = {
        projectId: "bold-mix-jfs6l",
        appId: "remixed-app-id",
        apiKey: "remixed-api-key",
        authDomain: "remixed-auth-domain",
        storageBucket: "remixed-storage-bucket",
      };

      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        try {
          const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          config = { ...config, ...fileConfig };
          console.log("[Firebase RTDB] Dynamically loaded config. Project:", config.projectId);
        } catch (e) {
          console.error("[Firebase RTDB] Failed parsing firebase-applet-config.json, falling back:", e);
        }
      }
      
      const dbUrl = config.databaseURL;
      if (!dbUrl) {
        throw new Error("Missing databaseURL in Firebase configuration");
      }
      config.databaseURL = dbUrl;

      firebaseApp = initializeApp(config);
      firebaseDatabase = getDatabase(firebaseApp, dbUrl);
      isFirebaseInitialized = true;
      console.log("[Firebase RTDB] Client successfully initialized with database URL:", dbUrl);
    } catch (err) {
      console.warn("[Firebase RTDB] Failed to initialize Firebase client, using local file backup:", err);
      isFirebaseInitialized = true;
      firebaseDatabase = null;
    }
  }
  return firebaseDatabase;
}

const TABLES = ["staff", "enquiries", "services", "demos", "followups", "activities", "installations", "categories"];

function getItemTime(item: any): number {
  const timeStr = item.createdAt || item.loggedAt || item.timestamp || item.scheduledDate || "";
  if (timeStr) {
    const parsed = Date.parse(timeStr);
    if (!isNaN(parsed)) return parsed;
  }
  if (item.id) {
    const match = item.id.match(/\d+$/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }
  return 0;
}

// Global in-memory cache to make reads lightning-fast and real-time synchronized
let serverCache: any = null;
let activeListeners: any[] = [];
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 60000; // 60 seconds (optimized to heavily reduce reads)

function initServerCache() {
  if (!serverCache) {
    serverCache = readDB();
  }
}

// Function to setup real-time Firebase Realtime Database reference listeners
function setupRealtimeListeners(broadcastSyncEvent: (payload: any) => void) {
  const db = getFirebaseDB();
  if (!db) {
    console.warn("[Firebase RTDB] Cannot setup real-time listeners: Database is not available.");
    return;
  }

  console.log("[Firebase RTDB] Setting up real-time onValue listeners for paths...");
  
  // Clear any existing active listeners just in case
  activeListeners.forEach(unsubscribe => {
    try { unsubscribe(); } catch(e) {}
  });
  activeListeners = [];

  TABLES.forEach((table) => {
    try {
      const tableRef = ref(db, table);
      const unsubscribe = onValue(
        tableRef,
        (snapshot) => {
          const val = snapshot.val();
          const items: any[] = [];
          if (val) {
            Object.entries(val).forEach(([id, item]: [string, any]) => {
              items.push({ id, ...item });
            });
          }

          // Sort items so newer items are first
          items.sort((a, b) => getItemTime(b) - getItemTime(a));

          // Initialize cache if needed
          initServerCache();

          // Update server memory cache
          serverCache[table] = items;

          // Also keep local JSON file backup in sync so it matches the state
          writeDB(serverCache);

          console.log(`[Firebase RTDB Realtime] Received update for table "${table}". Document count: ${items.length}`);

          // Broadcast to SSE clients instantly
          broadcastSyncEvent({ type: "update", table, source: "rtdb-onValue" });
        },
        (error) => {
          console.log(`[Firebase RTDB Realtime] Realtime streaming disabled or unauthorized for "${table}":`, error);
        }
      );
      activeListeners.push(unsubscribe);
    } catch (err) {
      console.log(`[Firebase RTDB Realtime] Failed to initialize onValue for table "${table}":`, err);
    }
  });
}

// Read helper from Realtime Database with local backup fallback
async function readDBAsync(forceRefresh = false) {
  initServerCache();
  
  const db = getFirebaseDB();
  if (!db) {
    console.log("[Firebase RTDB] Falling back to reading from local JSON file...");
    return serverCache;
  }

  const now = Date.now();
  if (forceRefresh || now - lastCacheFetchTime > CACHE_TTL_MS || !serverCache.staff || serverCache.staff.length === 0) {
    try {
      console.log("[Firebase RTDB] Fetching fresh data from Firebase Realtime Database...");
      const freshCache: any = { ...serverCache };
      
      for (const table of TABLES) {
        try {
          const snapshot = await get(ref(db, table));
          const val = snapshot.val();
          const items: any[] = [];
          if (val) {
            Object.entries(val).forEach(([id, item]: [string, any]) => {
              items.push({ id, ...item });
            });
          }
          
          // Sort items so newer items are first
          items.sort((a, b) => getItemTime(b) - getItemTime(a));
          freshCache[table] = items;
        } catch (err: any) {
          console.log(`[Firebase RTDB] Fetch table "${table}" status (local cache active):`, err.message || err);
          if (!freshCache[table]) {
            const local = readDB();
            freshCache[table] = local[table] || [];
          }
        }
      }
      
      serverCache = freshCache;
      lastCacheFetchTime = now;
      writeDB(serverCache);
    } catch (err) {
      console.log("[Firebase RTDB] Failed to refresh server cache from Database:", err);
    }
  }

  // If staff is empty in the current serverCache, trigger seeding
  if (!serverCache.staff || serverCache.staff.length === 0) {
    try {
      console.log("[Firebase RTDB] Seeding initial staff...");
      const initial = getInitialDB();
      const updates: any = {};
      for (const member of initial.staff) {
        updates[`staff/${member.id}`] = member;
      }
      await update(ref(db), updates);
      serverCache.staff = initial.staff;
      writeDB(serverCache);
    } catch (err) {
      console.error("[Firebase RTDB] Seeding staff failed:", err);
    }
  }

  return serverCache;
}

// Write helper to Realtime Database for specific table/document with backup
async function writeDocAsync(table: string, id: string, docData: any) {
  const db = getFirebaseDB();
  
  // Always update local backup
  try {
    const dbData = readDB();
    if (dbData[table]) {
      const idx = dbData[table].findIndex((item: any) => item.id === id);
      if (idx !== -1) {
        dbData[table][idx] = { ...dbData[table][idx], ...docData };
      } else {
        dbData[table].unshift({ id, ...docData });
      }
      writeDB(dbData);
    }
  } catch (err) {
    console.error("[Backup] Error writing backup local data:", err);
  }

  // Update in-memory server cache immediately
  try {
    initServerCache();
    if (serverCache[table]) {
      const idx = serverCache[table].findIndex((item: any) => item.id === id);
      if (idx !== -1) {
        serverCache[table][idx] = { ...serverCache[table][idx], ...docData };
      } else {
        serverCache[table].unshift({ id, ...docData });
      }
    }
  } catch (err) {
    console.error("[Cache] Error updating serverCache on write:", err);
  }

  if (db) {
    try {
      // Remove id from document data before writing to prevent duplicate fields
      const { id: _, ...rest } = docData;
      await set(ref(db, `${table}/${id}`), rest);
      console.log(`[Firebase RTDB] Successfully wrote record ${id} to path ${table}/${id}`);
    } catch (err: any) {
      console.error(`[Firebase RTDB] Error writing record ${id} to ${table}:`, err);
    }
  }
}

// Delete helper from Realtime Database for specific table/document with backup and cascade delete
async function deleteDocAsync(table: string, id: string) {
  const db = getFirebaseDB();

  // Always update local backup
  try {
    const dbData = readDB();
    if (dbData[table]) {
      dbData[table] = dbData[table].filter((item: any) => item.id !== id);
      if (table === "enquiries") {
        dbData.services = dbData.services.filter((item: any) => item.enquiryId !== id);
        dbData.demos = dbData.demos.filter((item: any) => item.enquiryId !== id);
        dbData.followups = dbData.followups.filter((item: any) => item.enquiryId !== id);
        if (dbData.installations) {
          dbData.installations = dbData.installations.filter((item: any) => item.enquiryId !== id);
        }
      }
      writeDB(dbData);
    }
  } catch (err) {
    console.error("[Backup] Error writing backup local deletion:", err);
  }

  // Update in-memory server cache immediately
  try {
    initServerCache();
    if (serverCache[table]) {
      serverCache[table] = serverCache[table].filter((item: any) => item.id !== id);
      if (table === "enquiries") {
        if (serverCache.services) {
          serverCache.services = serverCache.services.filter((item: any) => item.enquiryId !== id);
        }
        if (serverCache.demos) {
          serverCache.demos = serverCache.demos.filter((item: any) => item.enquiryId !== id);
        }
        if (serverCache.followups) {
          serverCache.followups = serverCache.followups.filter((item: any) => item.enquiryId !== id);
        }
        if (serverCache.installations) {
          serverCache.installations = serverCache.installations.filter((item: any) => item.enquiryId !== id);
        }
      }
    }
  } catch (err) {
    console.error("[Cache] Error updating serverCache on delete:", err);
  }

  if (db) {
    try {
      await remove(ref(db, `${table}/${id}`));
      console.log(`[Firebase RTDB] Successfully deleted record ${id} from path ${table}/${id}`);
      
      // Cascade delete on enquiries
      if (table === "enquiries") {
        const tablesToCascade = ["services", "demos", "followups", "installations"];
        for (const subTable of tablesToCascade) {
          const snapshot = await get(ref(db, subTable));
          const val = snapshot.val();
          if (val) {
            const updates: any = {};
            Object.entries(val).forEach(([subId, item]: [string, any]) => {
              if (item.enquiryId === id) {
                updates[`${subTable}/${subId}`] = null;
              }
            });
            if (Object.keys(updates).length > 0) {
              await update(ref(db), updates);
              console.log(`[Firebase RTDB] Cascade deleted items in ${subTable} for enquiryId ${id}`);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(`[Firebase RTDB] Error deleting record ${id} from ${table}:`, err);
    }
  }
}

// Bulk import helper to Realtime Database with backup
async function importDBAsync(data: any) {
  const db = getFirebaseDB();
  
  // Always update local backup
  writeDB(data);

  if (db) {
    try {
      console.log("[Firebase RTDB] Performing bulk database import...");
      const updates: any = {};
      
      // Clear all tables first
      TABLES.forEach(table => {
        updates[table] = null;
      });
      await update(ref(db), updates);

      const importUpdates: any = {};
      for (const table of TABLES) {
        if (data[table] && Array.isArray(data[table])) {
          data[table].forEach((item: any) => {
            if (item && item.id) {
              const { id, ...rest } = item;
              importUpdates[`${table}/${id}`] = rest;
            }
          });
        }
      }
      
      if (Object.keys(importUpdates).length > 0) {
        await update(ref(db), importUpdates);
      }
      console.log("[Firebase RTDB] Bulk database import completed successfully");
    } catch (err) {
      console.error("[Firebase RTDB] Error performing bulk import to Database:", err);
    }
  }
}

// Factory reset helper with backup
async function resetDBAsync() {
  const db = getFirebaseDB();
  
  // Always update local backup
  const initial = getInitialDB();
  writeDB(initial);

  if (db) {
    try {
      console.log("[Firebase RTDB] Resetting Database...");
      const updates: any = {};
      TABLES.forEach(table => {
        updates[table] = null;
      });
      await update(ref(db), updates);

      const seedUpdates: any = {};
      for (const member of initial.staff) {
        seedUpdates[`staff/${member.id}`] = member;
      }
      for (const cat of initial.categories) {
        seedUpdates[`categories/${cat.id}`] = cat;
      }
      
      await update(ref(db), seedUpdates);
      console.log("[Firebase RTDB] Database reset completed successfully");
    } catch (err) {
      console.error("[Firebase RTDB] Error resetting Database:", err);
    }
  }
}

// Default initial database seed matching client defaults
function getInitialDB() {
  return {
    staff: [
      {
        id: 'staff-1',
        name: 'Prabhakar Choubey',
        email: 'choubey910@gmail.com',
        role: 'Admin',
        status: 'Active',
        createdAt: '2026-06-15T09:00:00Z',
        permissions: {
          canAddEnquiry: true,
          canEditEnquiry: true,
          canDeleteEnquiry: true,
          canManageServices: true,
          canManageDemos: true,
          canManageFollowUps: true,
          canViewReports: true,
          canExportCSV: true
        }
      },
      {
        id: 'staff-2',
        name: 'Staff',
        email: 'staff@paradise.com',
        role: 'Staff',
        status: 'Active',
        createdAt: '2026-06-16T10:30:00Z',
        permissions: {
          canAddEnquiry: true,
          canEditEnquiry: true,
          canDeleteEnquiry: false,
          canManageServices: true,
          canManageDemos: true,
          canManageFollowUps: true,
          canViewReports: true,
          canExportCSV: false
        }
      },
      {
        id: 'staff-3',
        name: 'Rohit Verma',
        email: 'rohit@paradise.com',
        role: 'Staff',
        status: 'Active',
        createdAt: '2026-06-18T14:15:00Z',
        permissions: {
          canAddEnquiry: true,
          canEditEnquiry: false,
          canDeleteEnquiry: false,
          canManageServices: false,
          canManageDemos: true,
          canManageFollowUps: true,
          canViewReports: false,
          canExportCSV: false
        }
      }
    ],
    enquiries: [],
    services: [],
    demos: [],
    followups: [],
    activities: [],
    installations: [],
    categories: [
      "AC", "Air Fryer", "Almirah", "Battery", "Blower", "Book Cabinet", "CCTV", "Chair", "Chimney", "Clock",
      "Cooker", "Cooktop", "Cooler", "Deep Freezer", "Desktop", "Dining Table", "Fan", "Fridge", "Geyser", "Heater",
      "Home Theater", "Induction", "Inverter", "Iron", "JMG", "Juicer", "Kettle", "Laptop", "LED", "Mattress",
      "Microwave", "Mixer Grinder", "Mobile", "Oil Filled Heater", "Other", "Pillow", "Printer", "RO System", "Sandwich Maker", "Shoe Cabinet",
      "Stabilizer", "Stool", "Tea Table", "Toaster", "Trolley", "Vacuum Cleaner", "Visi Cooler", "Washing Machine", "Water Purifier", "Wrist Watch"
    ].map((name, index) => ({
      id: `cat-${index + 1}`,
      name,
      createdAt: '2026-06-15T09:00:00Z'
    }))
  };
}

// Thread-safe-ish robust read helper
function readDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    if (!content || !content.trim()) {
      const initial = getInitialDB();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading server-side JSON database file, returning defaults:", err);
    const initial = getInitialDB();
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
    } catch (_) {}
    return initial;
  }
}

// Write helper
function writeDB(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing server-side JSON database file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Real-time Event Stream for live multi-device syncing
  let sseClients: express.Response[] = [];

  // Send periodic heartbeat pings (every 25s) to prevent proxies/load balancers (e.g. Cloud Run) from dropping the idle stream
  const sseHeartbeatInterval = setInterval(() => {
    sseClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
      } catch (err) {
        // Safe to ignore - will be cleaned up on close
      }
    });
  }, 25000);

  app.get("/api/db/sync-events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: "handshake", status: "connected" })}\n\n`);

    sseClients.push(res);

    req.on("close", () => {
      sseClients = sseClients.filter((client) => client !== res);
    });
  });

  const broadcastSyncEvent = (payload: any) => {
    sseClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (err) {
        console.error("[SSE] Error broadcasting to client:", err);
      }
    });
  };

  // Initialize real-time Database listeners on server startup
  setupRealtimeListeners(broadcastSyncEvent);

  // Security check helper to authenticate staff member via request headers
  async function validateUserRequest(req: any, allowedRoles?: string[]): Promise<{ authorized: boolean; error?: string }> {
    const userEmail = req.headers["x-user-email"];
    const userRole = req.headers["x-user-role"];

    // Ensure serverCache is fully initialized first
    try {
      await readDBAsync();
    } catch (err) {
      console.error("[Security] Error initializing server cache during verification:", err);
    }

    const staffList = (serverCache && serverCache["staff"]) || [];

    // If there are zero registered staff in the database, allow the request to bypass
    // to facilitate initial seeding / factory recovery
    if (staffList.length === 0) {
      return { authorized: true };
    }

    if (!userEmail) {
      return { authorized: false, error: "Access Denied: Unauthenticated. Authentication headers are missing." };
    }

    // Verify user is in registered active staff list
    const staff = staffList.find((s: any) => s.email && s.email.toLowerCase() === (userEmail as string).toLowerCase());
    if (!staff) {
      return { authorized: false, error: `Access Denied: "${userEmail}" is not a registered staff account.` };
    }

    if (staff.status === "Inactive") {
      return { authorized: false, error: "Access Denied: Your staff account has been deactivated." };
    }

    // Role-based privilege validation
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(staff.role)) {
        return { authorized: false, error: `Access Denied: Only users with roles [${allowedRoles.join(", ")}] are permitted to perform this action.` };
      }
    }

    return { authorized: true };
  }

  // API Route to fetch the complete server-side database
  app.get("/api/db/data", async (req, res) => {
    try {
      const auth = await validateUserRequest(req);
      if (!auth.authorized) {
        return res.status(403).json({ error: auth.error });
      }
      const data = await readDBAsync();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Route to update the server-side database
  app.post("/api/db/update", async (req, res) => {
    const { action, table, id, data } = req.body;
    try {
      // Admin privilege enforcement for sensitive operations
      let allowedRoles: string[] | undefined = undefined;
      if (action === "reset" || action === "import" || (action === "delete" && table === "enquiries")) {
        allowedRoles = ["Admin"];
      }

      const auth = await validateUserRequest(req, allowedRoles);
      if (!auth.authorized) {
        return res.status(403).json({ error: auth.error });
      }

      if (action === "reset") {
        await resetDBAsync();
        console.log("[Server DB] Database factory reset complete.");
        broadcastSyncEvent({ type: "reset" });
        const freshData = await readDBAsync(true);
        return res.json({ success: true, data: freshData });
      }

      if (action === "import") {
        if (data) {
          await importDBAsync(data);
          console.log("[Server DB] Database restore completed.");
          broadcastSyncEvent({ type: "import" });
          const freshData = await readDBAsync(true);
          return res.json({ success: true, data: freshData });
        }
        return res.status(400).json({ error: "No import payload provided" });
      }

      if (!table || !TABLES.includes(table)) {
        return res.status(400).json({ error: `Invalid table specified: ${table}` });
      }

      if (action === "add") {
        const recordId = data.id || `${table}-${Date.now()}`;
        const recordData = { ...data, id: recordId };
        await writeDocAsync(table, recordId, recordData);
        broadcastSyncEvent({ type: "update", table, action, id: recordId });
        return res.json({ success: true, data: serverCache[table] });
      }

      if (action === "update") {
        if (!id) {
          return res.status(400).json({ error: "Missing document id for update" });
        }
        await writeDocAsync(table, id, data);
        broadcastSyncEvent({ type: "update", table, action, id });
        return res.json({ success: true, data: serverCache[table] });
      }

      if (action === "delete") {
        if (!id) {
          return res.status(400).json({ error: "Missing document id for deletion" });
        }
        await deleteDocAsync(table, id);
        broadcastSyncEvent({ type: "update", table, action, id });
        return res.json({ success: true, data: serverCache[table] });
      }

      return res.status(400).json({ error: `Invalid action specified: ${action}` });
    } catch (err: any) {
      console.error("[Server DB] Error updating database:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route to check SMTP Configuration status
  app.get("/api/smtp-status", (req, res) => {
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = process.env.SMTP_PORT || "587";
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASS || "";

    const isConfigured = !!(smtpUser.trim() && smtpPass.trim());
    
    // Mask the SMTP user for security
    let maskedUser = "Not Configured";
    if (smtpUser) {
      const parts = smtpUser.split("@");
      if (parts.length === 2) {
        const name = parts[0];
        const domain = parts[1];
        maskedUser = name.substring(0, Math.min(3, name.length)) + "***@" + domain;
      } else {
        maskedUser = smtpUser.substring(0, Math.min(3, smtpUser.length)) + "***";
      }
    }

    res.json({
      configured: isConfigured,
      host: smtpHost,
      port: smtpPort,
      user: maskedUser,
      hasPass: !!smtpPass.trim()
    });
  });

  // API Route for sending OTP
  app.post("/api/send-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    // We always send/simulate emails to Choubey910@gmail.com
    const targetEmail = "Choubey910@gmail.com";

    console.log(`[OTP] Generated OTP ${otp} for login email ${email}. Target delivery: ${targetEmail}`);

    let smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    if (smtpHost.includes("://")) {
      smtpHost = smtpHost.split("://")[1];
    }
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.log("[OTP] SMTP credentials (SMTP_USER / SMTP_PASS) not set in .env. Falling back to simulated delivery.");
      return res.json({
        success: true,
        simulated: true,
        message: `OTP simulated successfully. It has been directed to ${targetEmail}.`,
        diagnostic: "SMTP credentials (SMTP_USER or SMTP_PASS) are missing in server environment secrets. Please set them in the AI Studio Settings panel."
      });
    }

    try {
      let transporter;
      
      // Smart auto-configuration for standard services (like Gmail)
      if (smtpHost.toLowerCase().includes("gmail.com") || smtpHost.toLowerCase() === "gmail") {
        console.log("[OTP] Utilizing dedicated Google Gmail Transport Service...");
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      } else {
        console.log(`[OTP] Utilizing Custom SMTP Transport: ${smtpHost}:${smtpPort}...`);
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false
          }
        } as any);
      }

      const mailOptions = {
        from: `"Paradise Group CRM" <${smtpUser}>`,
        to: targetEmail,
        subject: `[OTP] Paradise Group CRM Authentication Code: ${otp}`,
        text: `Hello,

Your 6-digit Paradise Group CRM login verification code is: ${otp}

This code is valid for 10 minutes. If you did not request this code, please ignore this email.

Best regards,
Paradise Group System`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #1d4ed8; font-family: sans-serif; margin-bottom: 5px;">PARADISE GROUP CRM</h2>
            <p style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-top: 0; letter-spacing: 0.5px;">Security Verification</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">Hello,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your 6-digit login verification security code is:</p>
            <div style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 6px; padding: 18px; background: #f8fafc; text-align: center; color: #0f172a; margin: 22px 0; border-radius: 12px; border: 1px solid #e2e8f0;">
              ${otp}
            </div>
            <p style="font-size: 13px; color: #475569; line-height: 1.5;">
              This code is valid for 10 minutes. If you did not initiate this login request, please verify security configurations.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              Sent to authorized recipient <strong>Choubey910@gmail.com</strong>.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[OTP] Real email sent successfully to ${targetEmail}`);
      return res.json({
        success: true,
        simulated: false,
        message: `OTP email successfully dispatched to ${targetEmail}`
      });
    } catch (err: any) {
      console.error("[OTP] Failed to send real email via SMTP:", err.message);
      return res.json({
        success: true,
        simulated: true,
        error: err.message,
        message: `SMTP delivery failed: ${err.message}. Simulated OTP fallback activated.`,
        diagnostic: `SMTP host responded with error: "${err.message}". Please verify your credentials or SMTP configuration. If using Gmail, make sure you use an 'App Password' instead of your main password.`
      });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Paradise Group CRM running on port ${PORT}`);
  });
}

startServer();
