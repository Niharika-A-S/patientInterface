import { normalizeLanguage } from "./db.js";

const LANG_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  as: "as-IN",
};

const LANG_PREFIX = {
  en: "en",
  hi: "hi",
  bn: "bn",
  as: "as",
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
  const wanted = LANG_MAP[currentLang];
  const prefix = LANG_PREFIX[currentLang];
  // For English: exact match → prefix match → any English voice
  if (currentLang === "en") {
    return (
      voices.find((v) => v.lang === wanted)
      || voices.find((v) => (v.lang || "").toLowerCase().startsWith("en"))
      || null
    );
  }
  // For Hindi / Assamese: exact match → prefix match → any fallback voice.
  // We log a warning in startUtterance if we had to fall back.
  return (
    voices.find((v) => v.lang === wanted)
    || voices.find((v) => (v.lang || "").toLowerCase().startsWith(prefix))
    || voices[0] || null
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

  const voice = pickVoice();
  if (voice && currentLang !== "en") {
    const isExact = voice.lang === LANG_MAP[currentLang];
    const isPrefix = (voice.lang || "").toLowerCase().startsWith(LANG_PREFIX[currentLang] || "");
    if (!isExact && !isPrefix) {
      console.warn(`[voice] No ${LANG_MAP[currentLang]} voice found. Falling back to default voice: ${voice.name}`);
    }
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_MAP[currentLang] || "en-IN";
  utterance.rate = 0.9;
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

const BN_INTERFACE_AUDIO = {
  appTitle:             { src: "./assets/interface_voice/appTitle.mp3" },
  appTag:               { src: "./assets/interface_voice/appTag.mp3" },
  profileTitle:         { src: "./assets/interface_voice/appTitle.mp3" },
  profileSubtitle:      { src: "./assets/interface_voice/appTag.mp3" },
  english:              { src: "./assets/interface_voice/english.mp3" },
  hindi:                { src: "./assets/interface_voice/hindi.mp3" },
  bengali:              { src: "./assets/interface_voice/bengali.mp3" },
  assamese:             { src: "./assets/interface_voice/assamese.mp3" },
  repeat:               { src: "./assets/interface_voice/repeat.mp3" },
  back:                 { src: "./assets/interface_voice/back.mp3" },
  playAgain:            { src: "./assets/interface_voice/repeat.mp3" },
  home:                 { src: "./assets/interface_voice/home.mp3" },
  logout:               { src: "./assets/interface_voice/logout.mp3" },
  wellDone:             { src: "./assets/interface_voice/wellDone.mp3" },
  patternName:          { src: "./assets/interface_voice/patternName.mp3" },
  patternBlurb:         { src: "./assets/interface_voice/patternBlurb.mp3" },
  shapeName:            { src: "./assets/interface_voice/shapeName.mp3" },
  shapeBlurb:           { src: "./assets/interface_voice/shapeBlurb.mp3" },
  faceName:             { src: "./assets/interface_voice/faceName.mp3" },
  faceBlurb:            { src: "./assets/interface_voice/faceBlurb.mp3" },
  storyName:            { src: "./assets/interface_voice/storyName.mp3" },
  storyBlurb:           { src: "./assets/interface_voice/storyBlurb.mp3" },
  patternHelp:          { src: "./assets/interface_voice/patternHelp.mp3" },
  faceHelp:             { src: "./assets/interface_voice/faceHelp.mp3" },
  storyHelp:            { src: "./assets/interface_voice/storyHelp.mp3" },
  storyContinue:        { src: "./assets/interface_voice/storyContinue.mp3" },
  done:                 { src: "./assets/interface_voice/storyContinue.mp3" },
  tryAgain:             { src: "./assets/interface_voice/nice.mp3" },
  nice:                 { src: "./assets/interface_voice/nice.mp3" },
  allFound:             { src: "./assets/interface_voice/wellDone.mp3" },
  familyPhotos:         { src: "./assets/interface_voice/familyPhotos.mp3" },
  familyHelp:           { src: "./assets/interface_voice/familyHelp.mp3" },
  personName:           { src: "./assets/interface_voice/personName.mp3" },
  personPhoto:          { src: "./assets/interface_voice/personPhoto.mp3" },
  personRelation:       { src: "./assets/interface_voice/personRelation.mp3" },
  addPerson:            { src: "./assets/interface_voice/addPerson.mp3" },
  startGame:            { src: "./assets/interface_voice/startGame.mp3" },
  noPhoto:              { src: "./assets/interface_voice/noPhoto.mp3" },
  facePromptWho:        { src: "./assets/interface_voice/personPromptWho.mp3" },
  facePromptWhoRelated: { src: "./assets/interface_voice/personPromptWhoRelated.mp3" },
  facePromptRelated:    { src: "./assets/interface_voice/facePromptRelated.mp3" },
  facePromptWhich:      { src: "./assets/interface_voice/facePromptWhich.mp3" },
  rel_mother:           { src: "./assets/interface_voice/rel_mother.mp3" },
  rel_father:           { src: "./assets/interface_voice/rel_father.mp3" },
  rel_daughter:         { src: "./assets/interface_voice/rel_daughter.mp3" },
  rel_son:              { src: "./assets/interface_voice/rel_son.mp3" },
  rel_sister:           { src: "./assets/interface_voice/rel_sister.mp3" },
  rel_brother:          { src: "./assets/interface_voice/rel_brother.mp3" },
  rel_spouse:           { src: "./assets/interface_voice/rel_spouse.mp3" },
  rel_neighbor:         { src: "./assets/interface_voice/rel_neighbor.mp3" },
  rel_nurse:            { src: "./assets/interface_voice/rel_nurse.mp3" },
  rel_doctor:           { src: "./assets/interface_voice/rel_doctor.mp3" },
  rel_granddaughter:    { src: "./assets/interface_voice/rel_granddaughter.mp3" },
  rel_grandson:         { src: "./assets/interface_voice/rel_grandson.mp3" },
  rel_friend:           { src: "./assets/interface_voice/rel_friend.mp3" },
  shapeInstCircle:     { src: "./assets/interface_voice/shapeInstCircle.mp3" },
  shapeInstSquare:     { src: "./assets/interface_voice/shapeInstSquare.mp3" },
  shapeInstTriangle:   { src: "./assets/interface_voice/shapeInstTriangle.mp3" },
  shapeInstRectangle:  { src: "./assets/interface_voice/shapeInstRectangle.mp3" },
  shapeInstStar:       { src: "./assets/interface_voice/shapeInstStar.mp3" },
  shapeInstPentagon:   { src: "./assets/interface_voice/shapeInstPentagon.mp3" },
};

/**
 * BN_STORY_AUDIO — granular per-phase Bengali story audio map.
 * Each story entry contains:
 *   story  — the narration MP3 for the story text
 *   questions[n] — question audio for question index n (0-based)
 *   options[n]   — options audio for question index n (0-based, covers all 3 options at once)
 *
 * File naming: storyN/storyN.mp3, questionN.(q+1).mp3, optionN.(q+1).mp3
 * where N = story number (1-based), q = 0-based question index.
 */
const BN_STORY_AUDIO = {
  l1_s1: {
    story:     "./assets/story_voice/story1/story1.mp3",
    questions: [
      "./assets/story_voice/story1/question1.1.mp3",
      "./assets/story_voice/story1/question1.2.mp3",
      "./assets/story_voice/story1/question1.3.mp3",
    ],
    options: [
      "./assets/story_voice/story1/option1.1.mp3",
      "./assets/story_voice/story1/option1.2.mp3",
      "./assets/story_voice/story1/option1.3.mp3",
    ],
  },
  l1_s2: {
    story:     "./assets/story_voice/story2/story2.mp3",
    questions: [
      "./assets/story_voice/story2/question2.1.mp3",
      "./assets/story_voice/story2/question2.2.mp3",
      "./assets/story_voice/story2/question2.3.mp3",
    ],
    options: [
      "./assets/story_voice/story2/option2.1.mp3",
      "./assets/story_voice/story2/option2.2.mp3",
      "./assets/story_voice/story2/option2.3.mp3",
    ],
  },
  l1_s3: {
    story:     "./assets/story_voice/story3/story3.mp3",
    questions: [
      "./assets/story_voice/story3/question3.1.mp3",
      "./assets/story_voice/story3/question3.2.mp3",
      "./assets/story_voice/story3/question3.3.mp3",
    ],
    options: [
      "./assets/story_voice/story3/option3.1.mp3",
      "./assets/story_voice/story3/option3.2.mp3",
      "./assets/story_voice/story3/option3.3.mp3",
    ],
  },
  l1_s4: {
    story:     "./assets/story_voice/story4/story4.mp3",
    questions: [
      "./assets/story_voice/story4/question4.1.mp3",
      "./assets/story_voice/story4/question4.2.mp3",
      "./assets/story_voice/story4/question4.3.mp3",
    ],
    options: [
      "./assets/story_voice/story4/option4.1.mp3",
      "./assets/story_voice/story4/option4.2.mp3",
      "./assets/story_voice/story4/option4.3.mp3",
    ],
  },
};

// Assamese uses the same interface-audio key architecture as Bengali, but
// points only to the recordings bundled in the Assamese voice folder.
const AS_INTERFACE_AUDIO_FILES = [
  "appTitle",
  "appTag",
  "profileTitle",
  "profileSubtitle",
  "profileName",
  "profileState",
  "welcomeName",
  "english",
  "hindi",
  "repeat",
  "back",
  "home",
  "wellDone",
  "nice",
  "patternName",
  "patternBlurb",
  "patternHelp",
  "shapeName",
  "shapeBlurb",
  "faceBlurb",
  "faceHelp",
  "facePromptWho",
  "facePromptWhoRelated",
  "facePromptRelated",
  "facePromptWhich",
  "storyName",
  "storyBlurb",
  "storyHelp",
  "storyContinue",
  "done",
  "familyPhotos",
  "familyHelp",
  "personRelation",
  "startGame",
  "shapeInstCircle",
  "shapeInstSquare",
  "shapeInstTriangle",
  "shapeInstRectangle",
  "shapeInstStar",
  "shapeInstPentagon",
  "shapeInstDynamic",
  "rel_mother",
  "rel_father",
  "rel_daughter",
  "rel_son",
  "rel_sister",
  "rel_brother",
  "rel_spouse",
  "rel_neighbor",
  "rel_nurse",
  "rel_doctor",
  "rel_granddaughter",
  "rel_grandson",
  "rel_friend",
];

const AS_INTERFACE_AUDIO = Object.fromEntries(
  AS_INTERFACE_AUDIO_FILES.map((key) => [
    key,
    { src: `./assets/assamese_interface_voice/${key}.mp3` },
  ]),
);

// These Assamese recordings use an existing phrase for equivalent keys.
Object.assign(AS_INTERFACE_AUDIO, {
  playAgain: { src: "./assets/assamese_interface_voice/repeat.mp3" },
  tryAgain: { src: "./assets/assamese_interface_voice/nice.mp3" },
  allFound: { src: "./assets/assamese_interface_voice/wellDone.mp3" },
});

const AS_STORY_AUDIO = {
  l1_s1: {
    story: "./assets/assamese_story_voice/story1/story1.mp3",
    questions: [
      "./assets/assamese_story_voice/story1/question1.1.mp3",
      "./assets/assamese_story_voice/story1/question1.2.mp3",
      "./assets/assamese_story_voice/story1/question1.3.mp3",
    ],
    options: [
      "./assets/assamese_story_voice/story1/option1.1.mp3",
      "./assets/assamese_story_voice/story1/option1.2.mp3",
      "./assets/assamese_story_voice/story1/option1.3.mp3",
    ],
  },
  l1_s2: {
    story: "./assets/assamese_story_voice/story2/story2.mp3",
    questions: [
      "./assets/assamese_story_voice/story2/question2.1.mp3",
      "./assets/assamese_story_voice/story2/question2.2.mp3",
      "./assets/assamese_story_voice/story2/question2.3.mp3",
    ],
    options: [
      "./assets/assamese_story_voice/story2/option2.1.mp3",
      "./assets/assamese_story_voice/story2/option2.2.mp3",
      "./assets/assamese_story_voice/story2/option2.3.mp3",
    ],
  },
  l1_s3: {
    story: "./assets/assamese_story_voice/story3/story3.mp3",
    questions: [
      "./assets/assamese_story_voice/story3/question3.1.mp3",
      "./assets/assamese_story_voice/story3/question3.2.mp3",
      "./assets/assamese_story_voice/story3/question3.3.mp3",
    ],
    options: [
      "./assets/assamese_story_voice/story3/option3.1.mp3",
      "./assets/assamese_story_voice/story3/option3.2.mp3",
      "./assets/assamese_story_voice/story3/option3.3.mp3",
    ],
  },
  l1_s4: {
    story: "./assets/assamese_story_voice/story4/story4.mp3",
    questions: [
      "./assets/assamese_story_voice/story4/question4.1.mp3",
      "./assets/assamese_story_voice/story4/question4.2.mp3",
      "./assets/assamese_story_voice/story4/question4.3.mp3",
    ],
    options: [
      "./assets/assamese_story_voice/story4/option4.1.mp3",
      "./assets/assamese_story_voice/story4/option4.2.mp3",
      "./assets/assamese_story_voice/story4/option4.3.mp3",
    ],
  },
};

/**
 * speakKey — speak an interface string by its i18n key.
 * For Bengali and Assamese this uses bundled interface audio maps when one is
 * mapped; keys without a mapped MP3 use the existing Web Speech API fallback.
 *
 * @param {string} lang  - current language code
 * @param {string} key   - i18n key
 * @param {string} text  - already-translated text (displayed and spoken)
 */
export function speakKey(lang, key, text, mute = false) {
  if (lang === "bn") {
    const entry = BN_INTERFACE_AUDIO[key];
    if (entry) {
      // Pass text alongside src so lastSpokenText is set to the Bengali phrase
      // (used by the Repeat button), and the local MP3 plays for the audio.
      speak(text, entry.src, entry.startTime || 0, null, mute);
      return;
    }
    // No MP3 mapped for this key (e.g. shapeInstDynamic with a dynamic item
    // name) — fall through to speak(text) which uses bn-IN TTS synthesis.
  }
  if (lang === "as") {
    const entry = AS_INTERFACE_AUDIO[key];
    if (entry) {
      speak(text, entry.src, entry.startTime || 0, null, mute);
      return;
    }
    // No Assamese MP3 mapped for this key — use the existing fallback.
  }
  speak(text, null, 0, null, mute);
}

/**
 * speakStory — play story narration audio (the story text phase).
 * For Bengali and Assamese, plays the story's dedicated offline MP3.
 * Stories without a bundled recording use the existing Web Speech API fallback.
 *
 * @param {string} lang    - current language code
 * @param {string} storyId - story id (e.g. "l1_s1") from storyContent.js
 * @param {string} text    - translated story text (used for non-Bengali TTS)
 */
export function speakStory(lang, storyId, text, mute = false) {
  if (lang === "bn") {
    const entry = BN_STORY_AUDIO[storyId];
    if (entry) {
      speak(text, entry.story, 0, null, mute);
    } else {
      console.warn("[voice] No Bengali story audio mapped for id:", storyId);
      speak(text, null, 0, null, mute);
    }
    return;
  }
  if (lang === "as") {
    const entry = AS_STORY_AUDIO[storyId];
    if (entry) {
      speak(text, entry.story, 0, null, mute);
    } else {
      console.warn("[voice] No Assamese story audio mapped for id:", storyId);
      speak(text, null, 0, null, mute);
    }
    return;
  }
  speak(text, null, 0, null, mute);
}

/**
 * speakStoryQuestion — play the question audio for the given question index,
 * then automatically chain the options audio once the question finishes.
 * For Bengali and Assamese: plays questionN.x.mp3, then on 'ended' plays
 * optionN.x.mp3. Other languages use the existing Web Speech API fallback.
 *
 * @param {string} lang          - current language code
 * @param {string} storyId       - story id (e.g. "l1_s1")
 * @param {number} questionIndex - 0-based question index
 * @param {string} questionText  - translated question text (used for non-Bengali TTS)
 */
export function speakStoryQuestion(lang, storyId, questionIndex, questionText, mute = false) {
  if (mute) return;
  if (lang === "bn") {
    const entry = BN_STORY_AUDIO[storyId];
    if (!entry) {
      console.warn("[voice] No Bengali story audio mapped for id:", storyId);
      speak(questionText, null, 0, null, false);
      return;
    }
    const questionSrc = entry.questions[questionIndex];
    const optionsSrc  = entry.options[questionIndex];
    if (!questionSrc) {
      console.warn("[voice] No Bengali question audio for:", storyId, "q", questionIndex);
      speak(questionText, null, 0, null, false);
      return;
    }
    // Stop anything currently playing
    stopSpeak();
    const generation = ++speakGeneration;
    // Play question audio
    const qAudio = new Audio(questionSrc);
    currentAudio = qAudio;
    lastSpokenText = questionText;
    lastAudioSrc = questionSrc;
    lastAudioStartTime = 0;
    qAudio.play().catch(e => console.warn("[voice] Question audio failed:", e));
    // On question end, chain the options audio
    if (optionsSrc) {
      qAudio.addEventListener("ended", () => {
        if (speakGeneration !== generation) return; // superseded
        const oAudio = new Audio(optionsSrc);
        currentAudio = oAudio;
        lastAudioSrc = optionsSrc;
        oAudio.play().catch(e => console.warn("[voice] Options audio failed:", e));
      }, { once: true });
    }
    return;
  }
  if (lang === "as") {
    const entry = AS_STORY_AUDIO[storyId];
    if (!entry) {
      console.warn("[voice] No Assamese story audio mapped for id:", storyId);
      speak(questionText, null, 0, null, false);
      return;
    }
    const questionSrc = entry.questions[questionIndex];
    const optionsSrc = entry.options[questionIndex];
    if (!questionSrc) {
      console.warn("[voice] No Assamese question audio for:", storyId, "q", questionIndex);
      speak(questionText, null, 0, null, false);
      return;
    }
    // Stop anything currently playing
    stopSpeak();
    const generation = ++speakGeneration;
    // Play question audio
    const qAudio = new Audio(questionSrc);
    currentAudio = qAudio;
    lastSpokenText = questionText;
    lastAudioSrc = questionSrc;
    lastAudioStartTime = 0;
    qAudio.play().catch(e => console.warn("[voice] Question audio failed:", e));
    // On question end, chain the options audio
    if (optionsSrc) {
      qAudio.addEventListener("ended", () => {
        if (speakGeneration !== generation) return; // superseded
        const oAudio = new Audio(optionsSrc);
        currentAudio = oAudio;
        lastAudioSrc = optionsSrc;
        oAudio.play().catch(e => console.warn("[voice] Options audio failed:", e));
      }, { once: true });
    }
    return;
  }
  // Non-Bengali: speak question text via Web Speech API
  speak(questionText, null, 0, null, false);
}

export function speak(text, audioSrc = null, startTime = 0, stopTime = null, mute = false) {
  if (text == null && !audioSrc) return;
  const next = text != null ? String(text).trim() : "";
  if (!next && !audioSrc) return;

  lastSpokenText = next;
  lastAudioSrc = audioSrc;
  lastAudioStartTime = startTime;

  if (mute) return;

  stopSpeak();
  const generation = ++speakGeneration;

  if (currentLang === "bn" || currentLang === "as") {
    if (audioSrc) {
      const audio = new Audio(audioSrc);
      currentAudio = audio;
      if (startTime > 0) {
        audio.addEventListener("canplaythrough", () => {
          if (currentAudio !== audio) return; // superseded by a newer request
          audio.currentTime = startTime;
          audio.play().catch(e => console.warn("[voice] Audio play failed:", e));
        }, { once: true });
        audio.load();
      } else {
        audio.play().catch(e => console.warn("[voice] Audio play failed:", e));
      }
      if (stopTime != null) {
        audio.addEventListener("timeupdate", () => {
          if (currentAudio !== audio) return;
          if (audio.currentTime >= stopTime) {
            audio.pause();
            currentAudio = null;
          }
        });
      }
      return;
    }
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
