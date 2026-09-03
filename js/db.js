import { clampLevel, describeAdaptive } from "./adaptive.js";

const DEFAULT_PATIENT_ID = 1;

export const SUPPORTED_LANGUAGES = ["en", "hi", "bn", "as"];

export function normalizeLanguage(lang) {
  const code = String(lang || "en").toLowerCase();
  return SUPPORTED_LANGUAGES.includes(code) ? code : "en";
}

export const GAME_TYPES = {
  pattern_matching: "pattern_matching",
  shape_sort: "shape_sort",
  face_name_recall: "face_name_recall",
  remember_my_story: "remember_my_story",
};

if (typeof Dexie === "undefined") {
  throw new Error("Dexie did not load. Serve this folder over http://, not file://.");
}

export const db = new Dexie("MemoryCareNER");

db.version(1).stores({
  patients: "++id",
  gameProgress: "++id, patientId, gameType, [patientId+gameType]",
  game_results: "++id, gameType, timestamp, sync_status",
});

db.version(2).stores({
  patients: "++id",
  gameProgress: "++id, patientId, gameType, [patientId+gameType]",
  game_results: "++id, gameType, timestamp, sync_status",
  familyMembers: "++id, patientId, relationshipKey",
});

export async function ensurePatient() {
  const existing = await db.patients.get(DEFAULT_PATIENT_ID);
  if (!existing) {
    await db.patients.put({
      id: DEFAULT_PATIENT_ID,
      language: "en",
    });
  }

  for (const gameType of Object.values(GAME_TYPES)) {
    const row = await db.gameProgress
      .where("[patientId+gameType]")
      .equals([DEFAULT_PATIENT_ID, gameType])
      .first();
    if (!row) {
      await db.gameProgress.add({
        patientId: DEFAULT_PATIENT_ID,
        gameType,
        currentLevel: 1,
        manualLevelOverride: null,
      });
    } else {
      const patch = {};
      const clampedCurrent = clampLevel(row.currentLevel);
      if (row.currentLevel !== clampedCurrent) patch.currentLevel = clampedCurrent;
      if (row.manualLevelOverride != null) {
        const clampedOverride = clampLevel(row.manualLevelOverride);
        if (row.manualLevelOverride !== clampedOverride) {
          patch.manualLevelOverride = clampedOverride;
        }
      }
      if (Object.keys(patch).length) {
        await db.gameProgress.update(row.id, patch);
      }
    }
  }

  await seedFamilyIfEmpty();
}

const DEMO_FAMILY = [
  { name: "Meena", relationshipKey: "daughter", hue: "#D85A30" },
  { name: "Rajesh", relationshipKey: "son", hue: "#C0432E" },
  { name: "Lata", relationshipKey: "sister", hue: "#8A4A32" },
  { name: "Suresh", relationshipKey: "neighbor", hue: "#3B3B3F" },
  { name: "Anita", relationshipKey: "nurse", hue: "#E28364" },
  { name: "Priya", relationshipKey: "granddaughter", hue: "#B85C38" },
  { name: "Ravi", relationshipKey: "grandson", hue: "#9C5A2C" },
  { name: "Kamal", relationshipKey: "doctor", hue: "#59595D" },
];

function placeholderPhoto(name, hue) {
  const letter = (name || "?").slice(0, 1).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="${hue}" width="400" height="400"/><text x="200" y="245" text-anchor="middle" font-size="180" fill="#FDF6EC" font-family="system-ui,sans-serif">${letter}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function seedFamilyIfEmpty() {
  const count = await db.familyMembers.where("patientId").equals(DEFAULT_PATIENT_ID).count();
  if (count > 0) return;
  for (const person of DEMO_FAMILY) {
    await db.familyMembers.add({
      patientId: DEFAULT_PATIENT_ID,
      name: person.name,
      relationshipKey: person.relationshipKey,
      photoDataUrl: placeholderPhoto(person.name, person.hue),
    });
  }
}

export async function listFamilyMembers() {
  return db.familyMembers.where("patientId").equals(DEFAULT_PATIENT_ID).toArray();
}

export async function addFamilyMember({ name, relationshipKey, photoDataUrl }) {
  return db.familyMembers.add({
    patientId: DEFAULT_PATIENT_ID,
    name: String(name || "").trim(),
    relationshipKey,
    photoDataUrl,
  });
}

export async function deleteFamilyMember(id) {
  return db.familyMembers.delete(id);
}

export async function getPatient() {
  return db.patients.get(DEFAULT_PATIENT_ID);
}

export async function isProfileComplete() {
  const patient = await getPatient();
  if (!patient) return false;
  const name = String(patient.name || "").trim();
  const phone = String(patient.phone || "").trim();
  const state = String(patient.state || "").trim();
  return Boolean(name && phone && state && normalizeLanguage(patient.language));
}

export async function savePatientProfile({ name, phone, state, language }) {
  await db.patients.update(DEFAULT_PATIENT_ID, {
    name: String(name || "").trim(),
    phone: String(phone || "").trim(),
    state: String(state || "").trim(),
    language: normalizeLanguage(language),
  });
}

export async function getLanguage() {
  const patient = await getPatient();
  return normalizeLanguage(patient?.language);
}

export async function setLanguage(language) {
  await db.patients.update(DEFAULT_PATIENT_ID, {
    language: normalizeLanguage(language),
  });
}

/**
 * logoutPatient — clears the patient's identifying fields so that
 * isProfileComplete() returns false and the app routes back to the profile
 * / login screen on the next load or on a manual call.
 *
 * Does NOT delete the patient row, the language preference, or any game
 * progress / history rows.
 */
export async function logoutPatient() {
  await db.patients.update(DEFAULT_PATIENT_ID, {
    name: "",
    phone: "",
    state: "",
  });
}

export async function getProgress(gameType) {
  return db.gameProgress
    .where("[patientId+gameType]")
    .equals([DEFAULT_PATIENT_ID, gameType])
    .first();
}

export async function getPlayLevel(gameType) {
  const progress = await getProgress(gameType);
  if (!progress) return 1;
  if (progress.manualLevelOverride != null) {
    return clampLevel(progress.manualLevelOverride);
  }
  return clampLevel(progress.currentLevel);
}

export async function saveGameResult(record) {
  return db.game_results.add({
    ...record,
    patientId: DEFAULT_PATIENT_ID,
    sync_status: "PENDING",
    timestamp: new Date().toISOString(),
  });
}

export async function applyAdaptiveAndSave(gameType, metrics) {
  let progress = await getProgress(gameType);
  if (!progress) {
    await ensurePatient();
    progress = await getProgress(gameType);
  }

  const playedLevel = clampLevel(metrics.level);
  const override = progress?.manualLevelOverride ?? null;
  const snapshot = describeAdaptive(playedLevel, metrics);
  const proposed = snapshot.nextLevel;

  console.info("[adaptive]", { gameType, override, ...snapshot });

  let storedLevel = progress ? clampLevel(progress.currentLevel) : playedLevel;
  if (override == null) {
    storedLevel = proposed;
    if (progress && progress.id != null) {
      await db.gameProgress.update(progress.id, { currentLevel: storedLevel });
    } else {
      await db.gameProgress.add({
        patientId: DEFAULT_PATIENT_ID,
        gameType,
        currentLevel: storedLevel,
        manualLevelOverride: null,
      });
    }
  } else {
    storedLevel = clampLevel(override);
  }

  await saveGameResult({
    gameType,
    game: gameType,
    level: playedLevel,
    attempts: metrics.attempts,
    mistakes: metrics.mistakes,
    accuracy_percent: String(metrics.accuracyPercent),
    avg_response_ms: metrics.avgResponseMs,
    total_time_seconds: metrics.totalTimeSeconds,
    extra: metrics.extra || null,
  });

  return { nextPlayLevel: storedLevel };
}
