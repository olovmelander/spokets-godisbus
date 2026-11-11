import * as THREE from 'three';
import { createBatch, canvasTexture, createClearance } from '../ported/kit.js';
import { createRoute } from '../ported/route.js';
import { surfaceMaterial } from '../ported/surfaces.js';

type Route = ReturnType<typeof createRoute>;
export const randomFrom = (seed: number) => () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };

/** Original local bark and leaf artwork, with deliberately large shapes that survive phone resolution. */
function treeTextures() {
  const random = randomFrom(7341);
  const bark = canvasTexture(128, 256, (c, w, h) => {
    c.fillStyle = '#ddd7c5'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 190; i++) {
      const x = random() * w, y = random() * h;
      c.fillStyle = i % 5 ? '#aaa493' : '#41473e';
      c.fillRect(x, y, 3 + random() * 24, 2 + random() * 5);
    }
  });
  bark.wrapS = bark.wrapT = THREE.RepeatWrapping; bark.repeat.set(1, 3);
  const leaf = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#b6c6a6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 170; i++) {
      const x = random() * w, y = random() * h, r = 3 + random() * 7;
      c.save(); c.translate(x, y); c.rotate(random() * 6.28);
      c.fillStyle = i % 3 ? '#dae1ba' : '#859f7e';
      c.beginPath(); c.ellipse(0, 0, r, r * .42, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#a5b78e'; c.lineWidth = .7; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke(); c.restore();
    }
  });
  leaf.wrapS = leaf.wrapT = THREE.RepeatWrapping;
  return {bark, leaf};
}

export function forest(route: Route, root: THREE.Group, low: boolean, anisotropy: number) {
  const random = randomFrom(11112026), {terrainHeight} = route;
  const groundGeometry = new THREE.PlaneGeometry(500, 400, 100, 80).rotateX(-Math.PI / 2);
  const positions = groundGeometry.getAttribute('position'), colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    positions.setY(i, terrainHeight(x, z) - .065);
    groundGeometry.getAttribute('uv').setXY(i, x / 3, z / 3);
    const shade = .86 + Math.sin(x * .06) * Math.cos(z * .08) * .09;
    colors.push(shade * 1.05, shade, shade * .84);
  }
  groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, surfaceMaterial('grass', anisotropy));
  ground.name = 'varggropen-living-ground'; ground.receiveShadow = true; root.add(ground);

  const treeAt: {x: number; y: number; z: number; h: number; spruce: boolean}[] = [];
  // Close trunks follow the course, while open sightlines across neighbouring hairpins remain clear.
  for (let d = 12; d < route.length; d += low ? 8 : 5.5) for (const side of [-1, 1]) {
    const p = route.sample(d + random() * 2, side * (9 + random() * 11)).position;
    if (route.distanceToRoad(p.x, p.z) < 7.3) continue;
    treeAt.push({x: p.x, y: terrainHeight(p.x, p.z), z: p.z, h: 5.5 + random() * 4.5, spruce: random() < .3});
  }
  for (let i = 0; i < (low ? 140 : 270); i++) {
    const x = (random() - .5) * 360, z = (random() - .5) * 290;
    if (route.distanceToRoad(x, z) < 17) continue;
    treeAt.push({x, y: terrainHeight(x, z), z, h: 8 + random() * 9, spruce: random() < .5});
  }
  const textures = treeTextures();
  const trunkMaterial = new THREE.MeshStandardMaterial({color: 0xffffff, map: textures.bark, roughness: .95});
  const leafMaterial = new THREE.MeshStandardMaterial({color: 0xffffff, map: textures.leaf, roughness: .93});
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.6, 1, 1, 7), trunkMaterial, treeAt.length * 4);
  const clumps = low ? 5 : 7;
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leafMaterial, treeAt.length * clumps);
  trunks.name = 'branched-birch-and-pine'; leaves.name = 'layered-leaf-crowns';
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  let branchCount = 0, leafCount = 0;
  const woodColors = [0x9b8d69, 0xc9c4ad, 0x897958], leafColors = [0x789052, 0x9b9b51, 0x667e47, 0xc5ad58, 0x8e9b50];
  for (const tree of treeAt) {
    const {x, y, z, h, spruce} = tree;
    dummy.position.set(x, y + h * .44, z); dummy.rotation.set(0, random() * 6.28, .015 * (random() - .5));
    dummy.scale.set(h * .023, h * .88, h * .023); dummy.updateMatrix();
    trunks.setMatrixAt(branchCount, dummy.matrix); trunks.setColorAt(branchCount++, color.set(spruce ? 0x87745a : woodColors[Math.floor(random() * woodColors.length)]!));
    for (let arm = 0; arm < 3; arm++) {
      const angle = arm * 2.4 + random(), lean = .62 + random() * .3;
      dummy.position.set(x + Math.sin(angle) * h * .075, y + h * (.46 + arm * .09), z + Math.cos(angle) * h * .075);
      dummy.rotation.set(lean * Math.cos(angle), angle, lean * Math.sin(angle)); dummy.scale.set(h * .009, h * .32, h * .009); dummy.updateMatrix();
      trunks.setMatrixAt(branchCount, dummy.matrix); trunks.setColorAt(branchCount++, color.set(spruce ? 0x796547 : 0xaa9b76));
    }
    for (let clump = 0; clump < clumps; clump++) {
      const angle = clump * 2.399 + random() * .4;
      const reach = clump === clumps - 1 ? 0 : h * (spruce ? .14 : .18) * (.6 + random() * .4);
      const rise = spruce ? .36 + clump / (clumps - 1) * .51 : .65 + (clump % 3) * .09;
      dummy.position.set(x + Math.sin(angle) * reach, y + h * rise, z + Math.cos(angle) * reach);
      dummy.rotation.set(random() * .3, angle, random() * .3);
      const size = spruce ? h * (.23 - clump * .017) : h * (.18 + random() * .055);
      dummy.scale.set(size, size * (spruce ? .55 : .85), size * .9); dummy.updateMatrix();
      leaves.setMatrixAt(leafCount, dummy.matrix); leaves.setColorAt(leafCount++, color.set(spruce ? 0x587653 : leafColors[Math.floor(random() * leafColors.length)]!));
    }
  }
  trunks.count = branchCount; leaves.count = leafCount;
  trunks.computeBoundingSphere(); leaves.computeBoundingSphere();
  trunks.receiveShadow = leaves.receiveShadow = true;
  root.add(trunks, leaves);

  // Soft moss boulders and timber rails ground the toy course without filling the road with scenery.
  const batch = createBatch(), painted = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .9});
  const cube = new THREE.BoxGeometry(1, 1, 1), rock = new THREE.IcosahedronGeometry(1, 1);
  const clear = createClearance(route);
  for (let d = 6; d < route.length; d += 3) for (const side of [-1, 1]) {
    const p = route.sample(d, side * 5.6).position;
    if (!clear(p.x, p.z, d, 5.7) || (d < 24 && side > 0)) continue;
    const angle = route.sample(d).angle;
    batch.add(cube, painted, [p.x, p.y + .37, p.z], [0, angle, 0], [.18, .74, .18], 0x8b6444);
    batch.add(cube, painted, [p.x, p.y + .52, p.z], [0, angle, 0], [.12, .15, 2.8], Math.floor(d / 18) % 2 ? 0xc4b190 : 0xb68563);
  }
  for (let i = 0; i < 85; i++) {
    const d = random() * route.length, p = route.sample(d, (i % 2 ? 1 : -1) * (6.8 + random() * 8)).position;
    if (route.distanceToRoad(p.x, p.z) < 6) continue;
    const size = .25 + random() * .8;
    batch.add(rock, painted, [p.x, p.y + size * .35, p.z], [random(), random(), random()], [size, size * .65, size * .8], i % 3 ? 0x899278 : 0xa5aa91);
  }
  batch.build(root, {castShadow: false, name: 'timber-and-moss'}); cube.dispose(); rock.dispose();
  // Tufts have broad blades and seed heads rather than subpixel grass noise.
  const blades: number[] = [], bladeColors: number[] = [];
  for (let i = 0; i < 12; i++) {
    const a = i * 2.399, r = .1 + random() * .24, h = .20 + random() * .32;
    const bx = Math.sin(a) * r, bz = Math.cos(a) * r;
    blades.push(bx - .035, 0, bz, bx + .035, 0, bz, bx + Math.sin(a) * .12, h, bz + Math.cos(a) * .12);
    for (let j = 0; j < 3; j++) bladeColors.push(j === 2 ? .67 : .30, j === 2 ? .69 : .42, j === 2 ? .34 : .19);
  }
  const bladeGeometry = new THREE.BufferGeometry(); bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
  bladeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bladeColors, 3)); bladeGeometry.computeVertexNormals();
  const tufts = new THREE.InstancedMesh(bladeGeometry, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, side: THREE.DoubleSide}), low ? 180 : 280);
  let grassCount = 0;
  for (let i = 0; i < tufts.instanceMatrix.count; i++) {
    const d = random() * route.length, point = route.sample(d, (i % 2 ? 1 : -1) * (5.9 + random() * 3.5)).position;
    if (route.distanceToRoad(point.x, point.z) < 5.3) continue;
    dummy.position.copy(point); dummy.rotation.set(0, random() * Math.PI * 2, 0); dummy.scale.setScalar(.8 + random() * 1.2); dummy.updateMatrix(); tufts.setMatrixAt(grassCount++, dummy.matrix);
  }
  tufts.count = grassCount; tufts.name = 'moss-and-golden-grass'; tufts.computeBoundingSphere(); root.add(tufts);
  // Layered soft forest hills enclose the world, so the grove never ends against an empty horizon.
  const hills = createBatch(), hillMaterial = new THREE.MeshBasicMaterial({vertexColors: true});
  for (let layer = 0; layer < 3; layer++) {
    const vertices: number[] = [], indices: number[] = [], radius = 185 + layer * 34;
    for (let i = 0; i <= 160; i++) {
      const angle = i / 160 * Math.PI * 2;
      const high = 20 + layer * 10 + Math.sin(angle * 3 + layer) * 7 + Math.sin(angle * 7 - layer) * 3;
      vertices.push(Math.sin(angle) * radius, -5, Math.cos(angle) * radius, Math.sin(angle) * radius, high, Math.cos(angle) * radius);
      if (i < 160) {const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);}
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    hills.add(geometry, hillMaterial, [0, 0, 0], [0, 0, 0], 1, [0x7c927f, 0x849b99, 0x9aaeb0][layer]!); geometry.dispose();
  }
  hills.build(root, {castShadow: false, receiveShadow: false, name: 'distant-layered-hills'});
  return {treeCount: treeAt.length};
}

/** Golden light with a faint, slow northern curtain; no flashing or screen-space effects. */
export function sky(root: THREE.Group, calm: boolean) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {sun: {value: new THREE.Vector3(-.5, .24, -.55).normalize()}, clock: {value: 0}},
    vertexShader: 'varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    // Soft cloud noise adapted from the source kart atmosphere, with the console's calmer palette.
    fragmentShader: `varying vec3 direction; uniform vec3 sun; uniform float clock;
    float hash(vec2 p){p=fract(p*vec2(.1031,.103));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    void main(){ vec3 d=normalize(direction); 
      vec3 col=mix(vec3(.64,.40,.23),vec3(.045,.18,.42),smoothstep(-.04,.34,d.y));
      float warm=pow(max(dot(d,sun),0.),12.); col+=vec3(.22,.12,.035)*warm;
      col+=vec3(.7,.45,.16)*pow(max(dot(d,sun),0.),400.);
      vec2 p=d.xz/(max(d.y,0.)+.22)*2.6+vec2(clock*.003,0.);
      float cloud=noise(p)*.66+noise(p*2.13+13.)*.34;
      float cloudAlpha=smoothstep(.64,.83,cloud)*smoothstep(.02,.20,d.y)*.52;
      col=mix(col,mix(vec3(.43,.43,.50),vec3(.95,.76,.48),cloud),cloudAlpha);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(290, 28, 14), material); dome.name = 'golden-forest-sky'; root.add(dome);
  const auroraGeometry = new THREE.PlaneGeometry(370, 34, 64, 4);
  const p = auroraGeometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * .021) * 18);
  const auroraMaterial = new THREE.ShaderMaterial({transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {clock: {value: 0}},
    vertexShader: `varying vec2 vUv; uniform float clock; void main(){vUv=uv;vec3 p=position; p.y+=sin(p.x*.026+clock*.06)*2.; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float clock; void main(){float v=sin(vUv.y*3.14159);float strand=.5+.5*sin(vUv.x*70.+sin(vUv.x*15.+clock*.04)*2.);float a=v*v*(.065+.045*strand)*sin(vUv.x*3.14159);gl_FragColor=vec4(mix(vec3(.42,.66,.64),vec3(.68,.62,.75),vUv.y),a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const curtain = new THREE.Mesh(auroraGeometry, auroraMaterial); curtain.position.set(0, 76, -175); curtain.name = 'quiet-northern-light'; root.add(curtain);
  return {update(time: number) {const clock = calm ? 0 : time; auroraMaterial.uniforms.clock!.value = clock; material.uniforms.clock!.value = clock;}};
}
