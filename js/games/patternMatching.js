import { el, clear, header, summaryView, levelSubtitle } from "../ui.js";
import { t } from "../i18n.js";
import { speak, speakKey } from "../voice.js";
import { applyAdaptiveAndSave, GAME_TYPES } from "../db.js";
import { clampLevel } from "../adaptive.js";
import {
  nextPatternRound,
  getShapeSet,
  getEmojiSet,
  getPhotoRound,
  pickPoolItems,
} from "../content/patternMatchingContent.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shapeSvg(shape) {
  const fill = "#D85A30";
  let inner = "";
  if (shape === "circle") inner = `<circle cx="50" cy="50" r="38" fill="${fill}" />`;
  else if (shape === "square") inner = `<rect x="16" y="16" width="68" height="68" rx="8" fill="${fill}" />`;
  else if (shape === "rectangle") inner = `<rect x="10" y="28" width="80" height="44" rx="8" fill="${fill}" />`;
  else if (shape === "star") inner = `<polygon points="50,8 61,38 94,38 67,58 78,90 50,70 22,90 33,58 6,38 39,38" fill="${fill}" />`;
  else if (shape === "pentagon") inner = `<polygon points="50,8 92,38 76,88 24,88 8,38" fill="${fill}" />`;
  else inner = `<polygon points="50,12 90,86 10,86" fill="${fill}" />`;
  const box = el("div");
  box.innerHTML = `<svg width="64" height="64" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  return box.firstElementChild;
}

function buildDeck(level, roundIndex) {
  if (level === 1) {
    const shapes = getShapeSet(roundIndex);
    const pairContent = shuffle([...shapes, ...shapes]);
    return {
      columns: 3,
      cards: pairContent.map((shape, i) => ({
        id: `card_${i}`,
        pairId: shape,
        kind: "shape",
        shape,
        isFlipped: false,
        isMatched: false,
      })),
    };
  }

  if (level === 2) {
    const emojis = getEmojiSet(roundIndex);
    const pairContent = shuffle([...emojis, ...emojis]);
    return {
      columns: 3,
      cards: pairContent.map((emoji, i) => ({
        id: `card_${i}`,
        pairId: emoji,
        kind: "emoji",
        emoji,
        isFlipped: false,
        isMatched: false,
      })),
    };
  }

  const spec = getPhotoRound(level, roundIndex);
  const items = pickPoolItems(spec.category, spec.pairs, spec.offset);
  const faces = [];
  items.forEach((item) => {
    if (level === 3) {
      faces.push({ pairId: item.name, kind: "image", image: item.image, label: item.name });
      faces.push({ pairId: item.name, kind: "image", image: item.image, label: item.name });
    } else {
      faces.push({ pairId: item.name, kind: "word", label: item.name });
      faces.push({ pairId: item.name, kind: "image", image: item.image, label: item.name });
    }
  });
  const shuffled = shuffle(faces);
  const count = shuffled.length;
  const columns = count === 10 ? 5 : 4;
  return {
    columns,
    cards: shuffled.map((face, i) => ({
      id: `card_${i}`,
      ...face,
      isFlipped: false,
      isMatched: false,
    })),
  };
}

function faceContent(card) {
  if (card.kind === "shape") return shapeSvg(card.shape);
  if (card.kind === "emoji") return el("span", { className: "card-emoji" }, card.emoji);
  if (card.kind === "word") return el("span", { className: "card-word" }, card.label);
  if (card.kind === "image") {
    return el("img", {
      className: "card-photo",
      src: card.image,
      alt: card.label,
    });
  }
  return "";
}

export function mountPatternMatching(root, { lang, level, onHome }) {
  const activeLevel = clampLevel(level);
  const roundIndex = nextPatternRound(activeLevel);
  let { columns, cards } = buildDeck(activeLevel, roundIndex);
  let flipped = [];
  let busy = false;
  let attempts = 0;
  let correctMatches = 0;
  const sessionStart = Date.now();
  let lastFlipTime = null;
  const responseTimes = [];
  let resumeLevel = activeLevel;

  function restart() {
    mountPatternMatching(root, { lang, level: resumeLevel, onHome });
  }

  speakKey(lang, "patternHelp", t(lang, "patternHelp"));
  render();

  function render(complete = false, summary = null) {
    clear(root);
    root.append(
      header(lang, {
        title: t(lang, "patternName"),
        subtitle: levelSubtitle(lang, activeLevel),
        onBack: onHome,
      }),
    );
    if (complete) {
      root.append(summaryView(lang, summary, { onRestart: restart, onHome }));
      return;
    }

    const grid = el("div", { className: `grid cols-${columns}` });
    cards.forEach((card, index) => {
      const show = card.isFlipped || card.isMatched;
      const btn = el("button", {
        className: `card-btn${show ? " face" : ""}${card.isMatched ? " matched" : ""}`,
        type: "button",
        "aria-label": show ? `Card showing ${card.label || card.emoji || card.shape}` : "Face-down card",
        onClick: () => handleTap(index),
      }, show ? faceContent(card) : "?");
      grid.append(btn);
    });

    root.append(
      el("main", { className: "screen" },
        el("p", { className: "instruction" }, t(lang, "patternHelp")),
        grid,
      ),
    );
  }

  function handleTap(index) {
    if (busy) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flipped.length === 2) return;
    if (!lastFlipTime) lastFlipTime = Date.now();

    cards = cards.map((c, i) => (i === index ? { ...c, isFlipped: true } : c));
    flipped = [...flipped, index];
    render();

    if (flipped.length === 2) {
      attempts += 1;
      checkMatch();
    }
  }

  function checkMatch() {
    busy = true;
    const [i1, i2] = flipped;
    const isMatch = cards[i1].pairId === cards[i2].pairId;
    if (lastFlipTime) {
      responseTimes.push(Date.now() - lastFlipTime);
      lastFlipTime = null;
    }

    if (isMatch) {
      setTimeout(() => {
        cards = cards.map((c, i) =>
          i === i1 || i === i2 ? { ...c, isMatched: true } : c,
        );
        correctMatches += 1;
        flipped = [];
        busy = false;
        if (cards.every((c) => c.isMatched)) finish();
        else render();
      }, 500);
    } else {
      setTimeout(() => {
        cards = cards.map((c, i) =>
          i === i1 || i === i2 ? { ...c, isFlipped: false } : c,
        );
        flipped = [];
        busy = false;
        render();
      }, 1100);
    }
  }

  async function finish() {
    const times = responseTimes;
    const avgResponseMs = times.length === 0 ? 0 : Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const accuracyPercent = attempts === 0 ? 0 : Number(((correctMatches / attempts) * 100).toFixed(1));
    const mistakes = attempts - correctMatches;
    const totalTimeSeconds = Math.round((Date.now() - sessionStart) / 1000);
    const { nextPlayLevel } = await applyAdaptiveAndSave(GAME_TYPES.pattern_matching, {
      level: activeLevel,
      attempts,
      mistakes,
      accuracyPercent,
      avgResponseMs,
      totalTimeSeconds,
      extra: { grid_size: cards.length, correct_matches: correctMatches },
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
