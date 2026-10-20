/**
 * Small 2D tactical flyover: shows real flight positions and live fires,
 * avoiding a second WebGL camera/render pass on low-power phones.
 */
export class AirSupportView {
  constructor(element, canvas) {
    this.element = element;
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d', {alpha:false}) ?? null;
    this.label = element.querySelector('[data-air-label]');
    this.count = element.querySelector('[data-air-count]');
    this.elapsed = 0;
    this.visible = false;
    this.hide();
  }

  hide() {
    if (!this.element.hidden) this.element.hidden = true;
    this.visible = false;
    this.elapsed = 0;
  }

  update(dt, flights, fires, enabled) {
    if (!enabled || !flights.length || !this.ctx) {
      this.hide();
      return;
    }
    if (!this.visible) {
      this.element.hidden = false;
      this.visible = true;
      this.elapsed = 1; // Draw immediately on dispatch.
    }
    this.elapsed += dt;
    if (this.elapsed < .09) return; // Only ~11 canvas frames per second.
    this.elapsed = 0;

    this.label.textContent = flights.length > 1 ? '2 AVIÕES EM OPERAÇÃO' :
      flights[0].large ? 'APOIO AÉREO · ESTADO' : 'APOIO AÉREO · PREFEITURA';
    const extinguished = flights.reduce((total, flight) => total + flight.extinguished, 0);
    this.count.textContent = extinguished + (extinguished === 1 ? ' FOCO APAGADO' : ' FOCOS APAGADOS');
    this.draw(flights, fires);
  }

  draw(flights, fires) {
    const ctx = this.ctx, w=this.canvas.width, h=this.canvas.height;
    ctx.fillStyle='#152f29';
    ctx.fillRect(0,0,w,h);

    // Simplified Amazon canopy map: static mathematical pattern, no textures.
    for(let i=0;i<28;i++) {
      const x = (Math.sin(i*7.17)*.47+.5)*w;
      const y = (Math.cos(i*11.8)*.47+.5)*h;
      ctx.fillStyle = i%3===0 ? '#224437' : '#1b392f';
      ctx.beginPath();
      ctx.arc(x,y,9+(i%5)*3,0,Math.PI*2);
      ctx.fill();
    }

    const mx=x=>w/2+x/56*(w/2-10);
    const mz=z=>h/2+z/43*(h/2-9);
    const active = fires.filter(f=>f.active);
    for(const fire of active) {
      const x=mx(fire.x),z=mz(fire.z);
      const intensity = .45 + fire.health / 100 * .55;
      ctx.beginPath();
      ctx.fillStyle='#ff8f40';
      ctx.arc(x,z,3.6*intensity,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#ffd88b';
      ctx.fillRect(x-.7,z-1,1.4,2);
    }
    for(const flight of flights) {
      const x=mx(flight.x),z=mz(flight.z);
      const halfWidth=(flight.large?15:9)/43*(h/2-9);
      if(flight.raining) {
        ctx.fillStyle='#69d9ff35';
        ctx.fillRect(x-7,z-halfWidth,16,halfWidth*2);
        ctx.strokeStyle='#9ce9ffb4';
        ctx.lineWidth=2;
        for(let j=0;j<8;j++) {
          const py=z-halfWidth+(j+.5)/8*halfWidth*2;
          ctx.beginPath();ctx.moveTo(x-3,py-3);ctx.lineTo(x+1,py+3);ctx.stroke();
        }
      }
      ctx.save();
      ctx.translate(x,z);
      ctx.fillStyle=flight.large?'#ffcc7a':'#ccf2ed';
      ctx.beginPath();
      ctx.moveTo(15,0);ctx.lineTo(4,-4);ctx.lineTo(-1,-12);
      ctx.lineTo(-5,-12);ctx.lineTo(-5,-3);ctx.lineTo(-13,-5);
      ctx.lineTo(-16,-4);ctx.lineTo(-13,0);ctx.lineTo(-16,4);
      ctx.lineTo(-13,5);ctx.lineTo(-5,3);ctx.lineTo(-5,12);
      ctx.lineTo(-1,12);ctx.lineTo(4,4);
      ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.strokeStyle='#ffffff19';ctx.lineWidth=1;
    ctx.strokeRect(.5,.5,w-1,h-1);
  }
}
