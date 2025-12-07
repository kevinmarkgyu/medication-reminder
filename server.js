import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ------------------------
// Firebase Setup
// ------------------------
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY))
});
const db = admin.firestore();

// ------------------------
// Twilio Setup
// ------------------------
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const USER_PHONE = process.env.USER_PHONE;

// ------------------------
// Helper: Today in UTC+8
// ------------------------
function today() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const year = utc8.getFullYear();
  const month = String(utc8.getMonth() + 1).padStart(2, "0");
  const day = String(utc8.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`; // YYYY-MM-DD
}

// ------------------------
// WhatsApp Webhook
// ------------------------
app.post("/whatsapp-webhook", async (req, res) => {
  const msg = req.body.Body.trim().toUpperCase();
  const t = today();
  const ref = db.collection("daily_medications").doc(t);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      date: t,
      current_med: "",
      Calciumade: "N",
      Metformin: "N",
      Vissane: "N"
    });
  }

  const data = (await ref.get()).data();
  const currentMed = data.current_med;

  if (["YES", "NO"].includes(msg)) {
    if (!currentMed) {
      await client.messages.create({
        from: WHATSAPP_FROM,
        to: USER_PHONE,
        body: "No medication reminder is pending. Please wait for the next reminder."
      });
    } else {
      const value = msg === "YES" ? "Y" : "N";
        if (value === "N") {
            await client.messages.create({
                from: WHATSAPP_FROM,
                to: USER_PHONE,
                body: `${currentMed} needs to be taken right now love. Take it now please, Reply "Yes" if already done. Love you ❤️`
      });
      } else {
        await ref.update({ [currentMed]: value, current_med: "" });
        await client.messages.create({
            from: WHATSAPP_FROM,
            to: USER_PHONE,
            body: `${currentMed} updated as taken ✅, Very Good baba, Love youuuu ❤️❤️❤️`
      });
      }
    }
    return res.send("<Response></Response>");
  }

  if (msg === "STATUS") {
    const missing = [];
    ["Calciumade", "Metformin", "Vissane"].forEach(med => {
      if (data[med] === "N") missing.push(med);
    });

    const reply = missing.length === 0
      ? "You have taken all medications today baba, Very good bum, I love you so much!❤️❤️❤️"
      : "You still need to take: " + missing.join(", ") + ". Fightingg bum, love you!❤️❤️❤️";

    await client.messages.create({
      from: WHATSAPP_FROM,
      to: USER_PHONE,
      body: reply
    });

    return res.send("<Response></Response>");
  }

  res.send("<Response></Response>");
});

// ------------------------
// Test route for Calciumade reminder
// ------------------------
app.get("/test-Calciumade", async (req, res) => {
  const t = today();
  const ref = db.collection("daily_medications").doc(t);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      date: t,
      current_med: "",
      Calciumade: "N",
      Metformin: "N",
      Vissane: "N"
    });
  }

  await ref.update({ current_med: "Calciumade" });

  await client.messages.create({
    from: WHATSAPP_FROM,
    to: USER_PHONE,
    body: "Medication Reminder (Calciumade): Did you take it? Reply Yes or No."
  });

  res.send("Calciumade test reminder sent!");
});

// ------------------------
// Server Start
// ------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available at: http://localhost:${PORT}`);
});
