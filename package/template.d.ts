import type { ITemplatePart, ITemplateVaryingPart, ITemplate, IAssumption } from "./interface";
declare class Template implements ITemplate {
    readonly contents: readonly ITemplatePart[];
    readonly exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[];
    protected readonly _exclusivesMap: ReadonlyMap<ITemplateVaryingPart, ReadonlySet<ITemplateVaryingPart>>;
    constructor(contents: readonly ITemplatePart[], exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[]);
    static merge(...templates: readonly ITemplate[]): Template;
    get(assumption: IAssumption, index: number): ITemplatePart | undefined;
    isMatching(assumption: IAssumption, indexA: number, indexB: number): boolean;
    tryNarrowAssumption(prevAssumption: IAssumption, index: number, newValue: ITemplatePart): IAssumption | null;
    dump({ from, to, assumption }?: {
        from?: number;
        to?: number;
        assumption?: IAssumption;
    }): string;
    private _createExclusivesFromArray;
}
export declare function createTemplate(sourceText: string, keepNames?: ReadonlySet<string>): {
    template: Template;
    dataStartOffet: number;
};
export {};
