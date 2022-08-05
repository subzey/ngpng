import { dumpTemplate, createBootstrapTemplate, createPayloadTemplate } from './template.js';


// console.log(dumpTemplate(createBootstrapTemplate().contents));
// console.log(createPayloadTemplate('_canvas.width |= 42; _ctx.fillText("Hello!", 0, 42)', {}));

const t = createPayloadTemplate('_canvas.width |= 42; _ctx.fillText("Hello!", 0, 42)', {_canvas: new Set([0x31])})
console.log(dumpTemplate(t.contents));
