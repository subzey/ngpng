import { dumpTemplate, createTemplate } from './template.js';


// console.log(dumpTemplate(createBootstrapTemplate().contents));
// console.log(createPayloadTemplate('_canvas.width |= 42; _ctx.fillText("Hello!", 0, 42)', {}));

const t = createTemplate('_canvas.width |= 42; svg._x = 42; x = 42');
console.log(dumpTemplate(t.contents));
