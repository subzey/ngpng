import { run } from './package/index.js';
import { writeFile } from 'node:fs/promises';

const code = `\
d=[2280,1280,1520,_canvas.width=1920,document.body.style.font="0px MONOSPACE"],g=new AudioContext,o=g.createScriptProcessor(4096,document.body.style.margin=t=_zero,1),o.connect(g.destination),o.onaudioprocess=o=>{o=o.outputBuffer.getChannelData(e=Math.sin(t/16%1,m=Math.sin(Math.min(1,y=t/128)*Math.PI)**.5+.1,_canvas.height=1080,_ctx.shadowOffsetY=32420,_canvas.style.background="radial-gradient(#"+[222,222,222,222,155,155,102,102][t/16&7]+",black",_ctx.font="920 32px MONOSPACE",f=[(x,y,t)=>x/y*2-t,(x,y,t)=>(x**2+y**2)**.5-t,(x,y,t)=>x/4^y/4-t,(x,y,t)=>y%x-t][t/16&3],u=""+[[,f,f," CAN YOU HEAR ME",f,f,,"MONOSPACE","THE END"][t/16|0]],t>_zero&&speechSynthesis.speak(new SpeechSynthesisUtterance(u,_zero+=16))));for(i=0;4096>4*i;i++)g[i]=r=(f(x=16-i%32,a=16-(i/32|0),t)/2&1)+(g[i]||0)/2,x+=o[0]/4+4*(1-m**.3)*Math.sin(i+t+8),a+=o[64]/4+4*(1-m**.3)*Math.sin(i+t),h=x*Math.sin(y*2+8)+a*Math.sin(y*2),p=4096/(m*32+4*h*Math.sin(e)+t%16),_ctx.beginPath(f[i]=r/p),_ctx.arc(h*Math.sin(e+8)*p+1280,x*Math.sin(y*2)*p-a*Math.sin(y*2+8)*p-31920,p>0&&p/(2+32-r*16),0,8),_ctx.shadowBlur=o[0]**2*32+32-m*32+4+h*h/2,_ctx.shadowColor="hsl("+[f(x,y,t)&2?t-a*8:180,(t&64)*m+"%",(t&64)*m+"%"],_ctx.fill();_ctx.shadowBlur=o[0]**2*32,_ctx.shadowColor="#fee";for(i=0;4096>i;i++)o[i]=o[i]/2+((Math.sin(t*d[t/[4,4,4,4,1/4,1/4,16,4][t/16&7]&3]*Math.PI)*8+(t*d[t/8&3]/2&6)+t*d[t/16&3]/4%6)/64+f[i/4|0])*m,64>i&t%16*6>i&&_ctx.fillText([u[i+(o[i]*2&1)]],i%9*32+o[0]*16+180,(i/9|0)*64+o[64]*16-t-31920),t+=1/g.sampleRate}`;


run(code, {
	keepNames: new Set('xyt'),
	zopfliIterations: 1000,
}).then(c => {writeFile('out.html', c)});
