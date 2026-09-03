import { el, clear, header } from "./ui.js";
import { t } from "./i18n.js";
import { speak, speakKey, setVoiceLang } from "./voice.js";
import {
  getPatient,
  savePatientProfile,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
} from "./db.js";

const INDIAN_STATES = [
  "Arunachal Pradesh",
  "Assam",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
  "Andhra Pradesh",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
];

const LANGUAGE_KEYS = {
  en: "english",
  hi: "hindi",
  bn: "bengali",
  as: "assamese",
};

function phoneDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

export function isValidPhone(raw) {
  const digits = phoneDigits(raw);
  if (digits.length < 10 || digits.length > 15) return false;
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("0")) return true;
  if (digits.length === 12 && digits.startsWith("91")) return true;
  return digits.length >= 10 && digits.length <= 15;
}

function isValidName(raw) {
  const name = String(raw || "").trim();
  return name.length >= 2 && name.length <= 80;
}

function fieldLabel(lang, text, inputId) {
  return el("label", { className: "profile-label", for: inputId }, text);
}

function languageButtons(lang, selected, onPick) {
  return el("div", { className: "lang-row profile-lang-row", role: "group", "aria-label": t(lang, "profileLanguage") },
    ...SUPPORTED_LANGUAGES.map((code) =>
      el("button", {
        className: `btn${selected === code ? " active" : ""}`,
        type: "button",
        "aria-pressed": selected === code ? "true" : "false",
        onClick: () => onPick(code),
      }, t(lang, LANGUAGE_KEYS[code])),
    ),
  );
}

export async function mountProfile(root, { onComplete, allowSkipBack = false, onBack }) {
  const existing = await getPatient();
  let formLang = normalizeLanguage(existing?.language || "en");
  setVoiceLang(formLang);

  const state = {
    name: existing?.name || "",
    phone: existing?.phone || "",
    state: existing?.state || "",
    language: formLang,
    errors: {},
  };

  render();

  function uiLang() {
    return normalizeLanguage(state.language);
  }

  function render() {
    const lang = uiLang();
    setVoiceLang(lang);
    clear(root);

    root.append(
      header(lang, {
        title: t(lang, "profileTitle"),
        subtitle: t(lang, "profileSubtitle"),
        onBack: allowSkipBack && onBack ? onBack : null,
      }),
    );

    const errorBox = el("div", {
      className: `profile-errors${Object.keys(state.errors).length ? "" : " hidden"}`,
      role: "alert",
      "aria-live": "polite",
    });

    const nameId = "profile-name";
    const phoneId = "profile-phone";
    const stateId = "profile-state";

    const nameInput = el("input", {
      className: "profile-input",
      type: "text",
      id: nameId,
      name: "name",
      autocomplete: "name",
      value: state.name,
      "aria-invalid": state.errors.name ? "true" : "false",
      "aria-describedby": state.errors.name ? "profile-err-name" : undefined,
      onInput: (event) => {
        state.name = event.target.value;
        delete state.errors.name;
      },
    });

    const phoneInput = el("input", {
      className: "profile-input",
      type: "tel",
      id: phoneId,
      name: "phone",
      inputmode: "tel",
      autocomplete: "tel",
      placeholder: t(lang, "profilePhoneHint"),
      value: state.phone,
      "aria-invalid": state.errors.phone ? "true" : "false",
      "aria-describedby": state.errors.phone ? "profile-err-phone" : undefined,
      onInput: (event) => {
        state.phone = event.target.value;
        delete state.errors.phone;
      },
    });

    const stateSelect = el("select", {
      className: "profile-input",
      id: stateId,
      name: "state",
      "aria-invalid": state.errors.state ? "true" : "false",
      "aria-describedby": state.errors.state ? "profile-err-state" : undefined,
      onChange: (event) => {
        state.state = event.target.value;
        delete state.errors.state;
      },
    },
      el("option", { value: "" }, t(lang, "selectState")),
      ...INDIAN_STATES.map((value) =>
        el("option", { value, selected: state.state === value }, value),
      ),
    );

    Object.entries(state.errors).forEach(([field, err]) => {
      errorBox.append(el("p", { id: `profile-err-${field}`, className: "profile-error" }, err.message));
    });

    const langPick = languageButtons(lang, state.language, (code) => {
      state.language = code;
      delete state.errors.language;
      render();
    });

    root.append(
      el("main", { className: "screen profile-screen" },
        errorBox,
        el("form", {
          className: "profile-form",
          noValidate: true,
          onSubmit: (event) => {
            event.preventDefault();
            submit();
          },
        },
          fieldLabel(lang, t(lang, "profileName"), nameId),
          nameInput,
          fieldLabel(lang, t(lang, "profilePhone"), phoneId),
          phoneInput,
          fieldLabel(lang, t(lang, "profileState"), stateId),
          stateSelect,
          el("p", { className: "profile-field-label" }, t(lang, "profileLanguage")),
          langPick,
          el("button", {
            className: "btn profile-submit",
            type: "submit",
          }, t(lang, "profileContinue")),
        ),
      ),
    );

    speakKey(lang, "profileSubtitle", t(lang, "profileSubtitle"));
  }

  function validate() {
    const lang = uiLang();
    const errors = {};      // field → { message, key }
    state.name = String(state.name || "").trim();
    state.phone = String(state.phone || "").trim();
    state.state = String(state.state || "").trim();

    if (!state.name)                errors.name     = { message: t(lang, "errNameRequired"),  key: "errNameRequired" };
    else if (!isValidName(state.name)) errors.name  = { message: t(lang, "errNameShort"),     key: "errNameShort" };

    if (!state.phone)               errors.phone    = { message: t(lang, "errPhoneRequired"), key: "errPhoneRequired" };
    else if (!isValidPhone(state.phone)) errors.phone = { message: t(lang, "errPhoneInvalid"), key: "errPhoneInvalid" };

    if (!state.state)               errors.state    = { message: t(lang, "errStateRequired"), key: "errStateRequired" };

    if (!SUPPORTED_LANGUAGES.includes(normalizeLanguage(state.language))) {
      errors.language = { message: t(lang, "errLanguageRequired"), key: "errLanguageRequired" };
    }

    state.errors = errors;
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    if (!validate()) {
      render();
      // errors values are now { message, key } objects — speak via key.
      const firstError = Object.values(state.errors)[0];
      if (firstError) speakKey(uiLang(), firstError.key, firstError.message);
      return;
    }

    await savePatientProfile({
      name: state.name,
      phone: state.phone,
      state: state.state,
      language: state.language,
    });

    setVoiceLang(state.language);
    onComplete();
  }
}
