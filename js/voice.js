import { normalizeLanguage } from "./db.js";

const LANG_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  as: "as-IN",
  bn: "bn-IN",
};

const LANG_PREFIX = {
  en: "en",
  hi: "hi",
  as: "as",
  bn: "bn",
};

let currentLang = "en";
let lastSpokenText = "";
let speakGeneration = 0;
let activeUtterance = null;
let speakTimer = 0;
let resumeWatch = 0;

let currentAudio = null;

export function setVoiceLang(lang) {
  currentLang = normalizeLanguage(lang);
}

export function getVoiceLang() {
  return currentLang;
}

export function stopSpeak() {
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

function ensureResumeWatch() {
  if (resumeWatch || !("speechSynthesis" in window)) return;
  resumeWatch = window.setInterval(() => {
    try {
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      /* ignore */
    }
  }, 250);
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const wanted = LANG_MAP[currentLang] || LANG_MAP.en;
  const prefix = LANG_PREFIX[currentLang] || "en";
  return (
    voices.find((v) => v.lang === wanted)
    || voices.find((v) => (v.lang || "").toLowerCase().startsWith(prefix))
    || voices.find((v) => (v.lang || "").toLowerCase().startsWith("en"))
    || null
  );
}

function startUtterance(text, generation) {
  if (generation !== speakGeneration) return;
  if (!("speechSynthesis" in window)) return;

  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) {
    window.setTimeout(() => startUtterance(text, generation), 250);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_MAP[currentLang] || LANG_MAP.en;
  utterance.rate = 0.9;
  const voice = pickVoice();
  if (voice) utterance.voice = voice;

  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  try {
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

let lastAudioSrc = null;
let lastAudioStartTime = 0;

// ─── Nepali interface audio map ───────────────────────────────────────────────
// Keys are ordered to match the sequence of phrases in the `ne` block of
// i18n.js.  Each MP3 file covers a sequential group of those phrases.
// The startTime fields represent phrase offsets within each file and must be
// confirmed by listening to the supplied MP3s; they are set to 0 here as
// placeholders until the exact timing is measured.
//
// File 1 phrase order (from i18n.js ne block):
//   appTitle, appTag, profileTitle, profileSubtitle, profileName, profilePhone,
//   profilePhoneHint, profileState, profileLanguage, profileContinue, profileEdit,
//   selectState, welcomeName, errNameRequired, errNameShort, errPhoneRequired,
//   errPhoneInvalid, errStateRequired, errLanguageRequired, repeat, back,
//   playAgain, home
// File 2 phrase order:
//   wellDone, level, accuracy, timeTaken, attempts, mistakes, nextSession,
//   easy, medium, hard, patternName, patternBlurb, shapeName, shapeBlurb,
//   faceName, faceBlurb, storyName, storyBlurb, patternHelp, faceHelp,
//   storyHelp, storyContinue, done, tryAgain, nice, allFound
// File 3 phrase order:
//   familyPhotos, familyHelp, personName, personPhoto, personRelation,
//   addPerson, startGame, noPhoto, facePromptWho, facePromptWhoRelated,
//   facePromptRelated, facePromptWhich, rel_mother…rel_friend
const NE_INTERFACE_AUDIO = {
  // ── File 1: app intro, profile, navigation ─────────────────────────────────
  appTitle:             { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  appTag:               { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profileTitle:         { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profileSubtitle:      { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profileName:          { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profilePhone:         { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profilePhoneHint:     { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profileState:         { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profileLanguage:      { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profileContinue:      { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  profileEdit:          { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  selectState:          { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  welcomeName:          { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  errNameRequired:      { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  errNameShort:         { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  errPhoneRequired:     { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  errPhoneInvalid:      { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  errStateRequired:     { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  errLanguageRequired:  { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  repeat:               { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  back:                 { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  playAgain:            { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  home:                 { src: "./assets/interface_voice/1interfaceTranslation.mp3", startTime: 0 },
  // ── File 2: results, game names, difficulty, instructions ──────────────────
  wellDone:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  level:                { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  accuracy:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  timeTaken:            { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  attempts:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  mistakes:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  nextSession:          { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  easy:                 { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  medium:               { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  hard:                 { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  patternName:          { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  patternBlurb:         { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  shapeName:            { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  shapeBlurb:           { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  faceName:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  faceBlurb:            { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  storyName:            { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  storyBlurb:           { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  patternHelp:          { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  faceHelp:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  storyHelp:            { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  storyContinue:        { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  done:                 { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  tryAgain:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  nice:                 { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  allFound:             { src: "./assets/interface_voice/2interfaceTranslation.mp3", startTime: 0 },
  // ── File 3: family, face prompts, relationships ─────────────────────────────
  familyPhotos:         { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  familyHelp:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  personName:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  personPhoto:          { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  personRelation:       { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  addPerson:            { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  startGame:            { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  noPhoto:              { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  facePromptWho:        { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  facePromptWhoRelated: { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  facePromptRelated:    { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  facePromptWhich:      { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_mother:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_father:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_daughter:         { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_son:              { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_sister:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_brother:          { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_spouse:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_neighbor:         { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_nurse:            { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_doctor:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_granddaughter:    { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_grandson:         { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
  rel_friend:           { src: "./assets/interface_voice/3interfaceTranslation.mp3", startTime: 0 },
};

// ─── Nepali story audio map ───────────────────────────────────────────────────
// Maps story IDs (from storyContent.js) to their Nepali MP3 file and the
// startTime (in seconds) at which that story begins within the file.
//
//  l1_s1 → story1,2.mp3 starting at 0:00
//  l1_s2 → story1,2.mp3 starting at 0:29  (second story in the combined file)
//  l1_s3 → story3.mp3   starting at 0:00
//  l1_s4 → story4.mp3   starting at 0:00
const NE_STORY_AUDIO = {
  l1_s1: { src: "./assets/story_voice/story1,2.mp3", startTime: 0  },
  // story1,2.mp3 is a single file containing two stories; l1_s2 begins at 29 s
  l1_s2: { src: "./assets/story_voice/story1,2.mp3", startTime: 29 },
  l1_s3: { src: "./assets/story_voice/story3.mp3",   startTime: 0  },
  l1_s4: { src: "./assets/story_voice/story4.mp3",   startTime: 0  },
};

/**
 * speakKey — speak an interface string by its i18n key.
 * For Nepali this uses the NE_INTERFACE_AUDIO map; for other languages
 * it falls back to speak(translatedText) using Web Speech API.
 *
 * @param {string} lang  - current language code
 * @param {string} key   - i18n key
 * @param {string} text  - already-translated text (used for non-Nepali)
 */
export function speakKey(lang, key, text) {
  if (lang === "ne") {
    const entry = NE_INTERFACE_AUDIO[key];
    if (entry) {
      speak(null, entry.src, entry.startTime);
    } else {
      console.warn("[voice] No Nepali interface audio mapped for key:", key);
    }
    return;
  }
  speak(text);
}

/**
 * speakStory — play Nepali story narration by story ID.
 * For Nepali, looks up the story's MP3 and startTime in NE_STORY_AUDIO and
 * routes to speak(); for other languages, speaks the raw story text with the
 * Web Speech API as before.
 *
 * @param {string} lang    - current language code
 * @param {string} storyId - story id (e.g. "l1_s1") from storyContent.js
 * @param {string} text    - already-translated story text (used for non-Nepali)
 */
export function speakStory(lang, storyId, text) {
  if (lang === "ne") {
    const entry = NE_STORY_AUDIO[storyId];
    if (entry) {
      speak(null, entry.src, entry.startTime);
    } else {
      // Unmapped Nepali story — silently skip rather than fall through to TTS
      console.warn("[voice] No Nepali story audio mapped for id:", storyId);
    }
    return;
  }
  speak(text);
}

export function speak(text, audioSrc = null, startTime = 0) {
  if (text == null && !audioSrc) return;
  const next = text != null ? String(text).trim() : "";
  if (!next && !audioSrc) return;

  lastSpokenText = next;
  lastAudioSrc = audioSrc;
  lastAudioStartTime = startTime;

  stopSpeak();
  const generation = ++speakGeneration;

  if (currentLang === "ne") {
    if (audioSrc) {
      const audio = new Audio(audioSrc);
      currentAudio = audio;
      if (startTime > 0) {
        // Set the seek position once the browser has enough data.
        // story1,2.mp3: l1_s2 narration begins at 29 seconds into the file.
        audio.addEventListener("canplaythrough", () => {
          if (currentAudio !== audio) return; // superseded by a newer request
          audio.currentTime = startTime;
          audio.play().catch(e => console.warn("[voice] Audio play failed:", e));
        }, { once: true });
        audio.load();
      } else {
        audio.play().catch(e => console.warn("[voice] Audio play failed:", e));
      }
    } else {
      console.warn("[voice] Nepali audio requested but no MP3 mapped for text:", text);
    }
    return; // Never fall through to SpeechSynthesis for Nepali
  }

  if (!("speechSynthesis" in window)) return;

  ensureResumeWatch();

  if (speakTimer) {
    window.clearTimeout(speakTimer);
    speakTimer = 0;
  }

  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isiOS) {
    startUtterance(lastSpokenText, generation);
    return;
  }

  speakTimer = window.setTimeout(() => {
    speakTimer = 0;
    startUtterance(lastSpokenText, generation);
  }, 80);
}

export function repeatLast() {
  if (!lastSpokenText && !lastAudioSrc) return;
  speak(lastSpokenText, lastAudioSrc, lastAudioStartTime);
}
