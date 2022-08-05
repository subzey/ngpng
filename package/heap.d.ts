interface IHeap<T> {
    readonly length: number;
    push(value: T): void;
    head(): T | undefined;
    shift(): T | undefined;
}
interface IHeapConstructor<T> {
    new (): IHeap<T>;
}
declare abstract class Heap<T> implements IHeap<T> {
    private _store;
    protected abstract _compare(item1: Readonly<T>, item2: Readonly<T>): number;
    get length(): number;
    head(): T | undefined;
    push(value: T): void;
    shift(): T | undefined;
}
