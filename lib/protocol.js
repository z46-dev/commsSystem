export class Writer {
    constructor(littleEndian) {
        this.writer = true;
        this.tmpBuf = new DataView(new ArrayBuffer(8));
        this._e = littleEndian;
        this.reset();
        return this;
    }

    reset(littleEndian = this._e) {
        this._e = littleEndian;
        this._b = [];
        this._o = 0;
    }

    setUint8(a) {
        if (a >= 0 && a < 256) this._b.push(a);
        return this;
    }

    setInt8(a) {
        if (a >= -128 && a < 128) this._b.push(a);
        return this;
    }

    setUint16(a) {
        this.tmpBuf.setUint16(0, a, this._e);
        this._move(2);
        return this;
    }

    setInt16(a) {
        this.tmpBuf.setInt16(0, a, this._e);
        this._move(2);
        return this;
    }

    setUint32(a) {
        this.tmpBuf.setUint32(0, a, this._e);
        this._move(4);
        return this;
    }

    setInt32(a) {
        this.tmpBuf.setInt32(0, a, this._e);
        this._move(4);
        return this;
    }

    setFloat32(a) {
        this.tmpBuf.setFloat32(0, a, this._e);
        this._move(4);
        return this;
    }

    setFloat64(a) {
        this.tmpBuf.setFloat64(0, a, this._e);
        this._move(8);
        return this;
    }

    _move(b) {
        for (let i = 0; i < b; i++) this._b.push(this.tmpBuf.getUint8(i));
    }

    setStringUTF8(s) {
        const bytesStr = unescape(encodeURIComponent(s));
        for (let i = 0, l = bytesStr.length; i < l; i++) this._b.push(bytesStr.charCodeAt(i));
        this._b.push(0);
        return this;
    }

    build() {
        return new Uint8Array(this._b);
    }
}

export class Reader {
    constructor(view, offset, littleEndian) {
        this.reader = true;
        this._e = littleEndian;
        if (view) this.repurpose(view, offset);
    }

    repurpose(view, offset) {
        this.view = view;
        this._o = offset || 0;
    }

    getUint8() {
        return this.view.getUint8(this._o++, this._e);
    }

    getInt8() {
        return this.view.getInt8(this._o++, this._e);
    }

    getUint16() {
        return this.view.getUint16((this._o += 2) - 2, this._e);
    }

    getInt16() {
        return this.view.getInt16((this._o += 2) - 2, this._e);
    }

    getUint32() {
        return this.view.getUint32((this._o += 4) - 4, this._e);
    }

    getInt32() {
        return this.view.getInt32((this._o += 4) - 4, this._e);
    }

    getFloat32() {
        return this.view.getFloat32((this._o += 4) - 4, this._e);
    }

    getFloat64() {
        return this.view.getFloat64((this._o += 8) - 8, this._e);
    }

    getStringUTF8() {
        let s = '';
        let b;
        while ((b = this.view.getUint8(this._o++)) !== 0) s += String.fromCharCode(b);
        return decodeURIComponent(escape(s));
    }
}

export class CRYPTO {
    constructor(key, add, multiply, modulo) {
        this.key = key;
        this.add = add;
        this.multiply = multiply;
        this.modulo = modulo;
    }

    changePacket(packet) {
        for (let i = 0, packetlength = packet.length; i < packetlength; i++) {
            packet[i] = packet[i] ^ (Number(this.key) % 256);
            this.key = this.changeKey(this.key, this.add, this.multiply, this.modulo);
        }
        return packet;
    }
    
    changeKey(originalKey, multiply, modulo, add) {
        return ((BigInt(originalKey) + BigInt(add)) * BigInt(multiply)) % BigInt(modulo);
    }
}

const minPrime = 3;
const maxPrime = 750;

const primesGenerator = Array(maxPrime + 1).fill(0).map((_, i) => i);

for (let i = 2; i <= Math.sqrt(maxPrime + 1); i++) {
    for (let j = i ** 2; j < maxPrime + 1; j += i) {
        delete primesGenerator[j];
    }
}

export const primes = Object.values(primesGenerator.slice(Math.max(minPrime, 2)));