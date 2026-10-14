import { toNepaliDigits } from '@/utils/numbers';

const SMALL_NUMBERS = [
  'शून्य', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
  'दश', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस',
  'बीस', 'एक्काइस', 'बाइस', 'तेइस', 'चौबिस', 'पच्चिस', 'छब्बिस', 'सत्ताइस', 'अठ्ठाइस', 'उनन्तिस',
  'तीस', 'एकतीस', 'बत्तीस', 'तेत्तीस', 'चौँतीस', 'पैँतीस', 'छत्तीस', 'सैँतीस', 'अठतीस', 'उनन्चालीस',
  'चालीस', 'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैँतालीस', 'छयालीस', 'सतचालीस', 'अठचालीस', 'उनन्चास',
  'पचास', 'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चवन्न', 'पचपन्न', 'छपन्न', 'सन्ताउन्न', 'अन्ठाउन्न', 'उनन्साठी',
  'साठी', 'एकसट्ठी', 'बयसट्ठी', 'त्रिसट्ठी', 'चौँसट्ठी', 'पैँसट्ठी', 'छयसट्ठी', 'सतसट्ठी', 'अठसट्ठी', 'उनन्सत्तरी',
  'सत्तरी', 'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
  'असी', 'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनान्नब्बे',
  'नब्बे', 'एकान्नब्बे', 'बयान्नब्बे', 'त्रियान्नब्बे', 'चौरान्नब्बे', 'पन्चान्नब्बे', 'छयान्नब्बे', 'सन्तान्नब्बे', 'अन्ठान्नब्बे', 'उनान्सय',
];

function underThousand(value: number): string {
  if (value < 100) return SMALL_NUMBERS[value] ?? '';
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return `${SMALL_NUMBERS[hundreds]} सय${remainder ? ` ${SMALL_NUMBERS[remainder]}` : ''}`;
}

function integerToNepaliWords(value: number): string {
  if (value === 0) return SMALL_NUMBERS[0];

  const units: Array<[number, string]> = [
    [10_000_000, 'करोड'],
    [100_000, 'लाख'],
    [1_000, 'हजार'],
    [100, 'सय'],
  ];
  let remainder = Math.floor(value);
  const parts: string[] = [];

  for (const [unit, label] of units) {
    if (remainder < unit) continue;
    const count = Math.floor(remainder / unit);
    parts.push(`${underThousand(count)} ${label}`);
    remainder %= unit;
  }
  if (remainder) parts.push(underThousand(remainder));
  return parts.join(' ');
}

export function formatAmountInNepaliWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) return 'रकम उपलब्ध छैन';
  const rupees = Math.floor(value);
  const paisa = Math.round((value - rupees) * 100);
  const rupeeText = `${integerToNepaliWords(rupees)} रुपैयाँ`;
  return paisa ? `${rupeeText} ${integerToNepaliWords(paisa)} पैसा मात्र` : `${rupeeText} मात्र`;
}

export function formatDocumentCurrency(value: number): string {
  return toNepaliDigits(new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value));
}

export function formatDocumentCount(value: number): string {
  return toNepaliDigits(new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value));
}
