import { ITemplatePart, ITemplateVaryingPart } from "./moving-part";
interface ITemplate {
    /** Numbers or sets of numbers to pick from */
    readonly contents: readonly ITemplatePart[];
    /**
     * All the sets inside a group should end up with the different values.
     * Those are typically the variable names. `[ Set{ a, b }, Set{ a, b } ]`
     * may become `[a, b]` or `[b, a]`, but not `[a, a]` or `[b, b]`
     */
    readonly exclusiveGroups: readonly ReadonlySet<ITemplatePart>[];
}
interface IBootstrapVariables {
    _canvas: ITemplateVaryingPart;
    _ctx: ITemplateVaryingPart;
    _zero: ITemplateVaryingPart;
    _evaledString: ITemplateVaryingPart;
}
interface IBootstapTemplate extends ITemplate {
    variables: IBootstrapVariables;
}
export declare function createBootstrapTemplate(): IBootstapTemplate;
export declare function createPayloadTemplate(sourceText: string, bootstrapVariables: IBootstrapVariables): ITemplate;
export declare function dumpTemplate(template: readonly ITemplatePart[]): string;
export {};
