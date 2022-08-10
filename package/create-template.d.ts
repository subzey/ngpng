import { Template } from "./template.js";
export declare function createTemplate(sourceText: string, keepNames?: ReadonlySet<string>): {
    template: Template;
    dataStartOffset: number;
};
