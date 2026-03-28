import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/https";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/scheduler";

initializeApp();

const db = getFirestore();

export const generateConsultationResult = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const sessionId = String(request.data?.sessionId ?? "");

  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId is required.");
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const snapshot = await sessionRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Session not found.");
  }

  const session = snapshot.data();

  if (session?.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this session.");
  }

  logger.info("generateConsultationResult called", { sessionId, uid: request.auth.uid });

  return {
    ok: true,
    sessionId,
    source: "cloud",
    message: "Implement result generation pipeline here."
  };
});

export const createShareLink = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const resultId = String(request.data?.resultId ?? "");

  if (!resultId) {
    throw new HttpsError("invalid-argument", "resultId is required.");
  }

  logger.info("createShareLink called", { resultId, uid: request.auth.uid });

  return {
    ok: true,
    resultId,
    message: "Implement share token creation and persistence here."
  };
});

export const expireShareLinks = onSchedule("every 24 hours", async () => {
  const now = new Date().toISOString();
  const querySnapshot = await db
    .collection("shares")
    .where("status", "==", "active")
    .where("expiresAt", "<=", now)
    .get();

  if (querySnapshot.empty) {
    logger.info("No expired share links to update.");
    return;
  }

  const batch = db.batch();
  querySnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "expired" });
  });
  await batch.commit();

  logger.info("Expired share links updated.", { count: querySnapshot.size });
});
