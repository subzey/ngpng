"use strict";
class Heap {
    constructor() {
        this._store = [];
    }
    get length() {
        return this._store.length;
    }
    head() {
        return this._store[0];
    }
    push(value) {
        let index = this._store.length;
        while (index > 0) {
            const parentIndex = (index - 1) >> 1;
            if (!(this._compare(value, this._store[parentIndex]) < 0)) {
                break;
            }
            this._store[index] = this._store[parentIndex];
            index = parentIndex;
        }
        this._store[index] = value;
    }
    shift() {
        if (this.length <= 1) {
            return this._store.pop();
        }
        const rv = this._store[0];
        const value = this._store.pop();
        let index = 0;
        while (true) {
            let childIndex = index * 2 + 1;
            if (childIndex >= this._store.length) {
                break;
            }
            const altChildIndex = childIndex + 1;
            if (altChildIndex < this._store.length && this._compare(this._store[childIndex], this._store[altChildIndex]) > 0) {
                childIndex = altChildIndex;
            }
            if (!(this._compare(this._store[childIndex], value) < 0)) {
                break;
            }
            this._store[index] = this._store[childIndex];
            index = childIndex;
        }
        this._store[index] = value;
        return rv;
    }
}
