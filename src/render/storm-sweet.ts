import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, SphereGeometry, TubeGeometry, CatmullRomCurve3, Vector3 } from 'three';
import { STORM_SWEETS } from '../content/storm-sweets';

/** Rounded sugar edges and raised marks; the same silhouette as its sticker. */
export function stormSweet(kind: string): Group | null {
  const sweet = STORM_SWEETS[kind];
  if (!sweet) return null;
  const group = new Group();
  group.name = `special:${kind}`;
  const shape = new Shape();
  sweet.outline.forEach(([x,y], i) => i ? shape.lineTo(x * .23, y * .23) : shape.moveTo(x * .23, y * .23));
  shape.closePath();
  const sugar = new MeshStandardMaterial({ color: sweet.colour, roughness: .29, metalness: .02, emissive: sweet.colour, emissiveIntensity: .22 });
  const icing = new MeshStandardMaterial({ color: sweet.mark, roughness: .35, emissive: sweet.mark, emissiveIntensity: .15 });
  const body = new Mesh(new ExtrudeGeometry(shape, { depth: .09, bevelEnabled: true, bevelSize: .023, bevelThickness: .025, bevelSegments: 3, steps: 1 }), sugar);
  body.position.z = -.045;
  group.add(body);
  const dot = (x: number,y: number,r=.025) => {
    const mesh = new Mesh(new SphereGeometry(r, 10, 6), icing); mesh.scale.z = .45; mesh.position.set(x,y,.074); group.add(mesh);
  };
  const line = (points: number[][]) => group.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(points.map(([x,y]) => new Vector3(x!,y!,.074))), 16,.012,6,false),icing));
  if (kind === 'apelsinklyfta') for(let i=0;i<5;i++) {
    const angle=Math.PI+i*Math.PI/4; line([[0,.085],[Math.cos(angle)*.19,Math.sin(angle)*.19+.085]]);
  }
  else if (sweet.detail === 'dots') for(const x of [-.065,.065]) for(const y of [-.065,.065]) dot(x,y);
  else if (sweet.detail === 'segments') {
    for(let i=0;i<5;i++) { const a=i*Math.PI*2/5; line([[0,0],[Math.cos(a)*.17,Math.sin(a)*.17]]); }
    dot(0,0,.045);
  } else if(sweet.detail === 'swirl') line(Array.from({length: 18},(_,i)=>{const a=i/17*Math.PI*3;const r=.025+i/17*.11;return [Math.cos(a)*r,Math.sin(a)*r];}));
  else for(const y of [-.045,.06]) line([[-.12,y],[0,y+.03],[.12,y]]);
  return group;
}
