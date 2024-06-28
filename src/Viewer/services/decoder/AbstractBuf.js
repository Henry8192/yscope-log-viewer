class AbstractBuf {
    constructor () {
        this._valueUint8Array = null;
    }

    loadFrom (dataInputStream, length) {
        console.log("length", length);
        this._valueUint8Array = dataInputStream.readFully(length);
    }

    getValueUint8Array () {
        return this._valueUint8Array;
    }
}

export default AbstractBuf;
