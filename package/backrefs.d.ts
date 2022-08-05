import { ITemplatePart } from './moving-part.js';
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
 * @param template
 * @param dataStartOffset
 */
export declare function inferFromBackrefs(template: ArrayLike<ITemplatePart>, dataStartOffset?: number): Generator<never, void, unknown>;
