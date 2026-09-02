import { el, clear, header, summaryView, levelSubtitle } from "../ui.js";
import { t, tf } from "../i18n.js";
import { speak, speakStory, setVoiceLang } from "../voice.js";
import { applyAdaptiveAndSave, GAME_TYPES } from "../db.js";
import { clampLevel } from "../adaptive.js";
import storyContent from "../content/storyContent.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickStory(level, lang = "en") {
  const poolSet = storyContent[lang] || storyContent.en;
  const pool = poolSet[level] || poolSet[1] || storyContent.en[1];
  return pool[Math.floor(Math.random() * pool.length)];
}

function prepareQuestions(story) {
  return story.questions.map((q) => ({
    question: q.question,
    options: shuffle(
      q.options.map((text, i) => ({ text, correct: i === q.correctIndex })),
    ),
  }));
}

export function mountRememberMyStory(root, { lang, level, onHome }) {
  const activeLevel = clampLevel(level);
  const story = pickStory(activeLevel, lang);
  const questions = prepareQuestions(story);
  let phase = "story";
  let questionIndex = 0;
  let attempts = 0;
  let mistakes = 0;
  const sessionStart = Date.now();
  const responseTimes = [];
  let questionStart = 0;
  let resumeLevel = activeLevel;
  let finishing = false;

  function restart() {
    mountRememberMyStory(root, { lang, level: resumeLevel, onHome });
  }

  setVoiceLang(lang);
  // For Nepali, speakStory routes to the correct pre-recorded MP3 by story id.
  // For other languages, it falls back to speak(text) via Web Speech API.
  speakStory(lang, story.id, story.text);
  render();

  function render(complete = false, summary = null) {
    clear(root);
    const subtitle = phase === "questions" && !complete
      ? `${levelSubtitle(lang, activeLevel)} · ${tf(lang, "storyQuestionOf", { n: questionIndex + 1, total: questions.length })}`
      : levelSubtitle(lang, activeLevel);
    root.append(
      header(lang, {
        title: t(lang, "storyName"),
        subtitle,
        onBack: onHome,
      }),
    );
    if (complete) {
      root.append(summaryView(lang, summary, { onRestart: restart, onHome }));
      return;
    }

    if (phase === "story") {
      root.append(
        el("main", { className: "screen" },
          el("p", { className: "instruction" }, t(lang, "storyHelp")),
          el("p", { className: "story-card" }, story.text),
          el("button", {
            className: "btn",
            type: "button",
            style: { width: "100%", marginTop: "8px" },
            onClick: startQuestions,
          }, t(lang, "storyContinue")),
        ),
      );
      return;
    }

    const q = questions[questionIndex];
    const choices = el("div", { className: "choice-col" });
    q.options.forEach((option) => {
      choices.append(
        el("button", {
          className: "choice-btn",
          type: "button",
          onClick: () => handleChoice(option),
        }, option.text),
      );
    });

    root.append(
      el("main", { className: "screen" },
        el("p", { className: "instruction" }, q.question),
        choices,
      ),
    );
  }

  function startQuestions() {
    phase = "questions";
    questionIndex = 0;
    questionStart = Date.now();
    setVoiceLang(lang);
    speak(questions[0].question);
    render();
  }

  function handleChoice(option) {
    if (finishing || phase !== "questions") return;
    attempts += 1;
    responseTimes.push(Date.now() - questionStart);
    setVoiceLang(lang);
    if (option.correct) {
      speak(t(lang, "nice"));
    } else {
      mistakes += 1;
      speak(t(lang, "tryAgain"));
    }
    questionIndex += 1;
    if (questionIndex >= questions.length) {
      finish();
      return;
    }
    questionStart = Date.now();
    speak(questions[questionIndex].question);
    render();
  }

  async function finish() {
    if (finishing) return;
    finishing = true;
    const times = responseTimes;
    const avgResponseMs = times.length === 0 ? 0 : Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const completed = mistakes === 0;
    const accuracyPercent = completed ? 100 : 0;
    const totalTimeSeconds = Math.round((Date.now() - sessionStart) / 1000);
    const { nextPlayLevel } = await applyAdaptiveAndSave(GAME_TYPES.remember_my_story, {
      level: activeLevel,
      attempts,
      mistakes,
      accuracyPercent,
      avgResponseMs,
      totalTimeSeconds,
      extra: {
        content_pack_id: `remember_my_story_l${activeLevel}`,
        story_id: story.id,
        completed,
        correct: attempts - mistakes,
      },
    });
    resumeLevel = nextPlayLevel;
    speak(t(lang, "wellDone"));
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
