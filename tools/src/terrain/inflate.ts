/*
 * Pure-JS zlib inflater (RFC 1950 / RFC 1951), used by decodeTerrainPng when DecompressionStream is missing or fails (§5.6.3).
 * Huffman codes are decoded through lookup tables indexed by the next `bits` bits of the stream (LSB first, codes bit-reversed):
 * entry = symbol << 4 | code length, 0 = invalid code.
 */

/** Base lengths of the length symbols 257..285 (RFC 1951 §3.2.5). */
const TERRAIN_INFLATE_LENGTH_BASE = new Uint16Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]);
const TERRAIN_INFLATE_LENGTH_EXTRA = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]);
/** Base distances of the distance symbols 0..29. */
const TERRAIN_INFLATE_DISTANCE_BASE = new Uint16Array([
	1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
]);
const TERRAIN_INFLATE_DISTANCE_EXTRA = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
/** Order of the code length code lengths in a dynamic block header. */
const TERRAIN_INFLATE_CODE_LENGTH_ORDER = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);

/** Zero bytes the bit reader may pad past the end of the input before the stream is declared truncated. */
const TERRAIN_INFLATE_MAX_PADDING = 4;

interface ITerrainHuffmanTable {
	/** symbol << 4 | length; 0 = no code. */
	table: Uint16Array;
	/** Longest code length (table size = 1 << bits); 0 when the alphabet has no code. */
	bits: number;
}

let fixedLiteralTable: ITerrainHuffmanTable | null = null;
let fixedDistanceTable: ITerrainHuffmanTable | null = null;

/**
 * Pure-JS zlib (RFC 1950 header, RFC 1951 stored/fixed/dynamic Huffman blocks; Adler-32 not verified). null on corrupt input (never throws).
 * The 4 bytes of the Adler-32 trailer must be present (a stream cut anywhere is reported as truncated); bytes after it are ignored.
 */
export function inflateTerrainZlib(data: Uint8Array): Uint8Array | null {
	try {
		return inflateZlibStream(data);
	} catch {
		return null;
	}
}

function buildHuffmanTable(lengths: Uint8Array, offset: number, count: number): ITerrainHuffmanTable | null {
	const lengthCounts = new Uint16Array(16);
	let bits = 0;

	for (let i = 0; i < count; ++i) {
		const length = lengths[offset + i];
		if (length) {
			lengthCounts[length]++;
			if (length > bits) {
				bits = length;
			}
		}
	}

	if (!bits) {
		return { table: new Uint16Array(1), bits: 0 };
	}

	// Over-subscribed codes are invalid; incomplete codes are accepted (their unused entries stay 0 = invalid).
	let left = 1;
	for (let length = 1; length <= 15; ++length) {
		left = (left << 1) - lengthCounts[length];
		if (left < 0) {
			return null;
		}
	}

	const nextCode = new Uint16Array(16);
	for (let length = 1, code = 0; length <= 15; ++length) {
		code = (code + (length > 1 ? lengthCounts[length - 1] : 0)) << 1;
		nextCode[length] = code;
	}

	const size = 1 << bits;
	const table = new Uint16Array(size);

	for (let symbol = 0; symbol < count; ++symbol) {
		const length = lengths[offset + symbol];
		if (!length) {
			continue;
		}

		const code = nextCode[length]++;

		let reversed = 0;
		for (let i = 0; i < length; ++i) {
			reversed |= ((code >> i) & 1) << (length - 1 - i);
		}

		const entry = (symbol << 4) | length;
		for (let i = reversed; i < size; i += 1 << length) {
			table[i] = entry;
		}
	}

	return { table, bits };
}

function getFixedTables(): [ITerrainHuffmanTable, ITerrainHuffmanTable] {
	if (!fixedLiteralTable || !fixedDistanceTable) {
		const literalLengths = new Uint8Array(288);
		literalLengths.fill(8, 0, 144);
		literalLengths.fill(9, 144, 256);
		literalLengths.fill(7, 256, 280);
		literalLengths.fill(8, 280, 288);

		const distanceLengths = new Uint8Array(32);
		distanceLengths.fill(5);

		fixedLiteralTable = buildHuffmanTable(literalLengths, 0, 288);
		fixedDistanceTable = buildHuffmanTable(distanceLengths, 0, 32);
	}

	return [fixedLiteralTable!, fixedDistanceTable!];
}

function growOutput(output: Uint8Array, used: number, needed: number): Uint8Array {
	let size = output.length * 2;
	while (size < needed) {
		size *= 2;
	}

	const grown = new Uint8Array(size);
	grown.set(output.subarray(0, used));
	return grown;
}

function inflateZlibStream(data: Uint8Array): Uint8Array | null {
	if (data.length < 2) {
		return null;
	}

	// RFC 1950 header: CM = 8 (deflate), CINFO <= 7, FCHECK, no preset dictionary.
	const cmf = data[0];
	const flg = data[1];
	if ((cmf & 0x0f) !== 8 || cmf >> 4 > 7 || ((cmf << 8) | flg) % 31 !== 0 || flg & 0x20) {
		return null;
	}

	const end = data.length;
	let position = 2;
	let bitBuffer = 0;
	let bitCount = 0;

	let output: Uint8Array = new Uint8Array(Math.max(1024, data.length * 4));
	let outputLength = 0;

	let lastBlock = 0;
	do {
		while (bitCount < 3) {
			if (position >= end + TERRAIN_INFLATE_MAX_PADDING) {
				return null;
			}
			bitBuffer |= (position < end ? data[position] : 0) << bitCount;
			position++;
			bitCount += 8;
		}

		lastBlock = bitBuffer & 1;
		const type = (bitBuffer >>> 1) & 3;
		bitBuffer >>>= 3;
		bitCount -= 3;

		if (type === 0) {
			// Stored block: drop the bits up to the byte boundary and give the whole buffered bytes back to the input.
			bitBuffer = 0;
			position -= bitCount >> 3;
			bitCount = 0;

			if (position + 4 > end) {
				return null;
			}

			const length = data[position] | (data[position + 1] << 8);
			const complement = data[position + 2] | (data[position + 3] << 8);
			if ((length ^ 0xffff) !== complement) {
				return null;
			}

			position += 4;
			if (position + length > end) {
				return null;
			}

			if (outputLength + length > output.length) {
				output = growOutput(output, outputLength, outputLength + length);
			}

			output.set(data.subarray(position, position + length), outputLength);
			outputLength += length;
			position += length;
			continue;
		}

		let literalTable: ITerrainHuffmanTable | null;
		let distanceTable: ITerrainHuffmanTable | null;

		if (type === 1) {
			[literalTable, distanceTable] = getFixedTables();
		} else if (type === 2) {
			// Dynamic block header.
			while (bitCount < 14) {
				if (position >= end + TERRAIN_INFLATE_MAX_PADDING) {
					return null;
				}
				bitBuffer |= (position < end ? data[position] : 0) << bitCount;
				position++;
				bitCount += 8;
			}

			const literalCount = (bitBuffer & 31) + 257;
			const distanceCount = ((bitBuffer >>> 5) & 31) + 1;
			const codeLengthCount = ((bitBuffer >>> 10) & 15) + 4;
			bitBuffer >>>= 14;
			bitCount -= 14;

			if (literalCount > 286 || distanceCount > 30) {
				return null;
			}

			const codeLengthLengths = new Uint8Array(19);
			for (let i = 0; i < codeLengthCount; ++i) {
				while (bitCount < 3) {
					if (position >= end + TERRAIN_INFLATE_MAX_PADDING) {
						return null;
					}
					bitBuffer |= (position < end ? data[position] : 0) << bitCount;
					position++;
					bitCount += 8;
				}

				codeLengthLengths[TERRAIN_INFLATE_CODE_LENGTH_ORDER[i]] = bitBuffer & 7;
				bitBuffer >>>= 3;
				bitCount -= 3;
			}

			const codeLengthTable = buildHuffmanTable(codeLengthLengths, 0, 19);
			if (!codeLengthTable || !codeLengthTable.bits) {
				return null;
			}

			const codeLengthMask = (1 << codeLengthTable.bits) - 1;
			const lengths = new Uint8Array(literalCount + distanceCount);

			for (let index = 0; index < lengths.length; ) {
				while (bitCount < 7 + codeLengthTable.bits) {
					if (position >= end + TERRAIN_INFLATE_MAX_PADDING) {
						return null;
					}
					bitBuffer |= (position < end ? data[position] : 0) << bitCount;
					position++;
					bitCount += 8;
				}

				const entry = codeLengthTable.table[bitBuffer & codeLengthMask];
				const codeLength = entry & 15;
				if (!codeLength) {
					return null;
				}

				bitBuffer >>>= codeLength;
				bitCount -= codeLength;

				const symbol = entry >> 4;
				if (symbol < 16) {
					lengths[index++] = symbol;
					continue;
				}

				let repeat = 0;
				let value = 0;
				if (symbol === 16) {
					if (!index) {
						return null;
					}
					value = lengths[index - 1];
					repeat = 3 + (bitBuffer & 3);
					bitBuffer >>>= 2;
					bitCount -= 2;
				} else if (symbol === 17) {
					repeat = 3 + (bitBuffer & 7);
					bitBuffer >>>= 3;
					bitCount -= 3;
				} else {
					repeat = 11 + (bitBuffer & 127);
					bitBuffer >>>= 7;
					bitCount -= 7;
				}

				if (index + repeat > lengths.length) {
					return null;
				}

				lengths.fill(value, index, index + repeat);
				index += repeat;
			}

			if (!lengths[256]) {
				return null; // No end-of-block code.
			}

			literalTable = buildHuffmanTable(lengths, 0, literalCount);
			distanceTable = buildHuffmanTable(lengths, literalCount, distanceCount);
		} else {
			return null; // Reserved block type.
		}

		if (!literalTable || !distanceTable || !literalTable.bits) {
			return null;
		}

		const literals = literalTable.table;
		const literalBits = literalTable.bits;
		const literalMask = (1 << literalBits) - 1;
		const distances = distanceTable.table;
		const distanceBits = distanceTable.bits;
		const distanceMask = (1 << distanceBits) - 1;

		for (;;) {
			while (bitCount < literalBits) {
				if (position >= end + TERRAIN_INFLATE_MAX_PADDING) {
					return null;
				}
				bitBuffer |= (position < end ? data[position] : 0) << bitCount;
				position++;
				bitCount += 8;
			}

			const literalEntry = literals[bitBuffer & literalMask];
			const literalLength = literalEntry & 15;
			if (!literalLength) {
				return null;
			}

			bitBuffer >>>= literalLength;
			bitCount -= literalLength;

			const symbol = literalEntry >> 4;
			if (symbol < 256) {
				if (outputLength >= output.length) {
					output = growOutput(output, outputLength, outputLength + 1);
				}
				output[outputLength++] = symbol;
				continue;
			}

			if (symbol === 256) {
				break;
			}

			const lengthIndex = symbol - 257;
			if (lengthIndex >= 29 || !distanceBits) {
				return null;
			}

			let length = TERRAIN_INFLATE_LENGTH_BASE[lengthIndex];
			const lengthExtra = TERRAIN_INFLATE_LENGTH_EXTRA[lengthIndex];

			// At most 5 extra length bits + 15 distance code bits + 13 extra distance bits: refill 20 then 13 bits.
			while (bitCount < 20) {
				if (position >= end + TERRAIN_INFLATE_MAX_PADDING) {
					return null;
				}
				bitBuffer |= (position < end ? data[position] : 0) << bitCount;
				position++;
				bitCount += 8;
			}

			if (lengthExtra) {
				length += bitBuffer & ((1 << lengthExtra) - 1);
				bitBuffer >>>= lengthExtra;
				bitCount -= lengthExtra;
			}

			const distanceEntry = distances[bitBuffer & distanceMask];
			const distanceLength = distanceEntry & 15;
			if (!distanceLength) {
				return null;
			}

			bitBuffer >>>= distanceLength;
			bitCount -= distanceLength;

			const distanceSymbol = distanceEntry >> 4;
			if (distanceSymbol >= 30) {
				return null;
			}

			let distance = TERRAIN_INFLATE_DISTANCE_BASE[distanceSymbol];
			const distanceExtra = TERRAIN_INFLATE_DISTANCE_EXTRA[distanceSymbol];
			if (distanceExtra) {
				while (bitCount < distanceExtra) {
					if (position >= end + TERRAIN_INFLATE_MAX_PADDING) {
						return null;
					}
					bitBuffer |= (position < end ? data[position] : 0) << bitCount;
					position++;
					bitCount += 8;
				}

				distance += bitBuffer & ((1 << distanceExtra) - 1);
				bitBuffer >>>= distanceExtra;
				bitCount -= distanceExtra;
			}

			if (distance > outputLength) {
				return null; // Distance too far back.
			}

			if (outputLength + length > output.length) {
				output = growOutput(output, outputLength, outputLength + length);
			}

			let from = outputLength - distance;
			if (length < 32) {
				for (let i = 0; i < length; ++i) {
					output[outputLength++] = output[from++];
				}
			} else {
				// Long (possibly overlapping) copies: the copied region is periodic with period `distance`, so it is copied in chunks that
				// only read bytes already written and keep `written` a multiple of the period until the last chunk.
				for (let written = 0; written < length; ) {
					const count = Math.min(length - written, distance + written);
					output.copyWithin(outputLength + written, from, from + count);
					written += count;
				}
				outputLength += length;
			}
		}
	} while (!lastBlock);

	// Give the whole buffered bytes back: the stream must end inside the input, followed by the 4 bytes of the Adler-32 checksum.
	position -= bitCount >> 3;
	if (position > end || position + 4 > end) {
		return null;
	}

	return outputLength === output.length ? output : output.slice(0, outputLength);
}
