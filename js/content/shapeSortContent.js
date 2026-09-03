const SHAPES = ["circle", "square", "triangle", "rectangle", "star", "pentagon"];

const EMOJIS = [
  { value: "🍎", en: "apples", hi: "सेब", bn: "আপেল", as: "মোহবাৰী" },
  { value: "🍌", en: "bananas", hi: "केले", bn: "কলা", as: "কল" },
  { value: "🌸", en: "flowers", hi: "फूल", bn: "ফুল", as: "ফুল" },
  { value: "☂️", en: "umbrellas", hi: "छतरियाँ", bn: "ছাতা", as: "চাতি" },
  { value: "⚽", en: "balls", hi: "गेंदें", bn: "বল", as: "বল" },
  { value: "🔑", en: "keys", hi: "चाबियाँ", bn: "চাবি", as: "চাবি" },
  { value: "☕", en: "cups", hi: "कप", bn: "কাপ", as: "কাপ" },
  { value: "🌙", en: "moons", hi: "चाँद", bn: "চাঁদ", as: "চান" },
];

export const OBJECT_ITEMS = [
  { id: "clock", image: "assets/objects/clock.jpg", en: "clocks", hi: "घड़ियाँ", bn: "ঘড়ি", as: "ঘড়ি" },
  { id: "telephone", image: "assets/objects/telephone.jpg", en: "telephones", hi: "टेलीफ़ोन", bn: "টেলিফোন", as: "টেলিফোন" },
  { id: "chair", image: "assets/objects/chair.jpg", en: "chairs", hi: "कुर्सियाँ", bn: "চেয়ার", as: "মেজোপালি" },
  { id: "book", image: "assets/objects/book.jpg", en: "books", hi: "किताबें", bn: "বই", as: "পুস্তক" },
];

const LEVEL_ROUNDS = {
  1: [
    { count: 8, targetCount: 3, pool: "shape", target: { kind: "shape", value: "circle" } },
    { count: 8, targetCount: 3, pool: "shape", target: { kind: "shape", value: "star" } },
    { count: 8, targetCount: 3, pool: "shape", target: { kind: "shape", value: "pentagon" } },
  ],
  2: [
    { count: 8, targetCount: 3, pool: "emoji", target: { kind: "emoji", value: "🍎" } },
    { count: 8, targetCount: 3, pool: "emoji", target: { kind: "emoji", value: "🔑" } },
    { count: 8, targetCount: 3, pool: "emoji", target: { kind: "emoji", value: "⚽" } },
  ],
  3: [
    { count: 10, targetCount: 3, pool: "object", target: { kind: "object", value: "book" } },
    { count: 10, targetCount: 3, pool: "object", target: { kind: "object", value: "clock" } },
    { count: 10, targetCount: 3, pool: "object", target: { kind: "object", value: "chair" } },
  ],
  4: [
    { count: 20, targetCount: 4, pool: "mixed", target: { kind: "object", value: "book" } },
    { count: 20, targetCount: 4, pool: "mixed", target: { kind: "shape", value: "circle" } },
    { count: 20, targetCount: 4, pool: "mixed", target: { kind: "emoji", value: "🍌" } },
  ],
};

const roundCursor = { 1: 0, 2: 0, 3: 0, 4: 0 };

export function matchesRule(item, rule) {
  if (!item || !rule) return false;
  if (rule.kind === "shape") return item.kind === "shape" && item.shape === rule.value;
  if (rule.kind === "emoji") return item.kind === "emoji" && item.emoji === rule.value;
  if (rule.kind === "object") return item.kind === "object" && item.objectId === rule.value;
  return false;
}

import { tf } from "../i18n.js";

export function buildShapeSortRound(lang, level) {
  const n = Number(level) || 1;
  const rounds = LEVEL_ROUNDS[n] || LEVEL_ROUNDS[1];
  const index = roundCursor[n] || 0;
  roundCursor[n] = (index + 1) % rounds.length;
  const dim = rounds[index];
  const { key: instructionKey, text: instructionText } = instructionFor(lang, dim.target);
  const rule = {
    kind: dim.target.kind,
    value: dim.target.value,
    instructionKey,
    instructionText,
  };

  const raw = [];
  for (let i = 0; i < dim.targetCount; i += 1) {
    raw.push(makeTargetItem(rule));
  }
  while (raw.length < dim.count) {
    raw.push(makeDistractorItem(dim.pool, rule));
  }

  const items = shuffle(raw).map((item, i) => ({ ...item, id: `item_${i}` }));
  const targetIds = items.filter((item) => matchesRule(item, rule)).map((item) => item.id);

  return {
    spec: {
      level: n,
      rule,
      timeLimitMs: null,
      instructionKey: rule.instructionKey,
      instructionText: rule.instructionText,
      targetCount: targetIds.length,
    },
    items,
    targetIds,
  };
}

function instructionFor(lang, target) {
  if (target.kind === "shape") {
    const key = `shapeInst${target.value.charAt(0).toUpperCase() + target.value.slice(1)}`;
    return { key, text: tf(lang, key) };
  }
  if (target.kind === "emoji") {
    const row = EMOJIS.find((e) => e.value === target.value);
    const itemText = row ? row[lang] || row.en : "matching items";
    return { key: "shapeInstDynamic", text: tf(lang, "shapeInstDynamic", { item: itemText }) };
  }
  const obj = OBJECT_ITEMS.find((o) => o.id === target.value);
  const itemText = obj ? obj[lang] || obj.en : "matching items";
  return { key: "shapeInstDynamic", text: tf(lang, "shapeInstDynamic", { item: itemText }) };
}

function makeTargetItem(rule) {
  if (rule.kind === "shape") return { kind: "shape", shape: rule.value, color: "terracotta" };
  if (rule.kind === "emoji") return { kind: "emoji", emoji: rule.value };
  const obj = OBJECT_ITEMS.find((o) => o.id === rule.value) || OBJECT_ITEMS[0];
  return { kind: "object", objectId: obj.id, image: obj.image, label: obj.en };
}

function makeDistractorItem(pool, rule) {
  let candidate;
  let guard = 0;
  do {
    candidate = randomFromPool(pool);
    guard += 1;
  } while (matchesRule(candidate, rule) && guard < 50);
  if (matchesRule(candidate, rule)) {
    return fallbackDistractor(rule);
  }
  return candidate;
}

function randomFromPool(pool) {
  if (pool === "shape") return randomShape();
  if (pool === "emoji") return randomEmoji();
  if (pool === "object") return randomObject();
  const pickKind = Math.floor(Math.random() * 3);
  if (pickKind === 0) return randomShape();
  if (pickKind === 1) return randomEmoji();
  return randomObject();
}

function randomShape() {
  return { kind: "shape", shape: pick(SHAPES), color: "terracotta" };
}

function randomEmoji() {
  return { kind: "emoji", emoji: pick(EMOJIS).value };
}

function randomObject() {
  const obj = pick(OBJECT_ITEMS);
  return { kind: "object", objectId: obj.id, image: obj.image, label: obj.en };
}

function fallbackDistractor(rule) {
  if (rule.kind === "shape") {
    const shape = SHAPES.find((s) => s !== rule.value) || "square";
    return { kind: "shape", shape, color: "terracotta" };
  }
  if (rule.kind === "emoji") {
    const row = EMOJIS.find((e) => e.value !== rule.value) || EMOJIS[0];
    return { kind: "emoji", emoji: row.value };
  }
  const obj = OBJECT_ITEMS.find((o) => o.id !== rule.value) || OBJECT_ITEMS[0];
  return { kind: "object", objectId: obj.id, image: obj.image, label: obj.en };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
