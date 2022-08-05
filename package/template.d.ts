import { ITemplatePart } from "./moving-part";
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
export declare function createTemplate(sourceText: string): ITemplate;
export declare function dumpTemplate(template: readonly ITemplatePart[]): string;
export {};
