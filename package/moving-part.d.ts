import type { ITemplatePart } from './template.js';
export declare function intersect(a: ITemplatePart, b: ITemplatePart): ITemplatePart | undefined;
/** kept \ excluded  */
export declare function exclude(filtered: ITemplatePart, excluded: ITemplatePart): ITemplatePart | undefined;
