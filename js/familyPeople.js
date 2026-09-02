import { el, clear, header } from "./ui.js";
import { t, tRel, RELATIONSHIP_KEYS } from "./i18n.js";
import { listFamilyMembers, addFamilyMember, deleteFamilyMember } from "./db.js";
import { speakKey } from "./voice.js";

export async function mountFamilyPhotos(root, { lang, onBack, onPlay }) {
  await render();

  async function render() {
    const people = await listFamilyMembers();
    clear(root);
    root.append(header(lang, { title: t(lang, "familyPhotos"), onBack }));
    speakKey(lang, "familyPhotos", t(lang, "familyPhotos"), true);

    const list = el("div", { className: "family-list" });
    people.forEach((person) => {
      list.append(
        el("div", { className: "family-row" },
          el("img", { className: "family-thumb", src: person.photoDataUrl, alt: person.name }),
          el("div", {},
            el("strong", {}, person.name),
            el("div", { className: "instruction" }, tRel(lang, person.relationshipKey)),
          ),
          el("button", {
            className: "btn",
            type: "button",
            onClick: async () => {
              await deleteFamilyMember(person.id);
              await render();
            },
          }, "×"),
        ),
      );
    });

    const nameInput = el("input", { className: "family-input", type: "text", id: "fam-name" });
    const relSelect = el("select", { className: "family-input", id: "fam-rel" });
    RELATIONSHIP_KEYS.forEach((key) => {
      relSelect.append(el("option", { value: key }, tRel(lang, key)));
    });
    const fileInput = el("input", { className: "family-input", type: "file", accept: "image/*", id: "fam-photo" });
    const note = el("p", { className: "instruction", id: "fam-note" }, t(lang, "familyHelp"));

    root.append(
      el("main", { className: "screen" },
        list,
        note,
        el("label", {}, t(lang, "personName"), nameInput),
        el("label", {}, t(lang, "personRelation"), relSelect),
        el("label", {}, t(lang, "personPhoto"), fileInput),
        el("button", {
          className: "btn",
          type: "button",
          style: { width: "100%", marginTop: "12px" },
          onClick: async () => {
            const name = nameInput.value.trim();
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
              note.textContent = t(lang, "noPhoto");
              return;
            }
            const photoDataUrl = await readFile(file);
            await addFamilyMember({
              name: name || tRel(lang, relSelect.value),
              relationshipKey: relSelect.value,
              photoDataUrl,
            });
            nameInput.value = "";
            fileInput.value = "";
            await render();
          },
        }, t(lang, "addPerson")),
        onPlay
          ? el("button", {
            className: "btn",
            type: "button",
            style: { width: "100%", marginTop: "12px" },
            onClick: onPlay,
          }, t(lang, "startGame"))
          : null,
      ),
    );
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
