/** A set of possible byte values */
export declare type ITemplateVaryingPart = ReadonlySet<number>;
/** A set of possible byte values or a concrete numeric value */
export declare type ITemplatePart = ITemplateVaryingPart | number;
export interface ITemplate extends Template {
}
/** Thrown when we cannot return a valid Template for some reason */
export declare class TemplateError extends Error {
}
export declare class Template {
    readonly contents: readonly ITemplatePart[];
    readonly exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[];
    constructor(contents: readonly ITemplatePart[], exclusiveGroups?: readonly (ReadonlySet<ITemplateVaryingPart>)[]);
    static merge(...templates: readonly ITemplate[]): Template;
    isMatching(indexA: number, indexB: number): boolean;
    replacePart(replacedPart: ITemplateVaryingPart, replaceWith: ITemplatePart): Template;
    dump({ from, to }?: {
        from?: number;
        to?: number;
    }): string;
}
