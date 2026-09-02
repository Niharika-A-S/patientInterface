import { el, clear, header, levelSubtitle } from "./ui.js";
import { t, tf } from "./i18n.js";
import { speak, speakKey, setVoiceLang } from "./voice.js";
import {
  ensurePatient,
  getLanguage,
  getPatient,
  getPlayLevel,
  isProfileComplete,
  logoutPatient,
  GAME_TYPES,
  setLanguage,
  SUPPORTED_LANGUAGES,
} from "./db.js";
import { mountPatternMatching } from "./games/patternMatching.js";
import { mountShapeSort } from "./games/shapeSort.js";
import { mountFaceNameRecall } from "./games/faceNameRecall.js";
import { mountRememberMyStory } from "./games/rememberMyStory.js";
import { mountFamilyPhotos } from "./familyPeople.js";
import { mountProfile } from "./profile.js";

const GAMES = [
  { id: GAME_TYPES.pattern_matching, nameKey: "patternName", blurbKey: "patternBlurb", mount: mountPatternMatching },
  { id: GAME_TYPES.shape_sort, nameKey: "shapeName", blurbKey: "shapeBlurb", mount: mountShapeSort },
  { id: GAME_TYPES.face_name_recall, nameKey: "faceName", blurbKey: "faceBlurb", mount: mountFaceNameRecall },
  { id: GAME_TYPES.remember_my_story, nameKey: "storyName", blurbKey: "storyBlurb", mount: mountRememberMyStory },
];

let homeIntroSpoken = false;

export async function startApp(root) {
  await ensurePatient();
  if (await isProfileComplete()) {
    await showHome(root);
    return;
  }
  await mountProfile(root, { onComplete: () => showHome(root) });
}

const LANGUAGE_KEYS = {
  en: "english",
  hi: "hindi",
  as: "assamese",
  ne: "nepali",
};

async function showHome(root) {
  const lang = await getLanguage();
  const patient = await getPatient();
  setVoiceLang(lang);
  if (!homeIntroSpoken) {
    speakKey(lang, "appTag", t(lang, "appTag"));
    homeIntroSpoken = true;
  }

  clear(root);
  root.append(
    header(lang, {
      title: t(lang, "appTitle"),
      subtitle: patient?.name
        ? tf(lang, "welcomeName", { name: patient.name })
        : t(lang, "appTag"),
    }),
  );

  const langSelector = el("div", { className: "lang-selector", style: { marginBottom: "16px" } },
    el("div", { style: { textAlign: "center", marginBottom: "8px", background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", color: "#D85A30", fontWeight: "bold" } },
      "🌐 Change language / Language"
    ),
    el("div", { style: { display: "flex", gap: "8px" } },
      ...SUPPORTED_LANGUAGES.map((code) =>
        el("button", {
          className: `btn ${lang === code ? "" : "btn-light"}`,
          type: "button",
          style: { flex: "1" },
          onClick: async () => {
            await setLanguage(code);
            showHome(root);
          },
        }, t(lang, LANGUAGE_KEYS[code]))
      )
    )
  );

  const grid = el("div", { className: "home-grid" });
  for (const game of GAMES) {
    const level = await getPlayLevel(game.id);
    grid.append(
      el("button", {
        className: "game-card",
        type: "button",
        onClick: () => openGame(root, game),
      },
        el("strong", {}, t(lang, game.nameKey)),
        el("span", {}, t(lang, game.blurbKey)),
        el("span", { style: { display: "block", marginTop: "8px", color: "#59595D" } }, levelSubtitle(lang, level)),
      ),
    );
  }

  root.append(el("main", { className: "screen" }, langSelector, grid,
    el("button", {
      className: "btn",
      type: "button",
      style: { width: "100%", marginTop: "18px" },
      onClick: () => mountFamilyPhotos(root, { lang, onBack: () => showHome(root) }),
    }, t(lang, "familyPhotos")),
    el("button", {
      className: "btn btn-light profile-edit-btn",
      type: "button",
      style: { width: "100%", marginTop: "12px" },
      onClick: () => mountProfile(root, {
        allowSkipBack: true,
        onBack: () => showHome(root),
        onComplete: () => showHome(root),
      }),
    }, t(lang, "profileEdit")),
    el("button", {
      className: "btn btn-light",
      type: "button",
      style: { width: "100%", marginTop: "8px" },
      onClick: async () => {
        await logoutPatient();
        homeIntroSpoken = false;
        await mountProfile(root, { onComplete: () => showHome(root) });
      },
    }, t(lang, "logout")),
  ));
}

async function openGame(root, game) {
  const lang = await getLanguage();
  setVoiceLang(lang);
  const level = await getPlayLevel(game.id);
  game.mount(root, {
    lang,
    level,
    onHome: () => showHome(root),
  });
}
