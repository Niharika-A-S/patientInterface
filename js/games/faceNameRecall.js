import { el, clear, header, summaryView, levelSubtitle } from "../ui.js";
import { t } from "../i18n.js";
import { speak, speakKey } from "../voice.js";
import { applyAdaptiveAndSave, GAME_TYPES, listFamilyMembers } from "../db.js";
import { clampLevel } from "../adaptive.js";
import { buildFaceSession, choiceText } from "../content/faceNameContent.js";
import { mountFamilyPhotos } from "../familyPeople.js";

function personPhoto(person, className) {
  return el("img", {
    className,
    src: person.photoDataUrl,
    alt: person.name,
  });
}

export async function mountFaceNameRecall(root, { lang, level, onHome }) {
  const activeLevel = clampLevel(level);
  const pool = await listFamilyMembers();
  if (pool.length < 3) {
    await mountFamilyPhotos(root, {
      lang,
      onBack: onHome,
      onPlay: () => mountFaceNameRecall(root, { lang, level: activeLevel, onHome }),
    });
    return;
  }

  const session = buildFaceSession(activeLevel, pool, lang);
  const rounds = session.rounds;
  let roundIndex = 0;
  let attempts = 0;
  let correctCount = 0;
  const sessionStart = Date.now();
  const responseTimes = [];
  let roundStart = Date.now();
  let resumeLevel = activeLevel;

  function restart() {
    mountFaceNameRecall(root, { lang, level: resumeLevel, onHome });
  }

  speakRound();
  render();

  function current() {
    return rounds[roundIndex];
  }

  function speakRound() {
    const round = current();
    if (round) speakKey(lang, round.prompt.key, round.prompt.text);
  }

  function render(complete = false, summary = null) {
    clear(root);
    root.append(
      header(lang, {
        title: t(lang, "faceName"),
        subtitle: `${levelSubtitle(lang, activeLevel)} · ${roundIndex + (complete ? 0 : 1)} / ${rounds.length}`,
        onBack: onHome,
      }),
    );
    if (complete) {
      root.append(summaryView(lang, summary, { onRestart: restart, onHome }));
      return;
    }

    const round = current();
    const body = el("main", { className: "screen" },
      el("p", { className: "instruction" }, round.prompt.text),
    );

    if (round.mode === "photos") {
      const grid = el("div", { className: "face-option-grid" });
      round.choices.forEach((person) => {
        grid.append(
          el("button", {
            className: "face-option-btn",
            type: "button",
            onClick: () => handleChoice(person),
          }, personPhoto(person, "face-option-photo")),
        );
      });
      body.append(grid);
    } else {
      body.append(
        el("div", { className: "face-stage" }, personPhoto(round.target, "face-stage-photo")),
      );
      const choices = el("div", { className: "choice-col" });
      round.choices.forEach((person) => {
        choices.append(
          el("button", {
            className: "choice-btn",
            type: "button",
            onClick: () => handleChoice(person),
          }, choiceText(lang, person, activeLevel)),
        );
      });
      body.append(choices);
    }

    root.append(body);
  }

  function handleChoice(person) {
    attempts += 1;
    responseTimes.push(Date.now() - roundStart);
    if (person.id === current().target.id) {
      correctCount += 1;
      speakKey(lang, "nice", t(lang, "nice"));
    } else {
      speakKey(lang, "tryAgain", t(lang, "tryAgain"));
    }
    roundIndex += 1;
    if (roundIndex >= rounds.length) {
      finish();
      return;
    }
    roundStart = Date.now();
    speakRound();
    render();
  }

  async function finish() {
    const times = responseTimes;
    const avgResponseMs = times.length === 0 ? 0 : Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const mistakes = attempts - correctCount;
    const accuracyPercent = attempts === 0 ? 0 : Number(((correctCount / attempts) * 100).toFixed(1));
    const totalTimeSeconds = Math.round((Date.now() - sessionStart) / 1000);
    const { nextPlayLevel } = await applyAdaptiveAndSave(GAME_TYPES.face_name_recall, {
      level: activeLevel,
      attempts,
      mistakes,
      accuracyPercent,
      avgResponseMs,
      totalTimeSeconds,
    });
    resumeLevel = nextPlayLevel;
    speakKey(lang, "wellDone", t(lang, "wellDone"));
    render(true, {
      level: activeLevel,
      accuracyPercent,
      totalTimeSeconds,
      attempts,
      mistakes,
      nextPlayLevel,
    });
  }
}
