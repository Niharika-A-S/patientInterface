import { el, clear, header, summaryView, levelSubtitle } from "../ui.js";
import { t, tf } from "../i18n.js";
import { speak, speakKey, speakStory, speakStoryQuestion, setVoiceLang, stopSpeak } from "../voice.js";
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
  const pool = (poolSet[level] && poolSet[level].length > 0)
    ? poolSet[level]
    : poolSet[1];
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

  function handleBack() {
    stopSpeak();
    onHome();
  }

  function restart() {
    stopSpeak();
    mountRememberMyStory(root, { lang, level: resumeLevel, onHome });
  }

  setVoiceLang(lang);
  // For Bengali, speakStory routes to the correct pre-recorded MP3 by story id.
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
        onBack: handleBack,
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
    stopSpeak();
    render();
    // For Bengali: plays question audio, then chains options audio on 'ended'.
    // For other languages: speaks question text via Web Speech API.
    speakStoryQuestion(lang, story.id, 0, questions[0].question);
  }

  function handleChoice(option) {
    if (finishing || phase !== "questions") return;
    attempts += 1;
    responseTimes.push(Date.now() - questionStart);
    setVoiceLang(lang);
    if (option.correct) {
      speakKey(lang, "nice", t(lang, "nice"));
    } else {
      mistakes += 1;
      speakKey(lang, "tryAgain", t(lang, "tryAgain"));
    }
    questionIndex += 1;
    if (questionIndex >= questions.length) {
      finish();
      return;
    }
    questionStart = Date.now();
    render();
    // Stop previous audio, then play next question + chain options (Bengali)
    // or speak question text (other languages).
    stopSpeak();
    speakStoryQuestion(lang, story.id, questionIndex, questions[questionIndex].question);
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
