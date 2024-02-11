import { mosPatterns, toBrightGeneratorPerPeriod } from 'moment-of-symmetry'
import {
  type Val,
  type SubgroupValue,
  Temperament,
  type TuningOptions,
  fromWarts,
  type Weights,
  Subgroup,
  type JipOrLimit
} from 'temperaments'
import { DEFAULT_NUMBER_OF_COMPONENTS } from './constants'
import { PRIME_CENTS, valueToCents, type FractionValue, type Monzo } from 'xen-dev-utils'

export function toPrimeMapping(mapping: number[], subgroup: Subgroup) {
  const result = subgroup.toPrimeMapping(mapping)

  while (result.length > DEFAULT_NUMBER_OF_COMPONENTS) {
    result.pop()
  }
  while (result.length < DEFAULT_NUMBER_OF_COMPONENTS) {
    result.push(PRIME_CENTS[result.length])
  }
  return result as number[]
}

export class Mapping {
  vector: number[]

  constructor(vector: number[]) {
    this.vector = vector
  }

  static fromVals(
    vals: (Val | number | string)[],
    numberOfComponents: number,
    subgroup: SubgroupValue,
    options?: TuningOptions
  ) {
    const temperament = Temperament.fromVals(vals, subgroup)
    return Mapping.fromTemperament(temperament, numberOfComponents, options)
  }

  static fromCommas(
    commaList: (Monzo | FractionValue)[],
    numberOfComponents: number,
    subgroup?: SubgroupValue,
    options?: TuningOptions
  ) {
    const temperament = Temperament.fromCommas(commaList, subgroup, true)
    return Mapping.fromTemperament(temperament, numberOfComponents, options)
  }

  static fromTemperament(
    temperament: Temperament,
    numberOfComponents: number,
    options?: TuningOptions
  ) {
    options = Object.assign({}, options || {})
    options.primeMapping = true
    options.units = 'cents'
    const mapping = temperament.getMapping(options)
    if (mapping.length > numberOfComponents) {
      throw new Error('Not enough components to represent mapping')
    }
    while (mapping.length < numberOfComponents) {
      mapping.push(PRIME_CENTS[mapping.length])
    }

    return new Mapping(mapping)
  }

  static fromWarts(wartToken: number | string, jipOrLimit: JipOrLimit, equaveCents?: number) {
    // XXX: There's something weird going on with how fromWarts gets transpiled
    let mapping: Val
    if (typeof jipOrLimit === 'number') {
      mapping = fromWarts(wartToken, jipOrLimit)
    } else {
      mapping = fromWarts(wartToken, jipOrLimit)
    }
    if (!mapping.length) {
      throw new Error('Failed to produce mapping')
    }
    if (equaveCents === undefined) {
      if (Array.isArray(jipOrLimit)) {
        equaveCents = jipOrLimit[0]
      } else {
        equaveCents = 1200
      }
    }
    const vector: number[] = []
    mapping.forEach((steps) => {
      vector.push((equaveCents! * steps) / mapping[0])
    })
    return new Mapping(vector)
  }

  get size() {
    return this.vector.length
  }

  pureOctaves() {
    const purifier = 1200 / this.vector[0]
    return new Mapping(this.vector.map((component) => component * purifier))
  }

  /*
  apply(interval: Interval): Interval
  apply(scale: Scale): Scale
  apply(intervalOrScale: Interval | Scale): Interval | Scale {
    if (intervalOrScale instanceof Interval) {
      const interval = intervalOrScale
      const monzo = interval.monzo
      const totalCents = monzo.totalCents()
      if (!totalCents) {
        return interval
      }
      const cents =
        monzo.vector
          .map((component, i) => component.valueOf() * this.vector[i])
          .reduce((a, b) => a + b) +
        valueToCents(monzo.residual.valueOf()) +
        monzo.cents
      const tempered = monzo.stretch(cents / totalCents)
      return new Interval(tempered, interval.type, interval.name, interval.options)
    }
    const scale = intervalOrScale
    const intervals = scale.intervals.map((interval) => this.apply(interval))
    return new Scale(intervals, this.apply(scale.equave), scale.baseFrequency)
  }
  */
}

/*
// (TE-)optimized equal temperaments
export function makeRank1(val: Val | string | number, subgroup: SubgroupValue, weights?: Weights) {
  subgroup = new Subgroup(subgroup)
  if (typeof val === 'number' || typeof val === 'string') {
    val = subgroup.fromWarts(val)
  }

  const equave = subgroup.basis[0]
  const divisions = val[0]
  const scale = Scale.fromEqualTemperament(divisions, equave, DEFAULT_NUMBER_OF_COMPONENTS)

  const mapping = Mapping.fromVals([val], DEFAULT_NUMBER_OF_COMPONENTS, subgroup, {
    temperEquaves: true,
    weights
  })
  return mapping.apply(scale)
}
*/

function mosPatternsRank2(
  temperament: Temperament,
  maxSize?: number,
  maxLength?: number,
  options?: TuningOptions
) {
  const numPeriods = temperament.numPeriodsGenerators()[0]
  const [period, generator] = temperament.periodGenerators(options)
  return mosPatterns(generator / period, numPeriods, maxSize, maxLength)
}

export function mosPatternsRank2FromVals(
  vals: (Val | number | string)[],
  subgroup: SubgroupValue,
  maxSize?: number,
  maxLength?: number,
  options?: TuningOptions
) {
  const temperament = Temperament.fromVals(vals, subgroup)
  const rank = temperament.getRank()
  if (rank !== 2) {
    throw new Error(`Given vals define a rank ${rank} temperament. Need rank 2.`)
  }
  return mosPatternsRank2(temperament, maxSize, maxLength, options)
}

export function mosPatternsRank2FromCommas(
  commas: (Monzo | FractionValue)[],
  subgroup?: SubgroupValue,
  maxSize?: number,
  maxLength?: number,
  options?: TuningOptions
) {
  const temperament = Temperament.fromCommas(commas, subgroup, true)
  const rank = temperament.getRank()
  if (rank !== 2) {
    throw new Error(`Given commas and subgroup define a rank ${rank} temperament. Need rank 2.`)
  }
  return mosPatternsRank2(temperament, maxSize, maxLength, options)
}

export type Rank2Params = {
  generator: number
  period: number
  numPeriods: number
}

function makeRank2(temperament: Temperament, size: number, options?: TuningOptions): Rank2Params {
  const numPeriods = temperament.numPeriodsGenerators()[0]
  if (size % numPeriods) {
    throw new Error(`Given size '${size}' isn't a multiple of ${numPeriods}`)
  }
  const segmentSize = size / numPeriods

  const [period, generator] = temperament.periodGenerators(options)
  const brightGenerator = toBrightGeneratorPerPeriod(generator / period, segmentSize) * period

  return { generator: brightGenerator, period, numPeriods }
}

export function makeRank2FromVals(
  vals: (Val | number | string)[],
  size: number,
  subgroup: SubgroupValue,
  options?: TuningOptions
) {
  const temperament = Temperament.fromVals(vals, subgroup)
  const rank = temperament.getRank()
  if (rank !== 2) {
    throw new Error(`Given vals define a rank ${rank} temperament. Need rank 2.`)
  }
  return makeRank2(temperament, size, options)
}

export function makeRank2FromCommas(
  commas: (Monzo | FractionValue)[],
  size: number,
  subgroup?: SubgroupValue,
  options?: TuningOptions
) {
  const temperament = Temperament.fromCommas(commas, subgroup, true)
  const rank = temperament.getRank()
  if (rank !== 2) {
    throw new Error(`Given commas and subgroup define a rank ${rank} temperament. Need rank 2.`)
  }
  return makeRank2(temperament, size, options)
}

/*
export function stretchToEdo(interval: Interval, steps: number, edo: number): Interval
export function stretchToEdo(scale: Scale, steps: number[], edo: number): Scale
export function stretchToEdo(
  intervalOrScale: Interval | Scale,
  steps: number | number[],
  edo: number
): Interval | Scale {
  if (intervalOrScale instanceof Interval) {
    if (Array.isArray(steps)) {
      throw new Error('Steps must be a single number')
    }
    const interval = intervalOrScale
    const monzo = interval.monzo
    const totalCents = monzo.totalCents()
    if (!totalCents) {
      return interval
    }
    const targetCents = (1200.0 * steps) / edo + monzo.cents
    const tempered = monzo.stretch(targetCents / totalCents)
    return new Interval(tempered, interval.type, interval.name, interval.options)
  }
  if (!Array.isArray(steps)) {
    throw new Error('Steps must be an array of numbers')
  }
  const scale = intervalOrScale
  if (steps.length !== scale.size + 1) {
    throw new Error('Steps must align with the scale')
  }
  const intervals = scale.intervals.map((interval, i) => stretchToEdo(interval, steps[i], edo))
  return new Scale(
    intervals,
    stretchToEdo(scale.equave, steps[steps.length - 1], edo),
    scale.baseFrequency
  )
}
*/
