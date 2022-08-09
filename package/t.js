import { createTemplate } from './template.js';
import { inferFromBackrefs } from './backrefs.js';


// console.log(dumpTemplate(createBootstrapTemplate().contents));
// console.log(createPayloadTemplate('_canvas.width |= 42; _ctx.fillText("Hello!", 0, 42)', {}));

const { template, dataStartOffet } = createTemplate(
	'_canvas.width |= 42; 12345; _ctx.fillText("12345")',
	new Set(['x'])
);
inferFromBackrefs(template, new Map(), dataStartOffet);