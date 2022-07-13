import Fraction from "fraction.js";
import { MIDI_NOTE_NUMBER_OF_A4 } from "./constants"

export function arraysEqual(a: any[], b: any[]) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// Stolen from fraction.js, because it's not exported.
export function gcd(a: number, b: number): number {
  if (!a) return b;
  if (!b) return a;
  while (true) {
    a %= b;
    if (!a) return b;
    b %= a;
    if (!b) return a;
  }
}

export function lcm(a: number, b: number): number {
  return (Math.abs(a) / gcd(a, b)) * Math.abs(b);
}

export function mmod(a: number, b: number) {
  return ((a % b) + b) % b;
}

// Calculate best rational approximations to a given fraction
// that are closer than any approximation with a smaller or equal denominator
export function getSemiConvergents(
  x: Fraction,
  maxDenominator?: number,
  maxLength?: number
) {
  /*
    Glossary
      cfDigit : the continued fraction digit
      num : the convergent numerator
      den : the convergent denominator
      scnum : the semiconvergent numerator
      scden : the semiconvergen denominator
      cind : tracks indicies of convergents
  */
  const result: Fraction[] = [];
  const cf = x.toContinued();
  const cind: number[] = [];
  for (let d = 0; d < cf.length; d++) {
    const cfDigit = cf[d];
    let num = cfDigit;
    let den = 1;
    // calculate the convergent
    for (let i = d; i > 0; i--) {
      [den, num] = [num, den];
      num += den * cf[i - 1];
    }
    if (d > 0) {
      for (let i = Math.ceil(cfDigit / 2); i < cfDigit; i++) {
        const scnum = num - (cfDigit - i) * result[cind[d - 1]].n;
        const scden = den - (cfDigit - i) * result[cind[d - 1]].d;
        if (scden > maxDenominator!) break;
        const convergent = new Fraction(scnum, scden);
        // See https://en.wikipedia.org/wiki/Continued_fraction#Semiconvergents
        // for the origin of this half-rule
        if (2 * i > cfDigit) {
          result.push(convergent);
        } else if (
          convergent
            .sub(x)
            .abs()
            .compare(result[result.length - 1].sub(x).abs()) < 0
        ) {
          result.push(convergent);
        }
        if (result.length >= maxLength!) {
          return result;
        }
      }
    }
    if (den > maxDenominator!) break;
    cind.push(result.length);
    result.push(new Fraction(num, den));
    if (result.length >= maxLength!) {
      return result;
    }
  }
  return result;
}

export function isSafeFraction(fraction: Fraction) {
  return (
    fraction.n <= Number.MAX_SAFE_INTEGER &&
    fraction.d <= Number.MAX_SAFE_INTEGER
  );
}

export function fractionToString(
  fraction: Fraction,
  preferredNumerator?: number,
  preferredDenominator?: number
) {
  const sign = fraction.s < 0 ? "-" : "";
  if (preferredNumerator === undefined) {
    if (
      preferredDenominator === undefined ||
      fraction.d === preferredDenominator
    ) {
      return `${sign}${fraction.n}/${fraction.d}`;
    }
    if (preferredDenominator % fraction.d === 0) {
      const multiplier = preferredDenominator / fraction.d;
      return `${sign}${fraction.n * multiplier}/${fraction.d * multiplier}`;
    }
    return `${sign}${fraction.n}/${fraction.d}`;
  }
  if (fraction.n === preferredNumerator) {
    return `${sign}${fraction.n}/${fraction.d}`;
  }
  if (preferredNumerator % fraction.n === 0) {
    const multiplier = preferredNumerator / fraction.n;
    return `${sign}${fraction.n * multiplier}/${fraction.d * multiplier}`;
  }
  return `${sign}${fraction.n}/${fraction.d}`;
}

export function centsToNats(cents: number) {
  return (cents / 1200) * Math.LN2;
}

export function natsToCents(nats: number) {
  return (nats / Math.LN2) * 1200;
}

export function debounce(func: (...args: any[]) => void, timeout = 300) {
  let timer: number;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

export function valueToCents(value: number) {
  return (Math.log(value) / Math.LN2) * 1200;
}

export function mtof(index: number) {
  return 440 * Math.pow(2, (index - 69) / 12);
}

export function ratioToCents(ratio: number) {
  return 1200 * Math.log2(ratio);
}

export function frequencyToCentOffset(frequency: number) {
  return ratioToCents(frequency / 440);
}

// convert a frequency to an MTS value
export function frequencyToMts(frequency: number) {
  return MIDI_NOTE_NUMBER_OF_A4 + 12 * Math.log2(frequency / 440);
}

// convert a frequency to a midi note number and cents offset
// assuming 12-edo at 440Hz
// returns an array [midiNoteNumber, centsOffset]
export function ftom(frequency: number) {
  const semitones = frequencyToMts(frequency);
  const midiNoteNumber = Math.round(semitones);
  const centsOffset = (semitones - midiNoteNumber) * 100;
  return [midiNoteNumber, centsOffset];
}

const MIDI_NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// Find MIDI note name from MIDI note number
export function midiNoteNumberToName(noteNumber: number) {
  const remainder = mmod(noteNumber, 12);
  const quotient = (noteNumber - remainder) / 12;
  return MIDI_NOTE_NAMES[remainder] + quotient.toString();
}

export function clamp(minValue: number, maxValue: number, value: number) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

export function sanitizeFilename(input: string) {
  input = input.trim();
  if (!input.length) {
    return "untitled scale";
  }
  return input
    .replace(/[|&;$%@"<>()+,?]/g, "")
    .replace(/\//g, "_")
    .replace(/\\/g, "_");
}
