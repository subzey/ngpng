/** A set of possible byte values */
export type ITemplateVaryingPart = ReadonlySet<number>;

/** A set of possible byte values or a concrete numeric value */
export type ITemplatePart = ITemplateVaryingPart | number;

export type IAssumption = ReadonlyMap<ITemplateVaryingPart, ITemplatePart>;

export interface ITemplate {
	/** Numbers or sets of numbers to pick from */
	readonly contents: readonly ITemplatePart[];
	/** 
	 * All the sets inside a group should end up with the different values.
	 * Those are typically the variable names. `[ Set{ a, b }, Set{ a, b } ]`
	 * may become `[a, b]` or `[b, a]`, but not `[a, a]` or `[b, b]`
	 */
	readonly exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[];
	get(assumption: IAssumption, index: number): ITemplatePart | undefined;
	isMatching(assumption: IAssumption, indexA: number, indexB: number): boolean;
}
