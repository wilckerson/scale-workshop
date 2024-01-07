import { Scale } from "@/scale"
import { midiNoteNumberToEnharmonics, type AccidentalStyle } from "@/utils"
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"
import { Fraction, mmod, mtof } from "xen-dev-utils"
import { getSourceVisitor, parseAST, relin, Interval, TimeMonzo, str } from "sonic-weave"
import { DEFAULT_NUMBER_OF_COMPONENTS, MIDI_NOTE_COLORS, MIDI_NOTE_NAMES, NUMBER_OF_NOTES, TET12 } from "@/constants"

// Colors from #1 to #12 inclusive.
function defaultColors(base: number) {
  return [...Array(12).keys()].map(i => MIDI_NOTE_COLORS[mmod(base + 1 + i, 12)])
}

// Labels from #1 to #12 inclusive.
function defaultLabels(base: number, accidentalStyle: AccidentalStyle) {
  const result = [...Array(12).keys()].map(i => MIDI_NOTE_NAMES[mmod(base + 1 + i, 12)])
  if (accidentalStyle === 'ASCII') {
    return result
  }
  return result.map(n => n.replace('#', '♯'))
}

export const useScaleStore = defineStore('scale', () => {
  // Note that most of these values are debounce-computed due to being expensive.
  // The second party is responsible for debouncing `computeScale`.
  const accidentalPreference = ref<AccidentalStyle>(
    (localStorage.getItem('accidentalPreference') as AccidentalStyle) ?? 'double'
  )
  const name = ref('')
  const baseMidiNote = ref(60)
  const enharmonics = computed(() => midiNoteNumberToEnharmonics(baseMidiNote.value, accidentalPreference.value))
  const enharmonic = ref(enharmonics.value[0])
  const userBaseFrequency = ref(261.63);
  const autoFrequency = ref(true)
  const baseFrequency = computed({
    get() {
      return autoFrequency.value ? mtof(baseMidiNote.value) : userBaseFrequency.value
    },
    set(value: number) {
      userBaseFrequency.value = value
    }
  })
  const sourceText = ref('')
  const scale = ref(new Scale(TET12, baseFrequency.value ,baseMidiNote.value));
  const colors = ref(defaultColors(baseMidiNote.value));
  const labels = ref(defaultLabels(baseMidiNote.value, accidentalPreference.value));
  const error = ref('')

  // === Computed state ===
  const autoLine = computed(() => {
    const base = `numComponents(${DEFAULT_NUMBER_OF_COMPONENTS})\n`
    if (autoFrequency.value) {
      return `${base}${enharmonic.value} = mtof(_) = 1/1`;
    }
    return `${base}${enharmonic.value} = baseFrequency = 1/1`;
  })

  const frequencies = computed(() =>
    scale.value.getFrequencyRange(0, NUMBER_OF_NOTES)
  )

  // State synchronization
  watch([baseMidiNote, accidentalPreference], () => {
    enharmonic.value = enharmonics.value[0]
  });

  // Sanity watchers
  watch(baseMidiNote, (newValue) => {
    if (isNaN(newValue)) {
      baseMidiNote.value = 60
    } else if (Math.round(newValue) != newValue) {
      baseMidiNote.value = Math.round(newValue)
    }
  })

  // Local storage watchers
  watch(accidentalPreference, (newValue) => localStorage.setItem('accidentalPreference', newValue))

  // Local helpers
  function getVisitor() {
    const visitor = getSourceVisitor();
    // TODO: Make this a user preference.
    visitor.rootContext.gas = 10000;

    // Inject global variables
    visitor.context.set('scaleName', name.value);
    const _ = Interval.fromInteger(baseMidiNote.value);
    visitor.context.set('_', _)
    visitor.context.set('baseMidiNote', _)
    const baseFreq = new Interval(TimeMonzo.fromValue(baseFrequency.value), 'linear');
    baseFreq.value.timeExponent = new Fraction(-1);
    visitor.context.set('baseFrequency', baseFreq);

    const autoAst = parseAST(autoLine.value);
    for (const statement of autoAst.body) {
      visitor.visit(statement);
    }

    return visitor
  }

  // Methods
  function computeScale() {
    try {
      const visitor = getVisitor()

      const ast = parseAST(sourceText.value);
      for (const statement of ast.body) {
        const interupt = visitor.visit(statement);
        if (interupt) {
          throw new Error('Illegal statement');
        }
      }
      const intervals = visitor.context.get('$') as Interval[];
      if (!Array.isArray(intervals)) {
        throw new Error('Context corruption detected');
      }
      const rl = relin.bind(visitor);
      const ratios = intervals.map(i => rl(i).value.valueOf());
      let visitorBaseFrequency = mtof(baseMidiNote.value);
      if (visitor.rootContext.unisonFrequency) {
        visitorBaseFrequency = visitor.rootContext.unisonFrequency.valueOf();
      }
      if (ratios.length) {
        const name = str.bind(visitor);
        scale.value = new Scale(ratios, visitorBaseFrequency, baseMidiNote.value);
        colors.value = intervals.map((interval, i) => interval.color?.value ?? (i === intervals.length - 1 ? 'gray' : 'silver'));
        labels.value = intervals.map((interval) => interval.label || name(interval));
        error.value = '';
      } else {
        scale.value = new Scale(TET12, visitorBaseFrequency, baseMidiNote.value);
        colors.value = defaultColors(baseMidiNote.value);
        labels.value = defaultLabels(baseMidiNote.value, accidentalPreference.value);
        error.value = 'Empty scale defaults to 12-tone equal temperament.';
      }
    } catch (e) {
      if (e instanceof Error) {
        error.value = e.message;
      } else if (typeof e === 'string') {
        error.value = e;
      }
    }
  }

  function getFrequency(index: number) {
    if (index >= 0 && index < frequencies.value.length) {
      return frequencies.value[index]
    } else {
      // Support more than 128 notes with some additional computational cost
      return scale.value.getFrequency(index)
    }
  }

  function sort() {
    sourceText.value += ';sort()'
    const visitor = getVisitor()
    const defaults = visitor.clone()
    defaults.rootContext = defaults.rootContext.clone()

    const ast = parseAST(sourceText.value);
    for (const statement of ast.body) {
      const interupt = visitor.visit(statement);
      if (interupt) {
        throw new Error('Illegal statement');
      }
    }
    sourceText.value = visitor.expand(defaults);
    computeScale();
  }

  function reduce() {
    sourceText.value += ';reduce()'
    const visitor = getVisitor()
    const defaults = visitor.clone()
    defaults.rootContext = defaults.rootContext.clone()

    const ast = parseAST(sourceText.value);
    for (const statement of ast.body) {
      const interupt = visitor.visit(statement);
      if (interupt) {
        throw new Error('Illegal statement');
      }
    }
    sourceText.value = visitor.expand(defaults);
    computeScale();
  }

  return {
    // Live state
    name,
    baseMidiNote,
    enharmonics,
    enharmonic,
    userBaseFrequency,
    autoFrequency,
    baseFrequency,
    autoLine,
    sourceText,
    scale,
    colors,
    labels,
    error,
    // Presistent state
    accidentalPreference,
    // Computed state
    frequencies,
    // Methods
    computeScale,
    getFrequency,
    sort,
    reduce,
  }
})
