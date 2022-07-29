import { estimateEntropy } from './estimate-entropy.js';

/**
 * @param {string} stuff 
 * @returns {Set<number>} 
 */
function setFromChars(stuff) {
	return new Set(Array.from(stuff, v => v.charCodeAt()));
}

function createVariable(preferredName) {
	return setFromChars(preferredName + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_');
}

const startRecase = Symbol();
const endRecase = Symbol();
const htmlWhitespace = Symbol();
const attrSeparator = Symbol();


function * adoptCharacters(str, shouldRecase) {
	for (const ch of str) {
		if (!shouldRecase) {
			yield ch.charCodeAt(0);
		} else {
			const lc = ch.toLowerCase();
			const uc = ch.toUpperCase();
			if (lc === uc) {
				yield ch.charCodeAt(0);
			} else {
				yield new Set([
					ch.charCodeAt(0),
					lc.charCodeAt(0),
					uc.charCodeAt(0),
				]);
			}
		}
	}
}

function * tmpl(text, ...substitutions) {
	let shouldRecase = false;
	for (let i = 0; i < text.length; i++) {
		yield * adoptCharacters(text[i], shouldRecase);
		if (i >= substitutions.length) {
			continue;
		}
		const subst = substitutions[i];
		if (subst === htmlWhitespace) {
			yield setFromChars(' \r\n\t');
			continue;
		}
		if (subst === attrSeparator) {
			yield setFromChars(' \r\n\t/');
			continue;
		}
		if (subst === startRecase) {
			shouldRecase = true;
			continue;
		}
		if (subst === endRecase) {
			shouldRecase = false;
			continue;
		}
		if (typeof subst === 'string') {
			yield * adoptCharacters(subst);
			continue;
		}
		yield subst;
	}
}

const t = {
	c: createVariable('c'),
	b: createVariable('b'),
	p: createVariable('p'),
	e: createVariable('e'),
	t: createVariable('t'),
	quote: setFromChars('\'\"\`'),
};

// const bootstrap = ["<canvas id=c><img onload=b=c.getContext`2d`;for(p=e='';t=b.getImageData(0,0,1,!b.drawImage(this,p--,0)).data[0];)e+=String.fromCharCode(t);(1,eval)(e) src=#>"];
const bootstrap = [...tmpl`${startRecase}<canvas${attrSeparator}id=c><img${attrSeparator}src=#${htmlWhitespace}onload=${endRecase}${t.b}=${t.c}.getContext\`2d\`;for(${t.p}=${t.e}=${t.quote}${t.quote};${t.t}=${t.b}.getImageData(159,0,${setFromChars('123456789')},!${t.b}.drawImage(this,${t.p}--,0)).data[0];)${t.e}+=String.fromCharCode(${t.t});(${setFromChars('0123456789')},eval)(e)>`];

const payload = `d=[2280,1280,1520,c.width=1920,document.body.style.font="0px MONOSPACE"],g=new AudioContext,o=g.createScriptProcessor(4096,document.body.style.margin=t=n=0,1),o.connect(g.destination),o.onaudioprocess=o=>{o=o.outputBuffer.getChannelData(e=Math.sin(t/16%1,m=Math.sin(Math.min(1,y=t/128)*Math.PI)**.5+.1,c.height=1080,b.shadowOffsetY=32420,c.style.background="radial-gradient(#"+[222,222,222,222,155,155,102,102][t/16&7]+",black",b.font="920 32px MONOSPACE",f=[(x,y,t)=>x/y*2-t,(x,y,t)=>(x**2+y**2)**.5-t,(x,y,t)=>x/4^y/4-t,(x,y,t)=>y%x-t][t/16&3],u=""+[[,f,f," CAN YOU HEAR ME",f,f,,"MONOSPACE","THE END"][t/16|0]],t>n&&speechSynthesis.speak(new SpeechSynthesisUtterance(u,n+=16))));for(i=0;4096>4*i;i++)g[i]=r=(f(x=16-i%32,a=16-(i/32|0),t)/2&1)+(g[i]||0)/2,x+=o[0]/4+4*(1-m**.3)*Math.sin(i+t+8),a+=o[64]/4+4*(1-m**.3)*Math.sin(i+t),h=x*Math.sin(y*2+8)+a*Math.sin(y*2),p=4096/(m*32+4*h*Math.sin(e)+t%16),b.beginPath(f[i]=r/p),b.arc(h*Math.sin(e+8)*p+1280,x*Math.sin(y*2)*p-a*Math.sin(y*2+8)*p-31920,p>0&&p/(2+32-r*16),0,8),b.shadowBlur=o[0]**2*32+32-m*32+4+h*h/2,b.shadowColor="hsl("+[f(x,y,t)&2?t-a*8:180,(t&64)*m+"%",(t&64)*m+"%"],b.fill();b.shadowBlur=o[0]**2*32,b.shadowColor="#fee";for(i=0;4096>i;i++)o[i]=o[i]/2+((Math.sin(t*d[t/[4,4,4,4,1/4,1/4,16,4][t/16&7]&3]*Math.PI)*8+(t*d[t/8&3]/2&6)+t*d[t/16&3]/4%6)/64+f[i/4|0])*m,64>i&t%16*6>i&&b.fillText([u[i+(o[i]*2&1)]],i%9*32+o[0]*16+180,(i/9|0)*64+o[64]*16-t-31920),t+=1/g.sampleRate}`;

const template = [...bootstrap, ...adoptCharacters(payload, false)];
const dataStartOffset = bootstrap.length;
const bootstrapExclusiveGroup = new Set([
	t.c,
	t.b,
	t.p,
	t.e,
	t.t
].map(set => template.indexOf(set)));


console.log(Buffer.from(Array.from(template, v => typeof v === 'number' ? v : v[Symbol.iterator]().next().value )).toString());

function * iterateOne(template, index, dataStartOffset, exclusiveGroups) {
	const thisSet = template[index];
	const exclusiveIndices = new Set();
	for (const exclusiveGroup of exclusiveGroups) {
		if (!exclusiveGroup.has(index)) {
			continue;
		}
		for (const exclusiveIndex of exclusiveGroup) {
			exclusiveValues.add(exclusiveIndex);
		}
	}
	eachValue: for (const value of thisSet) {
		if (exclusiveValues.has(value)) {
			continue;
		}
		const newTemplate = [];
		const setMapping = new Map();
		for (let i = 0; i < template.length; i++) {
			const templateItem = template[i];
			if (templateItem === thisSet) {
				newTemplate[i] = value;
				continue;
			}
			if (exclusiveValues.has(templateItem) && templateItem.has(value)) {
				if (templateItem.size === 1) {
					continue eachValue;
				}
				if (!setMapping.has(templateItem)) {
					const replacementSet = new Set(templateItem);
					replacementSet.delete(value);
					if (replacementSet.size > 1) {
						setMapping.set(templateItem, replacementSet);
					} else {
						setMapping.set(
							templateItem,
							replacementSet[Symbol.iterator]().next().value
						);
					}
				}
				newTemplate[i] = setMapping.get(templateItem);
				continue;
			}
			newTemplate[i] = template[i];
		}
		yield {
			entropy: estimateEntropy(newTemplate, dataStartOffset),
			template: newTemplate,
		}
	}
}

function * iterateAll(template, dataStartOffset, exclusiveGroups) {
	const seen = new Set();
	for (let i = 0; i < template.length; i++) {
		const v = template[i];
		if (typeof v === 'number' || seen.has(v)) {
			continue;
		}
		seen.add(v);
		yield * iterateOne(template, i, dataStartOffset, exclusiveGroups);
	}
}

function pickNext(assumption, dataStartOffset, exclusiveGroups) {
	let bestEntropy = Infinity;
	let threshold = Infinity;
	let bestAssumptions = [];
	for (const tryAssumption of iterateAll(assumption.template, dataStartOffset, exclusiveGroups)) {
		if (tryAssumption.entropy < bestEntropy) {
			bestEntropy = tryAssumption.entropy;
			threshold = bestEntropy * 1.125;
		}
		if (tryAssumption.entropy <= threshold) {
			bestAssumptions.push(tryAssumption);
		}
	}
	bestAssumptions = bestAssumptions.sort((a, b) => a.entropy - b.entropy).slice(0, 3);

	bestEntropy = Infinity;
	let bestAssumption;
	for (const tryAssumption of bestAssumptions) {
		if (tryAssumption.entropy > threshold) {
			continue;
		}
		const newAssumption = pickNext(tryAssumption, dataStartOffset, exclusiveGroups);
		if (newAssumption.entropy < bestEntropy) {
			bestAssumption = newAssumption;
			bestEntropy = newAssumption.entropy;
		}
	}
	return bestAssumption || assumption;
}


const v = pickNext(
	{ template, entropy: Infinity},
	dataStartOffset,
	[bootstrapExclusiveGroup]
);

console.log(v);