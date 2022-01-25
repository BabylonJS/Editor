const binary_reader_1 = require("@picode/binary-reader");
const pako_1 = require("pako");
const MAGIC = Uint8Array.from('Kaydara FBX Binary\x20\x20\x00\x1a\x00'.split(''), function (v) { return v.charCodeAt(0); });

/**
 * Returns a list of FBXNodes
 * @param binary the FBX binary file content
 */
export function parseBinary(binary) {
    if (binary.length < MAGIC.length)
        throw 'Not a binary FBX file';
	
	const data = new binary_reader_1.BinaryReader(binary);
    
	const magic = data.readUint8Array(MAGIC.length).every(function (v, i) { return v === MAGIC[i]; });
    if (!magic)
        throw 'Not a binary FBX file';
    
		const fbxVersion = data.readUint32();

    const header64 = fbxVersion >= 7500;
    const fbx = [] as any;

    while (true) {
        const subnode = readNode(data, header64);
        if (subnode === null)
            break;
		
        fbx.push(subnode);
    }

    return fbx;
}

function readNode(data, header64) {
    const endOffset = header64 ? Number(data.readUint64()) : data.readUint32();
    if (endOffset === 0) {
        return null;
	}

	const numProperties = header64 ? Number(data.readUint64()) : data.readUint32();

    header64 ? Number(data.readUint64()) : data.readUint32();

    const nameLen = data.readUint8();
    const name = data.readArrayAsString(nameLen);
    const node = {
        name: name,
        props: [],
        nodes: [],
    } as any;

    for (var i = 0; i < numProperties; ++i) {
        node.props.push(readProperty(data));
    }

    // Node List
    while (endOffset - data.offset > 13) {
        const subnode = readNode(data, header64);
        if (subnode !== null)
            node.nodes.push(subnode);
    }

    data.offset = endOffset;

    return node;
}

const read = {
    Y: function (data) { return data.readInt16(); },
    C: function (data) { return data.readUint8AsBool(); },
    I: function (data) { return data.readInt32(); },
    F: function (data) { return data.readFloat32(); },
    D: function (data) { return data.readFloat64(); },
    L: function (data) { return data.readInt64(); },
    f: function (data) { return readPropertyArray(data, function (r) { return r.readFloat32(); }); },
    d: function (data) { return readPropertyArray(data, function (r) { return r.readFloat64(); }); },
    l: function (data) { return readPropertyArray(data, function (r) { return r.readInt64(); }); },
    i: function (data) { return readPropertyArray(data, function (r) { return r.readInt32(); }); },
    b: function (data) { return readPropertyArray(data, function (r) { return r.readUint8AsBool(); }); },
    S: function (data) { return data.readArrayAsString(data.readUint32()); },
    R: function (data) { return data.readUint8Array(data.readUint32()); },
};

function readProperty(data) {
    const typeCode = data.readUint8AsString();

    if (typeof read[typeCode] === 'undefined')
        throw "Unknown Property Type " + typeCode.charCodeAt(0);
	
    let value = read[typeCode](data);

    // replace '\x00\x01' by '::' and flip like in the text files
    if (typeCode === "S" && value.indexOf('\x00\x01') != -1) {
        value = value.split('\x00\x01').reverse().join("::");
    }

    return value;
}

function readPropertyArray(data, reader) {
    const arrayLength = data.readUint32();
    const encoding = data.readUint32();
    const compressedLength = data.readUint32();

    let arrayData = new binary_reader_1.BinaryReader(data.readUint8Array(compressedLength));
    if (encoding == 1) {
        arrayData = new binary_reader_1.BinaryReader(pako_1.inflate(arrayData.binary));
    }

    const value = [] as any;
    for (let i = 0; i < arrayLength; ++i) {
        value.push(reader(arrayData));
    }

    return value;
}
