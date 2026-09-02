import { el, clear, header, summaryView, levelSubtitle } from "../ui.js";
import { t } from "../i18n.js";
import { speak, speakKey } from "../voice.js";
import { applyAdaptiveAndSave, GAME_TYPES } from "../db.js";
import { clampLevel } from "../adaptive.js";
import { buildShapeSortRound, matchesRule } from "../content/shapeSortContent.js";

const FILL = {
  terracotta: "#D85A30",
  red: "#C0432E",
  blue: "#3A6EA5",
  charcoal: "#3B3B3F",
  peach: "#E28364",
};

function shapeSvg(shape, color) {
  const fill = FILL[color] || FILL.terracotta;
  let inner = "";
  if (shape === "circle") inner = `<circle cx="50" cy="50" r="38" fill="${fill}" />`;
  else if (shape === "square") inner = `<rect x="16" y="16" width="68" height="68" rx="8" fill="${fill}" />`;
  else if (shape === "rectangle") inner = `<rect x="10" y="28" width="80" height="44" rx="8" fill="${fill}" />`;
  else if (shape === "star") inner = `<polygon points="50,8 61,38 94,38 67,58 78,90 50,70 22,90 33,58 6,38 39,38" fill="${fill}" />`;
  else if (shape === "pentagon") inner = `<polygon points="50,8 92,38 76,88 24,88 8,38" fill="${fill}" />`;
  else inner = `<polygon points="50,12 90,86 10,86" fill="${fill}" />`;
  const box = el("div");
  box.innerHTML = `<svg width="72" height="72" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  return box.firstElementChild;
}

function tileContent(item) {
  if (item.kind === "emoji") return el("span", { className: "sort-emoji" }, item.emoji);
  if (item.kind === "object") {
    return el("img", { className: "sort-photo", src: item.image, alt: item.label || "" });
  }
  return shapeSvg(item.shape, item.color);
}

export function mountShapeSort(root, { lang, level, onHome }) {
  const activeLevel = clampLevel(level);
  const { spec, items, targetIds: targetIdList } = buildShapeSortRound(activeLevel);
  const targetIds = new Set(targetIdList);
  const foundIds = new Set();
  let wrongTaps = 0;
  const sessionStart = Date.now();
  let actionStart = Date.now();
  const responseTimes = [];
  let finished = false;
  let timerId = null;
  let remainingMs = spec.timeLimitMs;
  let resumeLevel = activeLevel;
  let lastWrongId = null;

  function restart() {
    if (timerId) clearInterval(timerId);
    mountShapeSort(root, { lang, level: resumeLevel, onHome });
  }

  const instruction = spec.instruction[lang] || spec.instruction.en;
  speak(instruction);

  if (spec.timeLimitMs) {
    timerId = setInterval(() => {
      remainingMs -= 250;
      const node = root.querySelector(".timer");
      if (node) node.textContent = `${Math.max(0, Math.ceil(remainingMs / 1000))}s`;
      if (remainingMs <= 0) {
        clearInterval(timerId);
        finish();
      }
    }, 250);
  }

  render();

  function allTargetsFound() {
    return targetIds.size > 0 && [...targetIds].every((id) => foundIds.has(id));
  }

  function render() {
    clear(root);
    root.append(
      header(lang, {
        title: t(lang, "shapeName"),
        subtitle: levelSubtitle(lang, activeLevel),
        onBack: () => {
          if (timerId) clearInterval(timerId);
          onHome();
        },
      }),
    );

    const cols = items.length >= 20 ? 5 : items.length >= 10 ? 5 : 4;
    const grid = el("div", { className: `sort-grid cols-${cols}` });
    items.forEach((item) => {
      const found = foundIds.has(item.id);
      const wrongFlash = lastWrongId === item.id;
      const btn = el("button", {
        className: `sort-item${found ? " selected correct" : ""}${wrongFlash ? " wrong" : ""}`,
        type: "button",
        onClick: () => handleTap(item),
      }, tileContent(item));
      grid.append(btn);
    });

    root.append(
      el("main", { className: "screen" },
        spec.timeLimitMs ? el("div", { className: "timer" }, `${Math.max(0, Math.ceil(remainingMs / 1000))}s`) : null,
        el("p", { className: "instruction" }, instruction),
        el("p", { className: "instruction" }, foundLabel(lang, foundIds.size, targetIds.size)),
        grid,
        el("button", {
          className: "btn",
          type: "button",
          style: { width: "100%", marginTop: "8px" },
          onClick: finish,
        }, t(lang, "done")),
      ),
    );
  }

  function handleTap(item) {
    if (finished || foundIds.has(item.id)) return;
    responseTimes.push(Date.now() - actionStart);
    actionStart = Date.now();
    lastWrongId = null;

    if (targetIds.has(item.id)) {
      foundIds.add(item.id);
      speakKey(lang, "nice", t(lang, "nice"));
      if (allTargetsFound()) finish();
      else render();
      return;
    }

    wrongTaps += 1;
    lastWrongId = item.id;
    speakKey(lang, "tryAgain", t(lang, "tryAgain"));
    render();
  }

  async function finish() {
    if (finished) return;
    finished = true;
    if (timerId) clearInterval(timerId);

    const foundCount = [...targetIds].filter((id) => foundIds.has(id)).length;
    const missed = targetIds.size - foundCount;
    const mistakes = wrongTaps + missed;
    const attempts = foundCount + wrongTaps;
    const accuracyPercent = targetIds.size + wrongTaps === 0
      ? 0
      : Number(((foundCount / (targetIds.size + wrongTaps)) * 100).toFixed(1));
    const times = responseTimes;
    const avgResponseMs = times.length === 0 ? 0 : Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const totalTimeSeconds = Math.round((Date.now() - sessionStart) / 1000);
    const { nextPlayLevel } = await applyAdaptiveAndSave(GAME_TYPES.shape_sort, {
      level: activeLevel,
      attempts: Math.max(attempts, foundCount + mistakes),
      mistakes,
      accuracyPercent,
      avgResponseMs,
      totalTimeSeconds,
      extra: {
        content_pack_id: `shape_sort_l${activeLevel}`,
        targets: targetIds.size,
        found: foundCount,
        missed,
        wrong_taps: wrongTaps,
      },
    });
    resumeLevel = nextPlayLevel;
    speakKey(lang, allTargetsFound() ? "allFound" : "wellDone",
             t(lang, allTargetsFound() ? "allFound" : "wellDone"));
    clear(root);
    root.append(
      header(lang, { title: t(lang, "shapeName"), subtitle: levelSubtitle(lang, activeLevel), onBack: onHome }),
      summaryView(lang, {
        level: activeLevel,
        accuracyPercent,
        totalTimeSeconds,
        attempts: Math.max(attempts, foundCount + mistakes),
        mistakes,
        nextPlayLevel,
      }, { onRestart: restart, onHome }),
    );
  }
}

function foundLabel(lang, found, total) {
  if (lang === "hi") return `${found} / ${total} मिल गए`;
  if (lang === "as") return `${found} / ${total} বিচাৰি পোৱা হ'ল`;
  if (lang === "ne") return `${found} / ${total} फेला पर्‍यो`;
  return `Found ${found} of ${total}`;
}
