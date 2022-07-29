/// <reference types="node"/>
import Crc32 from 'crc-32';
import { WasmZopfliNode } from 'fetchcrunch/wasm-zopfli-node';
import { writeFile } from 'fs/promises';

const deflater = new WasmZopfliNode();

// http://www.p01.org/MONOSPACE/monospace.htm
const bootstrap = Buffer.from("<CANvas id=c><img onload=b=c.getContext`2d`;for(t=n='';e=b.getImageData(159,0,1,!b.drawImage(this,n--,0)).data[0];)t+=String.fromCharCode(e);(1,eval)(t) src=#>");
const payload = Buffer.from(`d=[2280,1280,1520,c.width=1920,document.body.style.font="0px MONOSPACE"],g=new AudioContext,o=g.createScriptProcessor(4096,document.body.style.margin=t=n=0,1),o.connect(g.destination),o.onaudioprocess=o=>{o=o.outputBuffer.getChannelData(e=Math.sin(t/16%1,m=Math.sin(Math.min(1,y=t/128)*Math.PI)**.5+.1,c.height=1080,b.shadowOffsetY=32420,c.style.background="radial-gradient(#"+[222,222,222,222,155,155,102,102][t/16&7]+",black",b.font="920 32px MONOSPACE",f=[(x,y,t)=>x/y*2-t,(x,y,t)=>(x**2+y**2)**.5-t,(x,y,t)=>x/4^y/4-t,(x,y,t)=>y%x-t][t/16&3],u=""+[[,f,f," CAN YOU HEAR ME",f,f,,"MONOSPACE","THE END"][t/16|0]],t>n&&speechSynthesis.speak(new SpeechSynthesisUtterance(u,n+=16))));for(i=0;4096>4*i;i++)g[i]=r=(f(x=16-i%32,a=16-(i/32|0),t)/2&1)+(g[i]||0)/2,x+=o[0]/4+4*(1-m**.3)*Math.sin(i+t+8),a+=o[64]/4+4*(1-m**.3)*Math.sin(i+t),h=x*Math.sin(y*2+8)+a*Math.sin(y*2),p=4096/(m*32+4*h*Math.sin(e)+t%16),b.beginPath(f[i]=r/p),b.arc(h*Math.sin(e+8)*p+1280,x*Math.sin(y*2)*p-a*Math.sin(y*2+8)*p-31920,p>0&&p/(2+32-r*16),0,8),b.shadowBlur=o[0]**2*32+32-m*32+4+h*h/2,b.shadowColor="hsl("+[f(x,y,t)&2?t-a*8:180,(t&64)*m+"%",(t&64)*m+"%"],b.fill();b.shadowBlur=o[0]**2*32,b.shadowColor="#fee";for(i=0;4096>i;i++)o[i]=o[i]/2+((Math.sin(t*d[t/[4,4,4,4,1/4,1/4,16,4][t/16&7]&3]*Math.PI)*8+(t*d[t/8&3]/2&6)+t*d[t/16&3]/4%6)/64+f[i/4|0])*m,64>i&t%16*6>i&&b.fillText([u[i+(o[i]*2&1)]],i%9*32+o[0]*16+180,(i/9|0)*64+o[64]*16-t-31920),t+=1/g.sampleRate}\0`);

async function generate(bootstrap, payload) {
	const pngSignature = Buffer.of(137, 80, 78, 71, 13, 10, 26, 10);
	const literalBlock = Buffer.concat([
		Buffer.of(0), // filtering method
		bootstrap,
	]);

	const deflateStream = Buffer.concat([
		Buffer.of(
			// zlib header
			0x78, 0x9c,
			// A non-final literal block
			0,
			// Length of a literal block
			literalBlock.length & 0xff, literalBlock.length >>> 8, ~literalBlock.length & 0xff, ~literalBlock.length >>> 8,
		),
		literalBlock,
		await deflater.deflateRaw(payload, { dictionary: bootstrap, numIterations: 10000 })
		// ADLER-32 checksum is omitted
	]);

	await writeFile('deflateraw.def', deflateStream.subarray(2));

	const assembled = Buffer.concat([
		pngSignature,
		createIhdrChunk(bootstrap.byteLength + payload.byteLength),
		createTrimmedChunk(deflateStream, 'IDAT'),
	]);

	return assembled;
}

/**
 * @param {number} imageWidth 
 */
function createIhdrChunk(imageWidth) {
	const contents = Buffer.alloc(13);
	contents.writeUint32BE(imageWidth, 0);
	// The last line would appear black in Safari,
	// that's why we have two lines
	contents.writeUint32BE(2, 4); // Image height: 2
	contents[8] = 8; // Bit depth
	contents[9] = 0; // Colour type: Greyscale
	contents[10] = 0; // Compression method
	contents[11] = 0; // Filtering method
	contents[12] = 0; // Interlace method: No interlace

	return createChunk(contents, 'IHDR');
}


function createChunk(contents, name) {
	const chunk = Buffer.concat([
		Buffer.alloc(8),
		contents,
		Buffer.alloc(4)
	]);
	chunk.writeUint32BE(contents.byteLength, 0);
	chunk.write(name, 4);
	const crc32 = Crc32.buf(chunk.subarray(4, -4))
	chunk.writeInt32BE(crc32, chunk.length - 4);
	return chunk;
}

function createTrimmedChunk(contents, name) {
	const chunk = Buffer.concat([
		Buffer.alloc(8),
		contents,
	]);
	chunk.writeUint32BE(contents.byteLength, 0);
	chunk.write(name, 4);
	return chunk;
}

generate(bootstrap, payload).then(d => writeFile('out.html', d));
