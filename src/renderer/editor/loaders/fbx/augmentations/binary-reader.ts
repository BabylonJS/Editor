import { BinaryReader } from "@picode/binary-reader";

/**
 * Reads a 64 bits unsigned integer.
 */
BinaryReader.prototype.readUint64 = function () {
    const low = this.readUint32();
    const high = this.readUint32();

    return high * 0x100000000 + low;
};

/**
 * Reads a 64 bits signed integer.
 */
BinaryReader.prototype.readInt64 = function () {
    let low = this.readUint32();
    let high = this.readUint32();

    // calculate negative value
    if (high & 0x80000000) {
        high = ~high & 0xFFFFFFFF;
        low = ~low & 0xFFFFFFFF;

        if (low === 0xFFFFFFFF) {
            high = (high + 1) & 0xFFFFFFFF;
        }

        low = (low + 1) & 0xFFFFFFFF;

        return - (high * 0x100000000 + low);

    }

    return high * 0x100000000 + low;
};

/**
 * Reads a 8 bits signed integer array.
 */
BinaryReader.prototype.readUint8Array = function (size: number) {
    return Buffer.from(this.binary.buffer.slice(this.offset, (this.offset += size)));
};
