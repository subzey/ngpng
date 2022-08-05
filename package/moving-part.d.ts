/** A set of possible byte values */
export declare type ITemplateVaryingPart = ReadonlySet<number>;
/** A set of possible byte values or a concrete numeric value */
export declare type ITemplatePart = ITemplateVaryingPart | number;
export declare function intersect(a: ITemplatePart, b: ITemplatePart): ITemplatePart | undefined;
/** kept \ excluded  */
export declare function exclude(filtered: ITemplatePart, excluded: ITemplatePart): ITemplatePart | undefined;
