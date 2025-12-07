import twilio from "twilio";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY))
});
const db = admin.firestore();

// Twilio setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const USER_PHONE = process.env.USER_PHONE;

// Correct today() function in UTC+8
function todayUTC8() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000); // shift to UTC+8

  const year = utc8.getUTCFullYear();
  const month = String(utc8.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc8.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Generic function to send a medication reminder
async function sendMed(medName) {
  if (!medName) {
    throw new Error("medName is required to send a reminder.");
  }

  const t = todayUTC8();
  const ref = db.collection("daily_medications").doc(t);
  const doc = await ref.get();

  await ref.set(
    {
      date: t,
      current_med: medName,
      Calciumade: doc.exists ? doc.data().Calciumade : "N",
      Metformin: doc.exists ? doc.data().Metformin : "N",
      Vissane: doc.exists ? doc.data().Vissane : "N"
    },
    { merge: true }
  );

  await client.messages.create({
    from: WHATSAPP_FROM,
    to: USER_PHONE,
    body: `Hi baba, Gentle Medication Reminder (${medName}): Did you take it bum? Reply Yes or No. Love youuu ❤️❤️❤️`
  });

  console.log(`${medName} reminder sent for ${t}!`);
}

sendMed("Calciumade"); // Make sure to pass the correct string
