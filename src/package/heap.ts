interface IHeap<T> {
    readonly length: number;
    push(value: T): void;
    head(): T | undefined;
    shift(): T | undefined;
}

interface IHeapConstructor<T> {
    new(): IHeap<T>;
}

abstract class Heap<T> implements IHeap<T> {
    private _store: T[] = [];

    protected abstract _compare(item1: Readonly<T>, item2: Readonly<T>): number;

    public get length() {
        return this._store.length;
    }

    public head(): T | undefined {
        return this._store[0];
    }

    public push(value: T): void {
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

    public shift(): T | undefined {
        if (this.length <= 1) {
            return this._store.pop();
        }
        const rv = this._store[0];

        const value = this._store.pop() as T;
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
