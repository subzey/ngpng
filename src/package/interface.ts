/** A set of possible byte values */
export type ITemplateVaryingPart = ReadonlySet<number>;

/** A set of possible byte values or a concrete numeric value */
export type ITemplatePart = ITemplateVaryingPart | number;

export interface ITemplate {
	/** Template contents */
	readonly contents: readonly ITemplatePart[];
	/** {@link ITemplateVaryingPart}s that should never have the same value at the same time */
	readonly exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[];
	/**
	 * Does template parts at given indices have common values.
	 * This is not just an itersection, the exclusive group contraint is also checked.
	 */
	isMatching(indexA: number, indexB: number): boolean;
	/** Create a *new* `ITemplate` with the replaced part */
	replacePart(replacedPart: ITemplateVaryingPart, replaceWith: ITemplatePart): ITemplate;
}

/** An object that is passed from one stage to another */
export interface ProcessingState {
	template: ITemplate;
	shouldCheckHtml: boolean;
	dataStartOffset: number;
	usedBackrefIndices: ReadonlySet<number>;
	bytes: Uint8Array;
	zopfliIterations: number | undefined;
}