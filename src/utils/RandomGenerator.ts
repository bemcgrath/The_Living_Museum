/**
 * Random Utilities
 * 
 * Seeded random number generation for reproducible simulations.
 * Uses seedrandom library for consistent randomness across sessions.
 */

import seedrandom from 'seedrandom';

export class RandomGenerator {
  private rng: seedrandom.PRNG;
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.rng = seedrandom(seed.toString());
  }

  /**
   * Generate a random number between 0 and 1
   */
  random(): number {
    return this.rng();
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Generate a random integer between min (inclusive) and max (inclusive)
   */
  randomIntInclusive(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Select a random element from an array
   */
  choice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length)];
  }

  /**
   * Generate a random float between min and max
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Generate a random boolean with given probability of true
   */
  randomBool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Generate a weighted random selection
   */
  weightedChoice<T>(items: Array<{ value: T; weight: number }>): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = this.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.value;
      }
    }

    return items[items.length - 1].value;
  }

  /**
   * Generate a gaussian random number (normal distribution)
   * Using Box-Muller transform
   */
  randomGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  getSeed(): number {
    return this.seed;
  }

  reset(seed?: number): void {
    if (seed !== undefined) {
      this.seed = seed;
    }
    this.rng = seedrandom(this.seed.toString());
  }
}

// Global instance for convenience
let globalRng: RandomGenerator | null = null;

export function initializeGlobalRng(seed: number = Date.now()): RandomGenerator {
  globalRng = new RandomGenerator(seed);
  return globalRng;
}

export function getGlobalRng(): RandomGenerator {
  if (!globalRng) {
    globalRng = new RandomGenerator();
  }
  return globalRng;
}

export function resetGlobalRng(seed?: number): void {
  if (globalRng) {
    globalRng.reset(seed);
  } else {
    globalRng = new RandomGenerator(seed);
  }
}
