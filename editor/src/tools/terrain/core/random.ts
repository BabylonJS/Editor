/**
 * Seeded, deterministic random helpers (pure 32-bit integer arithmetic: identical results on every JavaScript engine).
 */

/** View used to hash the bits of non-integer values. */
const float64 = new Float64Array(1);
const float64Words = new Uint32Array(float64.buffer);

/**
 * Mulberry32 generator: returns a function giving uniformly distributed numbers in [0, 1).
 * The seed is truncated to a 32-bit integer (NaN and ±Infinity give 0).
 */
export function mulberry32(seed: number): () => number {
	let state = seed | 0;

	return () => {
		state = (state + 0x6d2b79f5) | 0;

		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Hashes any number of values into an unsigned 32-bit seed (MurmurHash3 mixing). The result depends on every value and on their order.
 * Integers (up to ±2^53) are hashed by value (their low and high 32-bit words); other numbers by their IEEE-754 bits.
 */
export function hashTerrainSeed(...values: number[]): number {
	let hash = 0x9747b28c ^ values.length;

	for (const value of values) {
		if (Number.isSafeInteger(value)) {
			hash = mixWord(hash, value >>> 0);
			hash = mixWord(hash, Math.floor(value / 4294967296) | 0);
		} else {
			float64[0] = value;
			hash = mixWord(hash, float64Words[0]);
			hash = mixWord(hash, float64Words[1] ^ 0x5bd1e995);
		}
	}

	// fmix32 finalizer.
	hash ^= hash >>> 16;
	hash = Math.imul(hash, 0x85ebca6b);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 0xc2b2ae35);
	hash ^= hash >>> 16;

	return hash >>> 0;
}

/** One MurmurHash3 block round. */
function mixWord(hash: number, word: number): number {
	let k = Math.imul(word, 0xcc9e2d51);
	k = (k << 15) | (k >>> 17);
	k = Math.imul(k, 0x1b873593);

	let h = hash ^ k;
	h = (h << 13) | (h >>> 19);

	return (Math.imul(h, 5) + 0xe6546b64) | 0;
}
