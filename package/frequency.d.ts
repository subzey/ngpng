import { ITemplate } from './template.js';
export declare function inferFromFrequency({ template, dataStartOffset, usedBackrefIndices, }: {
    template: ITemplate;
    dataStartOffset: number;
    usedBackrefIndices: ReadonlySet<number>;
}): ITemplate;
