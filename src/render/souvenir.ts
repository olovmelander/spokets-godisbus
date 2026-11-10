import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, SphereGeometry, BoxGeometry } from 'three';
import { FIND_SHAPES } from '../content/collection-items';

export function souvenir(id: string): Group {
  const root = new Group();
  root.name = `souvenir:${id}`;
  const found = FIND_SHAPES[id];
  if (!found) return root;
  const shape = new Shape();
  found.points.forEach(([x,y], i)=> i ? shape.lineTo(x*.29,y*.29) : shape.moveTo(x*.29,y*.29));
  shape.closePath();
  const material = new MeshStandardMaterial({color:found.colour,roughness:.63});
  const detail = new MeshStandardMaterial({color:found.edge,roughness:.6});
  root.add(new Mesh(new ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,steps:1}),material));
  if(found.detail==='holes') for(const x of [-.075,.075]) for(const y of [-.075,.075]) {
    const hole = new Mesh(new SphereGeometry(.028,10,6),detail); hole.scale.z=.25;hole.position.set(x,y,.085);root.add(hole);
  } else if (id === 'pencil') {
    const stripe = new Mesh(new BoxGeometry(.012,.4,.008),detail); stripe.position.z=.085; root.add(stripe);
  } else if (id === 'ribbon' || id === 'paperboat') {
    const fold = new Mesh(new SphereGeometry(.026,10,6),detail); fold.scale.z=.3;fold.position.z=.085;root.add(fold);
  } else for(const n of [-1,0,1]) {
    const grain = new Mesh(new BoxGeometry(found.detail==='grain'?.012:.22,found.detail==='grain'?.29:.012,.008),detail);
    grain.position.set(found.detail==='grain'?n*.07:0,found.detail==='grain'?0:n*.07,.085);root.add(grain);
  }
  root.rotation.x=-.58; root.rotation.z=.18; root.position.y=.3;
  return root;
}
