<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Fraction, isPrime, mmod, nthPrime, primeLimit } from 'xen-dev-utils'
import GridLattice from '@/components/GridLattice.vue'
import EdoCycles from '@/components/EdoCycles.vue'
import JustIntonationLattice from '@/components/JustIntonationLattice.vue'
import Modal from '@/components/ModalDialog.vue'
import { useStateStore } from '@/stores/state'
import { useScaleStore } from '@/stores/scale'
import { useJiLatticeStore } from '@/stores/ji-lattice'
import { useGridStore } from '@/stores/grid'
import { useCyclesStore } from '@/stores/edo-cycles'
import { setAndReportValidity } from '@/utils'
import Faux3DLattice from '@/components/Faux3DLattice.vue'
import { TimeMonzo } from 'sonic-weave'

const state = useStateStore()
const scale = useScaleStore()
const jiLattice = useJiLatticeStore()
const grid = useGridStore()
const cycles = useCyclesStore()

const showConfig = ref(false)
const jiPreset = ref<'nothing' | 'grady' | 'grady3' | 'dakota' | 'pr72' | 'pe72'>('nothing')
const etPreset = ref<'nothing' | '12' | '53' | '311' | 'b13'>('nothing')
const preset3D = ref<'nothing' | 'WGP' | 'sphere' | 'sphere3'>('nothing')

const extraEdgesElement = ref<HTMLInputElement | null>(null)
watch(extraEdgesElement, (newElement) => setAndReportValidity(newElement, jiLattice.edgesError), {
  immediate: true
})
watch(
  () => jiLattice.edgesError,
  (newError) => setAndReportValidity(extraEdgesElement.value, newError),
  { immediate: true }
)

const edgesElement = ref<HTMLInputElement | null>(null)
watch(edgesElement, (newElement) => setAndReportValidity(newElement, grid.edgesError), {
  immediate: true
})
watch(
  () => grid.edgesError,
  (newError) => setAndReportValidity(edgesElement.value, newError),
  { immediate: true }
)

const heldNotes = computed(() => {
  const perm = scale.latticePermutation
  const result: Set<number> = new Set()
  for (const midiIndex of state.heldNotes.keys()) {
    if (state.heldNotes.get(midiIndex)! > 0) {
      // Offset by 1 to match relativeIntervals
      result.add(perm[mmod(midiIndex - scale.scale.baseMidiNote - 1, scale.scale.size)])
    }
  }
  return result
})

const monzos3D = computed(() => {
  const numComponents = Math.max(
    jiLattice.xCoords.length,
    jiLattice.yCoords.length,
    jiLattice.zCoords.length
  )
  const result: number[][] = []
  for (const interval of scale.latticeIntervals) {
    const value = interval.value.clone()
    if (value instanceof TimeMonzo) {
      value.numberOfComponents = numComponents
      const monzo = value.primeExponents.map((pe) => pe.valueOf())
      result.push(monzo)
    } else {
      result.push(Array(numComponents).fill(0))
    }
  }
  return result
})

watch(jiPreset, (newValue) => {
  switch (newValue) {
    case 'grady':
      jiLattice.kraigGrady()
      return
    case 'grady3':
      jiLattice.kraigGrady(1)
      return
    case 'dakota':
      jiLattice.scott24()
      return
    case 'pr72':
      jiLattice.pr72()
      return
    case 'pe72':
      jiLattice.pe72()
      return
  }
})

watch(etPreset, (newValue) => {
  switch (newValue) {
    case '12':
      grid.square(12)
      return
    case '53':
      grid.tonnetz(53)
      return
    case '311':
      grid.preset311()
      return
    case 'b13':
      grid.squareBP(13)
      return
  }
})

watch(preset3D, (newValue) => {
  switch (newValue) {
    case 'WGP':
      jiLattice.WGP()
      break
    case 'sphere':
      jiLattice.sphere()
      break
    case 'sphere3':
      jiLattice.sphere(1)
      break
  }
  jiLattice.autoDepth(monzos3D.value)
})

function inferConfig() {
  // Default to 12-TET even if it looks bad
  state.latticeType = 'et'

  // Infer initial configuration
  const monzos = scale.latticeIntervals.map((i) => i.value)
  if (!monzos.length) {
    return
  }

  let equave = monzos[monzos.length - 1]
  if (scale.latticeEquave) {
    equave = scale.latticeEquave.value
  }

  let isFractional = true
  let isEqualTemperament = true
  for (const monzo of monzos) {
    if (!monzo.isFractional()) {
      isFractional = false
    }
    if (!monzo.isEqualTemperament()) {
      isEqualTemperament = false
    }
  }

  if (isFractional) {
    let limit = 0
    for (const monzo of monzos) {
      try {
        const { n, d } = monzo.toFraction()
        limit = Math.max(primeLimit(n, true), primeLimit(d, true), limit)
      } catch {
        return
      }
    }

    let equaveIndex = 0
    const { n, d } = equave.toFraction()
    if (d === 1 && isPrime(n)) {
      equaveIndex = primeLimit(n, true) - 1
    }
    // Set the config for 3D too, but use isometric by default
    if (limit <= 9) {
      jiLattice.WGP(equaveIndex)
      jiLattice.autoDepth(monzos3D.value)
      jiLattice.kraigGrady(equaveIndex)
    } else if (limit <= 24) {
      jiLattice.sphere(equaveIndex, 24)
      jiLattice.autoDepth(monzos3D.value)
      jiLattice.scott24(equaveIndex)
    } else if (equaveIndex < 72) {
      jiLattice.sphere(equaveIndex, 72)
      jiLattice.autoDepth(monzos3D.value)
      jiLattice.pe72(equaveIndex)
    } else {
      return
    }
    state.latticeType = 'ji'
    return
  }

  if (isEqualTemperament) {
    if (!equave.isFractional()) {
      return
    }
    try {
      const { n, d } = equave.toFraction()
      let wartPrefix = ''
      let edges = '3/2 5/4'
      if (d === 1 && isPrime(n)) {
        const index = primeLimit(n, true) - 1
        if (index > 14) {
          return
        }
        if (index) {
          wartPrefix = String.fromCharCode(97 + index)
          const e1 = new Fraction(nthPrime(index + 1)).geoMod(n)
          const e2 = new Fraction(nthPrime(index + 2)).geoMod(n)
          edges = `${e1.toFraction()} ${e2.toFraction()}`
        }
      } else {
        return
      }

      let divisions = 1
      for (const monzo of monzos) {
        const log = monzo.log(equave)
        if (typeof log === 'number') {
          return
        }
        divisions = Math.max(log.d, divisions)
      }
      grid.valString = `${wartPrefix}${divisions}p`
      grid.edgesString = edges
      grid.autoSquare()
      state.latticeType = 'et'

      // Set config, but don't switch to
      cycles.valString = grid.valString
    } catch {
      return
    }
  }
}

onMounted(() => {
  // Non-auto lattice presumably pre-loaded from the database
  if (state.latticeType !== 'auto') {
    return
  }
  inferConfig()
})
</script>

<template>
  <main class="lattice-container">
    <h2>Lattice visualization</h2>
    <JustIntonationLattice
      v-if="state.latticeType === 'ji'"
      :labels="scale.latticeLabels"
      :colors="scale.latticeColors"
      :relativeIntervals="scale.latticeIntervals"
      :heldNotes="heldNotes"
    />
    <GridLattice
      v-else-if="state.latticeType === 'et'"
      :labels="scale.latticeLabels"
      :colors="scale.latticeColors"
      :relativeIntervals="scale.latticeIntervals"
      :heldNotes="heldNotes"
    />
    <EdoCycles
      v-else-if="state.latticeType === 'cycles'"
      :labels="scale.latticeLabels"
      :colors="scale.latticeColors"
      :relativeIntervals="scale.latticeIntervals"
      :heldNotes="heldNotes"
    />
    <Faux3DLattice
      v-else-if="state.latticeType === '3d'"
      :labels="scale.latticeLabels"
      :colors="scale.latticeColors"
      :monzos="monzos3D"
      :heldNotes="heldNotes"
    />
    <template v-else>
      <h1>Selecting lattice...</h1>
    </template>
    <button @click="showConfig = true">Configure</button>
    <Modal
      :show="showConfig"
      @confirm="showConfig = false"
      @cancel="showConfig = false"
      :right="true"
    >
      <template #header>
        <h2>Lattice configuration</h2>
      </template>
      <template #body>
        <div class="control-group">
          <div class="control radio-group">
            <label>Lattice type</label>
            <span>
              <input type="radio" id="ji" value="ji" v-model="state.latticeType" />
              <label for="ji">Just intonation</label>
            </span>
            <span>
              <input type="radio" id="et" value="et" v-model="state.latticeType" />
              <label for="et">Equal temperament</label>
            </span>
            <span>
              <input type="radio" id="cycles" value="cycles" v-model="state.latticeType" />
              <label for="cycles">Cycles</label>
            </span>
            <span>
              <input type="radio" id="3d" value="3d" v-model="state.latticeType" />
              <label for="3d">3D</label>
            </span>
          </div>
          <template v-if="state.latticeType === 'ji'">
            <div class="control">
              <label for="preset">Preset</label>
              <select id="preset" v-model="jiPreset">
                <option value="nothing">--Select preset--</option>
                <option value="grady">Kraig Grady</option>
                <option value="dakota">Scott Dakota's PR24</option>
                <option value="pr72">Scott Dakota's PR72</option>
                <option value="pe72">Prime Ellipse 72</option>
                <option value="grady3">K. Grady tritaves</option>
              </select>
            </div>
            <div class="control">
              <label for="max-distance">Maximum connection distance</label>
              <input
                id="max-distance"
                type="number"
                min="0"
                max="2"
                v-model="jiLattice.maxDistance"
              />
            </div>
            <div class="control">
              <label for="size">Text size</label>
              <input id="size" type="number" min="0.5" step="0.5" v-model="jiLattice.size" />
            </div>
            <div class="control">
              <label for="label-offset">Text offset</label>
              <input id="label-offset" type="number" step="0.1" v-model="jiLattice.labelOffset" />
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="show-labels" v-model="jiLattice.showLabels" />
              <label for="show-labels">Show labels</label>
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="draw-arrows" v-model="jiLattice.drawArrows" />
              <label for="draw-arrows">Indicate order w/ arrows</label>
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="gray-extras" v-model="jiLattice.grayExtras" />
              <label for="gray-extras">Gray extra edges</label>
            </div>
            <div class="control">
              <label for="extra-edges">Extra edges</label>
              <input
                ref="extraEdgesElement"
                id="extra-edges"
                type="text"
                class="control"
                placeholder="6/5"
                v-model="jiLattice.edgesString"
              />
            </div>
            <div class="control">
              <label for="rotation">Rotation</label>
              <input type="number" id="rotation" step="15" v-model="jiLattice.rotation" />
            </div>
            <div class="control">
              <label for="horizontals">Horizontal coordinates</label>
              <input id="horizontals" type="text" v-model="jiLattice.horizontals" />
            </div>
            <div class="control">
              <label for="verticals">Vertical coordinates</label>
              <input id="verticals" type="text" v-model="jiLattice.verticals" />
            </div>
          </template>
          <template v-else-if="state.latticeType === 'et'">
            <div class="control">
              <label for="Preset">Preset</label>
              <select v-model="etPreset">
                <option value="nothing">--Select preset--</option>
                <option value="12">Square-12p</option>
                <option value="53">Tonnetz-53p</option>
                <option value="311">13-limit 311p</option>
                <option value="b13">Square-b13p</option>
              </select>
            </div>
            <div class="btn-group">
              <button @click="grid.autoSquare">Auto-square</button>
              <button @click="grid.autoTonnetz">Auto-tonnetz</button>
            </div>
            <div class="control">
              <label for="val">Val</label>
              <input type="text" id="val" placeholder="17[^5]" v-model="grid.valString" />
            </div>
            <hr />
            <div class="control">
              <label for="delta1">Offset 1</label>
              <input type="number" id="delta1" v-model="grid.delta1" />
            </div>
            <div class="control">
              <label for="delta1X">x1</label>
              <input type="number" id="delta1X" v-model="grid.delta1X" />
            </div>
            <div class="control">
              <label for="delta1Y">y1</label>
              <input type="number" id="delta1Y" v-model="grid.delta1Y" />
            </div>
            <hr />
            <div class="control">
              <label for="delta2">Offset 2</label>
              <input type="number" id="delta2" v-model="grid.delta2" />
            </div>
            <div class="control">
              <label for="delta2X">x2</label>
              <input type="number" id="delta2X" v-model="grid.delta2X" />
            </div>
            <div class="control">
              <label for="delta2Y">y2</label>
              <input type="number" id="delta2Y" v-model="grid.delta2Y" />
            </div>
            <hr />
            <div class="control">
              <label for="edges">Edges</label>
              <input
                ref="edgesElement"
                id="edges"
                type="text"
                class="control"
                placeholder="3/2 5/4"
                v-model="grid.edgesString"
              />
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="gridlines-1" v-model="grid.gridlines1" />
              <label for="gridlines-1">Gridlines 1</label>
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="gridlines-2" v-model="grid.gridlines2" />
              <label for="gridlines-2">Gridlines 2</label>
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="diagonals-1" v-model="grid.diagonals1" />
              <label for="diagonals-1">Diagonals 1</label>
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="diagonals-2" v-model="grid.diagonals2" />
              <label for="diagonals-2">Diagonals 2</label>
            </div>
            <div class="control">
              <label for="size">Text size</label>
              <input id="size" type="number" min="0.05" step="0.05" v-model="grid.size" />
            </div>
            <div class="control">
              <label for="label-offset">Text offset</label>
              <input id="label-offset" type="number" step="0.1" v-model="grid.labelOffset" />
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="show-labels" v-model="grid.showLabels" />
              <label for="show-labels">Show labels</label>
            </div>
            <div class="control">
              <label for="view-scale">View scale</label>
              <input id="view-scale" type="number" min="0.1" step="0.1" v-model="grid.viewScale" />
            </div>
            <div class="control">
              <label for="view-x">View center x</label>
              <input id="view-x" type="number" step="0.1" v-model="grid.viewCenterX" />
            </div>
            <div class="control">
              <label for="view-y">View center y</label>
              <input id="view-y" type="number" step="0.1" v-model="grid.viewCenterY" />
            </div>
          </template>
          <template v-else-if="state.latticeType === 'cycles'">
            <div class="control">
              <label for="val">Val</label>
              <input type="text" id="val" placeholder="17c" v-model="cycles.valString" />
            </div>
            <div class="control">
              <label for="generator">Generator</label>
              <input type="number" step="1" v-model="cycles.generator" />
            </div>
            <div class="control">
              <label for="size">Text size</label>
              <input id="size" type="number" min="0.01" step="0.01" v-model="cycles.size" />
            </div>
            <div class="control">
              <label for="label-offset">Text offset</label>
              <input id="label-offset" type="number" step="0.04" v-model="cycles.labelOffset" />
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="show-labels" v-model="cycles.showLabels" />
              <label for="show-labels">Show labels</label>
            </div>
          </template>
          <template v-else-if="state.latticeType === '3d'">
            <div class="control">
              <label for="preset">Preset</label>
              <select id="preset" v-model="preset3D">
                <option value="nothing">--Select preset--</option>
                <option value="WGP">Wilson-Grady-Pakkanen</option>
                <option value="sphere">Prime sphere</option>
                <option value="sphere3">Tritave sphere</option>
              </select>
            </div>
            <div class="control">
              <label for="max-distance">Maximum connection distance</label>
              <input
                id="max-distance"
                type="number"
                min="0"
                max="2"
                v-model="jiLattice.maxDistance"
              />
            </div>
            <div class="control">
              <label for="size">Object depth</label>
              <input id="size" type="number" step="1" v-model="jiLattice.depth" />
            </div>
            <div class="control">
              <label for="size">Text size</label>
              <input id="size" type="number" min="0.5" step="0.5" v-model="jiLattice.size" />
            </div>
            <div class="control">
              <label for="label-offset">Text offset</label>
              <input id="label-offset" type="number" step="0.1" v-model="jiLattice.labelOffset" />
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="show-labels" v-model="jiLattice.showLabels" />
              <label for="show-labels">Show labels</label>
            </div>
            <div class="control checkbox-container">
              <input type="checkbox" id="gray-extras" v-model="jiLattice.grayExtras" />
              <label for="gray-extras">Gray extra edges</label>
            </div>
            <div class="control">
              <label for="extra-edges">Extra edges</label>
              <input
                ref="extraEdgesElement"
                id="extra-edges"
                type="text"
                class="control"
                placeholder="6/5"
                v-model="jiLattice.edgesString"
              />
            </div>
            <div class="control">
              <label>Pitch</label>
              <button @click="jiLattice.pitch(5)">up</button>
              <button @click="jiLattice.pitch(-5)">down</button>
            </div>
            <div class="control">
              <label>Yaw</label>
              <button @click="jiLattice.yaw(5)">left</button>
              <button @click="jiLattice.yaw(-5)">right</button>
            </div>
            <div class="control">
              <label>Roll</label>
              <button @click="jiLattice.roll(-5)">clockwise</button>
              <button @click="jiLattice.roll(5)">counterclockwise</button>
            </div>
            <div class="control">
              <label for="horizontals">Horizontal coordinates</label>
              <input id="horizontals" type="text" v-model="jiLattice.xs" />
            </div>
            <div class="control">
              <label for="verticals">Vertical coordinates</label>
              <input id="verticals" type="text" v-model="jiLattice.ys" />
            </div>
            <div class="control">
              <label for="verticals">Depthwise coordinates</label>
              <input id="verticals" type="text" v-model="jiLattice.zs" />
            </div>
          </template>
          <template v-else>
            <h2>Selecting lattice...</h2>
          </template>
        </div>
      </template>
      <template #footer>
        <div class="btn-group">
          <button @click="showConfig = false">Done</button>
          <button @click="inferConfig">Auto-config</button>
        </div>
      </template>
    </Modal>
  </main>
</template>

<style>
/* View */
main.lattice-container {
  padding: 1rem;
  overflow-y: auto !important;
  display: flex;
  flex-direction: column;
}
/* Components */
svg.lattice {
  background-color: transparent;
  flex-grow: 1;
  min-height: 10em;
}

line.edge.gridline {
  stroke: var(--color-background-soft);
}
line.edge.primary {
  stroke: var(--color-accent);
}
line.edge.custom {
  stroke: var(--color-accent-deeper);
}
line.edge.border {
  stroke: var(--color-border);
}
line.edge.auxiliary {
  stroke: var(--color-accent-mute);
  stroke-dasharray: 3 1;
}

polygon.edge.primary {
  fill: var(--color-accent);
}
polygon.edge.custom {
  fill: var(--color-accent-deeper);
}
polygon.edge.auxiliary {
  fill: var(--color-accent-mute);
}

marker#arrow {
  fill: var(--color-indicator);
}

path.arrow {
  fill: none;
  stroke: var(--color-indicator);
  stroke-dasharray: 1;
}

circle.node:not(.held) {
  stroke: var(--color-text);
}
circle.node.held {
  fill: var(--color-accent);
}
circle.node.auxiliary {
  stroke: none;
  fill: var(--color-drop-shadow);
}

text.node-label {
  font-family: sans-serif;
  fill: var(--color-text);
  text-anchor: middle;
  stroke: var(--color-background);
  dominant-baseline: middle;
}
</style>
