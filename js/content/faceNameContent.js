import { tRel, tf } from "../i18n.js";

const ROUNDS_PER_LEVEL = 3;

export function promptForLevel(lang, level, target) {
  if (level === 1) return { key: "facePromptWho", text: tf(lang, "facePromptWho") };
  if (level === 2) return { key: "facePromptWhoRelated", text: tf(lang, "facePromptWhoRelated") };
  if (level === 3) return { key: "facePromptRelated", text: tf(lang, "facePromptRelated") };
  return { key: "facePromptWhich", text: tf(lang, "facePromptWhich", { rel: tRel(lang, target.relationshipKey) }) };
}

export function choiceText(lang, person, level) {
  if (level === 1) return person.name;
  if (level === 2) return `${person.name} (${tRel(lang, person.relationshipKey)})`;
  if (level === 3) return tRel(lang, person.relationshipKey);
  return "";
}

export function buildFaceSession(level, pool, lang) {
  const people = [...pool];
  if (people.length === 0) return { rounds: [] };

  if (level === 4) {
    return { rounds: buildLevel4Rounds(people, lang) };
  }

  const targets = uniqueById(shuffle(people)).slice(0, ROUNDS_PER_LEVEL);
  while (targets.length < ROUNDS_PER_LEVEL) {
    targets.push(people[targets.length % people.length]);
  }

  const optionCount = level === 1 ? clamp(2, 3, people.length) : clamp(2, 4, people.length);

  const rounds = targets.map((target) => {
    let distractors = shuffle(people.filter((p) => p.id !== target.id));
    if (level === 3) {
      distractors = uniqueByRel(distractors.filter((p) => p.relationshipKey !== target.relationshipKey));
    }
    const picks = distractors.slice(0, optionCount - 1);
    const choices = shuffle([target, ...picks]);
    return {
      target,
      choices,
      prompt: promptForLevel(lang, level, target),
      mode: "text",
    };
  });

  return { rounds };
}

function buildLevel4Rounds(people, lang) {
  const byRel = uniqueByRel(people);
  const relTargets = shuffle(byRel).slice(0, ROUNDS_PER_LEVEL);
  while (relTargets.length < ROUNDS_PER_LEVEL) {
    relTargets.push(people[relTargets.length % people.length]);
  }

  return relTargets.map((target) => {
    const others = shuffle(people.filter((p) => p.id !== target.id)).slice(0, 3);
    const choices = shuffle([target, ...others]).slice(0, clamp(3, 4, people.length));
    if (!choices.some((p) => p.id === target.id)) {
      choices[0] = target;
    }
    return {
      target,
      choices,
      prompt: promptForLevel(lang, 4, target),
      mode: "photos",
    };
  });
}

function uniqueById(arr) {
  const seen = new Set();
  return arr.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function uniqueByRel(arr) {
  const seen = new Set();
  return arr.filter((p) => {
    if (seen.has(p.relationshipKey)) return false;
    seen.add(p.relationshipKey);
    return true;
  });
}

function clamp(min, max, n) {
  return Math.max(min, Math.min(max, n));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
