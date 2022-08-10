import type { ITemplate } from './template.js';
/**
 * Tries to infer some values by matching the {@link template} with itself.
 * ```text
 * ┌─┬─┬─┬─┬─╔═╤═╤═╗─┐
 * │A│B│C│D│x║B│?│D║y│
 * └─┴─┴─┴─┼─╟─┼─┼─╢─┼─┬─┬─┬─┐
 *         │A║B│C│D║x│B│?│D│y│
 *         └─╚═╧═╧═╝─┴─┴─┴─┴─┘
 *            ? = C
 * ```
 */
export declare function inferFromBackrefs({ template, dataStartOffset }: {
    template: ITemplate;
    dataStartOffset: number;
}): {
    template: ITemplate;
    dataStartOffset: number;
    usedBackrefIndices: Set<number>;
};
