import { run } from './package/index.js';
import { writeFile } from 'node:fs/promises';

const code = "_now='';for(_sector_y=10;_sector_y-->0;)_cosine=Math.cos(Math.PI/5*_sector_y)*(_sector_y%2?.6:1),_x=Math.sin(Math.PI/5*_sector_y)*(_sector_y%2?.6:1),_star=new Path2D(_now+=(_now?`S`:`M1,0C1-.2,`)+[_cosine-.2*_x,_x+.2*_cosine,_cosine,_x]);_canvas.style.position=`fixed`,_canvas.style.width=_canvas.style.height=`100%`,_canvas.style.inset=0,_frame=_now=>{_canvas.width=_canvas.clientWidth*devicePixelRatio,_canvas.height=_canvas.clientHeight*devicePixelRatio,_canvas.style.background=`linear-gradient(hsl(${_now/300},50%,50%),hsl(${_now/300+40},50%,50%))`,_ctx.strokeStyle=_ctx.fillStyle=`rgb(656,656,656)`,_ctx.font=`bold 56px sans-serif`,_ctx.fillText(`ng`,9,56),_ctx.strokeText(`ngpng`,9,56),requestAnimationFrame(_frame),_ctx.globalCompositeOperation=`xor`;for(_sector_y=10;_sector_y-->0;)for(_x=_canvas.width/100;--_x>0;)_cosine=Math.cos(_now/600+5*_x-_sector_y),_ctx.save(),_ctx.scale(_canvas.height/9,_canvas.height/9),_ctx.translate(2*_x-_sector_y%2-1,2*((_sector_y+_now/1e3)%10-1)),_ctx.rotate(5*_x+_sector_y),_ctx.scale(1,_cosine),_ctx.rotate(_now/656),_ctx.fillStyle=`rgb(656,656,656,${Math.sin(_cosine*_cosine)+.2})`,_ctx.fill(_star),_ctx.restore()},requestAnimationFrame(_frame)";


run(code, {
	zopfliIterations: 10000,
	desperate: true,
}).then(c => {writeFile('gh-pages/index.html', c)});
