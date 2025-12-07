import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

// ----------------------
// FIREBASE SETUP
// ----------------------
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY))
});

const db = admin.firestore();

// ----------------------
// TWILIO SETUP
// ----------------------
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const USER_PHONE = process.env.USER_PHONE;

// ----------------------
// EXPRESS SETUP
// ----------------------
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Helper to get today's date
function today() {
  return new Date().toISOString().split("T")[0];
}

// Ensure today's document exists
async function initToday() {
  const t = today();
  const ref = db.collection("daily_medications").doc(t);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      date: t,
      Med1: "N",
      Med2: "N",
      Med3: "N"
    });
  }
  return ref;
}

// ----------------------
// WHATSAPP WEBHOOK
// ----------------------
app.post("/whatsapp-webhook", async (req, res) => {
  const msg = req.body.Body.trim().toUpperCase();

  const ref = await initToday();

  // YES/NO replies
  if (["YES1", "NO1", "YES2", "NO2", "YES3", "NO3"].includes(msg)) {
    const med = msg.replace(/YES|NO/, "");
    const field = `Med${med}`;
    const value = msg.startsWith("YES") ? "Y" : "N";
    await ref.update({ [field]: value });
    return res.send("<Response></Response>");
  }

  // STATUS reply
  if (msg === "STATUS") {
    const doc = await ref.get();
    const data = doc.data();

    const missing = [];

    if (data.Med1 === "N") missing.push("Med1");
    if (data.Med2 === "N") missing.push("Med2");
    if (data.Med3 === "N") missing.push("Med3");

    let reply = "";
    if (missing.length === 0) {
      reply = "You have taken all medications today!";
    } else {
      reply = "You still need to take: " + missing.join(", ");
    }

    await client.messages.create({
      from: WHATSAPP_FROM,
      to: USER_PHONE,
      body: reply
    });

    return res.send("<Response></Response>");
  }

  res.send("<Response></Response>");
});

// ----------------------
// SERVER START
// ----------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port", PORT));
