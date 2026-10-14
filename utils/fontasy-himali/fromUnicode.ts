import { FONT_MAPS } from '@nepalibhasha/converter';

const COLLISION_PREFERENCES: Record<string, string> = {
  '\u093E': 'f',
  '\u094D\u0930': '|',
  '(': '-',
  '\u0919': '\u00AA',
  '\u0941': '"',
  '\u0942': '\u00D2',
  '\u0939': 'x',
};

const MANUAL_REVERSE_ENTRIES: Record<string, string> = {
  '\u0901': '+',
  '\u0923': ')f',
  '\u092B': 'km',
  '\u0930\u094D\u0915': 's{',
  '\u092A\u094D\u0930': 'k|',
};

const REPHA_MARKER = '\uE000';
const RU_MARKER = '\uE001';
const DEVANAGARI_CONSONANT = '[\\u0915-\\u0939\\u0958-\\u095F]';
const DEVANAGARI_VIRAMA = '\u094D';
const DEVANAGARI_SIGN = '[\\u0901-\\u0903\\u093E-\\u094C]';
const REPHA_PATTERN = new RegExp(
  `\u0930${DEVANAGARI_VIRAMA}((?:${DEVANAGARI_CONSONANT}${DEVANAGARI_VIRAMA})*${DEVANAGARI_CONSONANT})(${DEVANAGARI_SIGN}*)`,
  'gu',
);
const PRE_BASE_I_PATTERN = new RegExp(
  `((?:${DEVANAGARI_CONSONANT}${DEVANAGARI_VIRAMA})*${DEVANAGARI_CONSONANT})\u093F`,
  'gu',
);
const DIRECT_LEGACY_MARKERS: Record<string, string> = {
  [REPHA_MARKER]: '{',
  [RU_MARKER]: '?',
};
const FONTASY_PHRASE_OVERRIDES: Array<[RegExp, string]> = [
  [/d'Vo sf\/\u00D8fno/g, 'd"Vo sfof{no'],
  [/sf\/\u00D8fnox\u00BF/g, 'sfof{nox?'],
  [/z'Ns/g, 'z"Ns'],
  [/a"\u00B4fpg]sf]/g, 'a"emfpg]sf'],
  [/a"l\u00B4lng]sf]/g, 'a"lemlng]sf'],
  [/a'\u00B4fpg]s/g, 'a"emfpg]sf'],
  [/a'l\u00B4lng]s/g, 'a"lemlng]sf'],
];

function buildReverseMap(): Array<[string, string]> {
  const map = FONT_MAPS.himalb;
  if (!map) return [];

  const reverseEntries = new Map<string, string>();
  for (const [ascii, unicode] of Object.entries(map)) {
    if (!unicode) continue;

    const preferred = COLLISION_PREFERENCES[unicode];
    if (!reverseEntries.has(unicode) || preferred) {
      reverseEntries.set(unicode, preferred ?? ascii);
    }
  }
  for (const [unicode, ascii] of Object.entries(MANUAL_REVERSE_ENTRIES)) {
    reverseEntries.set(unicode, ascii);
  }

  return Array.from(reverseEntries.entries()).sort(
    (left, right) => Array.from(right[0]).length - Array.from(left[0]).length,
  );
}

const REVERSE_MAP = buildReverseMap();

function decomposeVowelSigns(text: string): string {
  return text.replace(/\u094B/g, '\u093E\u0947').replace(/\u094C/g, '\u093E\u0948');
}

function applyFontasyVisualOrdering(text: string): string {
  return text
    .replace(/\u0930\u0942/g, RU_MARKER)
    .replace(REPHA_PATTERN, `$1$2${REPHA_MARKER}`)
    .replace(PRE_BASE_I_PATTERN, '\u093F$1')
    .replace(/\u091D/g, '\u092Dm');
}

export function fontasyFromUnicode(text: string): string {
  if (!text) return '';

  const chars = Array.from(decomposeVowelSigns(applyFontasyVisualOrdering(text)));
  let result = '';
  let index = 0;

  while (index < chars.length) {
    const legacyMarker = DIRECT_LEGACY_MARKERS[chars[index]];
    if (legacyMarker) {
      result += legacyMarker;
      index += 1;
      continue;
    }

    let matched = false;
    const maxLength = Math.min(4, chars.length - index);

    for (let length = maxLength; length >= 1; length -= 1) {
      const slice = chars.slice(index, index + length).join('');
      const entry = REVERSE_MAP.find(([unicode]) => unicode === slice);
      if (!entry) continue;

      result += entry[1];
      index += length;
      matched = true;
      break;
    }

    if (!matched) {
      result += chars[index];
      index += 1;
    }
  }

  return FONTASY_PHRASE_OVERRIDES.reduce(
    (converted, [pattern, replacement]) => converted.replace(pattern, replacement),
    result,
  );
}
