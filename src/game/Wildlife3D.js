import * as THREE from 'three';

/**
 * One low-poly, vertex-colored 3D body mesh per species, reused by all
 * individuals. No sprite billboards, downloaded models, skinning or textures.
 */
const palette = {
  eye: 0x191c17, muzzle: 0xb9987c, dark: 0x302d26,
  bone: 0xb9a98a, feathers: 0x235b77, beak: 0xe7ad45,
};

function modelGeometry(species) {
  const vertices = [];
  const colors = [];
  const part = (geometry, color, scale, position, rotation = null) => {
    if (rotation) geometry.rotateX(rotation[0] || 0), geometry.rotateY(rotation[1] || 0), geometry.rotateZ(rotation[2] || 0);
    geometry.scale(scale[0], scale[1], scale[2]);
    geometry.translate(position[0], position[1], position[2]);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const data = flat.getAttribute('position').array;
    const tint = new THREE.Color(color);
    for (let k = 0; k < data.length; k += 3) {
      vertices.push(data[k], data[k + 1], data[k + 2]);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (flat !== geometry) flat.dispose();
    geometry.dispose();
  };
  const ball = (x,y,z,rx,ry,rz,color=species.color) =>
    part(new THREE.IcosahedronGeometry(1,0),color,[rx,ry,rz],[x,y,z]);
  const cone = (x,y,z,r,h,color,rotation=null) =>
    part(new THREE.ConeGeometry(r,h,5),color,[1,1,1],[x,y,z],rotation);
  const box = (x,y,z,w,h,d,color=species.color) =>
    part(new THREE.BoxGeometry(1,1,1),color,[w,h,d],[x,y,z]);

  const kind=species.kind;
  if (kind==='snake') {
    // Amazon anaconda: thick ground coils and a broad flat head.
    for(let i=0;i<7;i++) {
      const z=-.9+i*.29;
      ball(Math.sin(i*.92)*.19,.18,z,.28,.17,.28,i%2?species.color:0x4a5c3e);
    }
    ball(0,.22,1.05,.31,.16,.35,species.color);
    ball(-.14,.3,1.25,.045,.035,.045,palette.eye);
    ball(.14,.3,1.25,.045,.035,.045,palette.eye);
  } else if(species.flying || kind==='curassow') {
    ball(0,.92,-.10,.29,.29,.47);
    ball(0,1.23,.38,.19,.21,.22);
    cone(0,1.20,.70,.16,kind==='toucan'?.55:.32,kind==='toucan'?0xecb740:palette.beak,[Math.PI/2,0,0]);
    ball(-.145,1.31,.50,.038,.042,.042,palette.eye);
    ball(.145,1.31,.50,.038,.042,.042,palette.eye);
    if(kind==='curassow'){
      box(-.17,.36,-.06,.075,.6,.075,palette.dark);
      box(.17,.36,-.06,.075,.6,.075,palette.dark);
      cone(0,1.49,.41,.16,.31,0x454a47);
    }else{
      // Simple blue/red/yellow feathers in an elongated 3D tail.
      cone(0,.86,-.69,.19,.72,kind==='toucan'?0x363b37:palette.feathers,[-Math.PI/2,0,0]);
    }
  } else {
    const bulky=kind==='tapir';
    const monkey=kind==='monkey' || kind==='sloth';
    const cat=kind==='cat';
    const bodyY=monkey?.80:.73;
    const bodyH=bulky?.53:monkey?.41:.35;
    const bodyD=bulky?.83:cat?.68:monkey?.48:.58;
    ball(0,bodyY,-.13,bulky?.54:.42,bodyH,bodyD);
    const legs=kind==='rodent'?.28:monkey?.38:.47;
    const legX=bulky?.34:.28;
    for(const x of [-legX,legX]){
      for(const z of [-.43,.27]){
        ball(x,.32,z,.15,legs,.15,kind==='tapir'?0x5b5349:species.color);
        ball(x,.11,z+.065,.17,.1,.22,kind==='cat'?0x987c51:species.color);
      }
    }
    if(cat) {
      ball(0,.88,-.83,.13,.13,.42);
      ball(.06,1.02,-1.12,.1,.11,.19);
    }else if(monkey){
      ball(.40,.90,-.69,.14,.13,.23);
      ball(.49,1.1,-.91,.13,.12,.16);
    }else if(kind==='rodent'){
      ball(0,.66,-.77,.1,.09,.28);
    }
    ball(0,bodyY+.19,.47,bulky?.34:.31,bulky?.36:.28,bulky?.37:.28);
    if(bulky){
      ball(0,.78,.82,.19,.26,.24,palette.muzzle);
      ball(0,.63,1.02,.16,.23,.15,palette.muzzle);
    } else if(kind==='pig'){
      ball(0,.78,.84,.19,.16,.17,palette.muzzle);
      ball(0,.80,.98,.13,.12,.05,0x9d8370);
    } else {
      ball(0,.78,.81,.17,.13,.17,monkey?palette.muzzle:species.color);
    }
    for(const x of [-.20,.20]){
      ball(x,bodyY+.41,.52,.13,.16,.13);
      ball(x*.95,bodyY+.26,.67,.050,.047,.04,palette.eye);
    }
    if(cat){
      for(let i=0;i<10;i++){
        const angle=i*2.39;
        ball(Math.sin(angle)*.35,.97+Math.cos(angle)*.17,-.13+(i%3)*.17,.085,.045,.095,0x473c2a);
      }
    }
    if(kind==='sloth'){
      ball(0,.96,.63,.22,.22,.14,0xbba78b);
      ball(-.14,1.01,.75,.075,.085,.06,palette.dark);
      ball(.14,1.01,.75,.075,.085,.06,palette.dark);
    }
  }

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createWildlifeAssets(species) {
  const sharedMaterial=new THREE.MeshLambertMaterial({
    color:0xffffff, vertexColors:true, flatShading:true,
  });
  const geometries=species.map(modelGeometry);
  const wingGeometry=new THREE.BoxGeometry(.85,.085,.39);
  const wingMaterials=species.map(s => new THREE.MeshLambertMaterial({
    color: s.kind==='toucan'?0x484b43:s.color,flatShading:true,
  }));
  return {
    create(index) {
      const animal=species[index];
      const root=new THREE.Group();
      const body=new THREE.Mesh(geometries[index],sharedMaterial);
      body.castShadow=false;
      root.add(body);
      const wings=[];
      if(animal.flying){
        for(const side of [-1,1]){
          const pivot=new THREE.Group();
          pivot.position.set(side*.23,.98,-.12);
          const wing=new THREE.Mesh(wingGeometry,wingMaterials[index]);
          wing.position.x=side*.40;
          pivot.add(wing);
          root.add(pivot);
          wings.push({pivot,side});
        }
      }
      root.scale.setScalar(animal.scale);
      return {root,wings};
    },
  };
}
