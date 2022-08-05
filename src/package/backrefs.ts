import { ITemplatePart, ITemplateVaryingPart } from './moving-part.js';

interface FoundBackref {
	referencedOffset: number;
	usedOffsed: number;
	length: number;
	inferred: ReadonlyMap<ITemplateVaryingPart, ITemplatePart>;
}

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

export function * inferFromBackrefs(template: ArrayLike<ITemplatePart>, dataStartOffset = 0) {

}