import { reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { UNIX_NEWLINE } from '@/constants'

export const useStateStore = defineStore('state', () => {
  const isomorphicVertical = ref(5)
  const isomorphicHorizontal = ref(1)
  // Mapping from MIDI index to number of interfaces currently pressing the key down
  const heldNotes = reactive(new Map<number, number>())
  const typingActive = ref(true)

  const latticeType = ref<'ji' | 'et'>('et')

  // These user preferences are fetched from local storage.
  const storage = window.localStorage
  const newline = ref(storage.getItem('newline') ?? UNIX_NEWLINE)

  const storedScheme = storage.getItem('colorScheme')
  const mediaScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const colorScheme = ref<'light' | 'dark'>(
    (storedScheme ?? mediaScheme) === 'dark' ? 'dark' : 'light'
  )
  const centsFractionDigits = ref(parseInt(storage.getItem('centsFractionDigits') ?? '3', 10))
  const decimalFractionDigits = ref(parseInt(storage.getItem('decimalFractionDigits') ?? '5', 10))
  const showVirtualQwerty = ref(storage.getItem('showVirtualQwerty') === 'true')
  const intervalMatrixIndexing = ref(parseInt(storage.getItem('intervalMatrixIndexing') ?? '0', 10))

  // Special keyboard codes also from local storage.
  const deactivationCode = ref(storage.getItem('deactivationCode') ?? 'Backquote')
  const equaveUpCode = ref(storage.getItem('equaveUpCode') ?? 'NumpadMultiply')
  const equaveDownCode = ref(storage.getItem('equaveDownCode') ?? 'NumpadDivide')
  const degreeUpCode = ref(storage.getItem('degreeUpCode') ?? 'NumpadAdd')
  const degreeDownCode = ref(storage.getItem('degreeDownCode') ?? 'NumpadSubtract')

  // Local storage watchers
  watch(newline, (newValue) => window.localStorage.setItem('newline', newValue))
  watch(
    colorScheme,
    (newValue) => {
      window.localStorage.setItem('colorScheme', newValue)
      document.documentElement.setAttribute('data-theme', newValue)
    },
    { immediate: true }
  )
  watch(centsFractionDigits, (newValue) =>
    window.localStorage.setItem('centsFractionDigits', newValue.toString())
  )
  watch(decimalFractionDigits, (newValue) =>
    window.localStorage.setItem('decimalFractionDigits', newValue.toString())
  )
  watch(showVirtualQwerty, (newValue) =>
    window.localStorage.setItem('showVirtualQwerty', newValue.toString())
  )
  watch(intervalMatrixIndexing, (newValue) =>
    window.localStorage.setItem('intervalMatrixIndexing', newValue.toString())
  )
  // Store keymaps
  watch(deactivationCode, (newValue) => window.localStorage.setItem('deactivationCode', newValue))
  watch(equaveUpCode, (newValue) => window.localStorage.setItem('equaveUpCode', newValue))
  watch(equaveDownCode, (newValue) => window.localStorage.setItem('equaveDownCode', newValue))
  watch(degreeUpCode, (newValue) => window.localStorage.setItem('degreeUpCode', newValue))
  watch(degreeDownCode, (newValue) => window.localStorage.setItem('degreeDownCode', newValue))

  return {
    // Live state
    isomorphicVertical,
    isomorphicHorizontal,
    heldNotes,
    typingActive,
    latticeType,
    // Persistent state
    newline,
    colorScheme,
    centsFractionDigits,
    decimalFractionDigits,
    showVirtualQwerty,
    intervalMatrixIndexing,
    deactivationCode,
    equaveUpCode,
    equaveDownCode,
    degreeUpCode,
    degreeDownCode
  }
})
