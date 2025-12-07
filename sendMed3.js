import twilio from "twilio";
import dotenv from "dotenv";
import admin from "firebase-admin";
dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY))
});
const db = admin.firestore();

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const USER_PHONE = process.env.USER_PHONE;

function today() {
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = utc8.getFullYear();
  const month = String(utc8.getMonth() + 1).padStart(2, "0");
  const day = String(utc8.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function sendMed3() {
  const t = today();
  const ref = db.collection("daily_medications").doc(t);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      date: t,
      current_med: "",
      Med1: "N",
      Med2: "N",
      Med3: "N"
    });
  }

  await ref.update({ current_med: "Med3" });

  await client.messages.create({
    from: WHATSAPP_FROM,
    to: USER_PHONE,
    body: "Medication Reminder (Med3): Did you take it? Reply Yes or No."
  });

  console.log("Med3 reminder sent!");
}

sendMed3();
