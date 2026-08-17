// This file was empty in the original repo, despite `firebase-admin` being
// a listed dependency. If you're not actually using Firebase (push
// notifications via FCM, etc.), delete this file and remove `firebase-admin`
// from package.json — no point carrying a large unused SDK.
//
// If you ARE using it, this initializes it from env vars rather than a
// checked-in service-account JSON file (which should never be committed).
// Add these to your .env and to config.js's schema:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY   (paste the key as one line; the \n escapes below
//                           un-escape it back into a real PEM key)
const admin = require("firebase-admin");
const logger = require("./logger");

let firebaseApp = null;

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
  process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  logger.info("Firebase Admin initialized.");
} else {
  // Don't crash app boot over optional infra — just log that it's off.
  logger.warn(
    "Firebase Admin not initialized — FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY not set."
  );
}

module.exports = firebaseApp;
