/** Small unbranded finds. The contour is shared by the physical object and its album drawing. */
export interface FindShape { colour: string; edge: string; points: readonly (readonly [number, number])[]; detail?: 'holes' | 'grain' | 'stripe' }
const disc = Array.from({length:24},(_,i)=>[Math.cos(i*Math.PI/12),Math.sin(i*Math.PI/12)] as const);
const bow = [[-1,-.65],[-1,.65],[-.12,.22],[.12,.22],[1,.65],[1,-.65],[.12,-.22],[-.12,-.22]] as const;
export const FIND_SHAPES: Record<string, FindShape> = {
  redbutton: {colour:'#b65048',edge:'#f5be90',points:disc,detail:'holes'},
  ribbon: {colour:'#bc80ac',edge:'#f4cee9',points:bow,detail:'stripe'},
  bell: {colour:'#d0a752',edge:'#ffdf8f',points:[[-.85,-.65],[-.9,-.4],[-.56,-.18],[-.46,.52],[-.2,.84],[.2,.84],[.46,.52],[.56,-.18],[.9,-.4],[.85,-.65]],detail:'stripe'},
  pencil: {colour:'#c76643',edge:'#f8d796',points:[[-.24,-.65],[0,-1],[.24,-.65],[.24,.87],[-.24,.87]],detail:'stripe'},
  paperboat: {colour:'#e7d4a5',edge:'#fff4d0',points:[[-1,-.28],[-.55,-.76],[.64,-.76],[1,-.28],[.17,-.28],[.17,.9],[-.65,-.28]],detail:'stripe'},
  spool: {colour:'#cda777',edge:'#8aa59d',points:[[-.8,-.8],[.8,-.8],[.8,-.5],[.5,-.5],[.5,.5],[.8,.5],[.8,.8],[-.8,.8],[-.8,.5],[-.5,.5],[-.5,-.5],[-.8,-.5]],detail:'grain'},
  reflector: {colour:'#e6c95d',edge:'#fff8bf',points:Array.from({length:10},(_,i)=>[Math.cos(i*Math.PI/5+Math.PI/2)*(i%2?.48:1),Math.sin(i*Math.PI/5+Math.PI/2)*(i%2?.48:1)] as const),detail:'stripe'},
  whistle: {colour:'#69a19a',edge:'#b8e2d4',points:[[-1,-.12],[-.35,-.12],[-.12,-.55],[.55,-.55],[.88,-.22],[.88,.42],[.52,.65],[-.12,.65],[-.35,.36],[-1,.36]],detail:'holes'},
  shell: {colour:'#d7ad93',edge:'#f9e2b9',points:[[-.25,-.75],[-.9,-.05],[-1,.43],[-.65,.8],[0,1],[.65,.8],[1,.43],[.9,-.05],[.25,-.75]],detail:'grain'},
  float: {colour:'#d6644b',edge:'#eee1ba',points:disc.map(([x,y])=>[x*.55,y] as const),detail:'stripe'},
  peg: {colour:'#d1b17f',edge:'#f7dfaf',points:[[-.3,-1],[.05,-.82],[.3,-1],[.3,.9],[-.3,.9]],detail:'grain'},
  lanternstar: {colour:'#d9bd75',edge:'#f9ebbc',points:[[0,-1],[-1,0],[0,1],[1,0]],detail:'stripe'},
};
export function findPicture(id: string): string {
  const shape=FIND_SHAPES[id];
  if(!shape) return '';
  const points=shape.points.map(([x,y])=>`${22+x*15},${22-y*15}`).join(' ');
  const detail=id==='pencil' ? '<path d="M22 10v21" stroke-width="1.5"/>' : id==='paperboat' ? '<path d="M16 29h13m-6-15v10" stroke-width="1.5"/>' : shape.detail==='holes' ? '<circle cx="18" cy="18" r="2"/><circle cx="26" cy="18" r="2"/><circle cx="18" cy="26" r="2"/><circle cx="26" cy="26" r="2"/>' : shape.detail==='grain' ? '<path d="M17 13v18m5-20v22m5-20v18" fill="none" stroke-width="1.6"/>' : '<path d="M14 20h16M15 24h14" fill="none" stroke-width="2.3"/>';
  return `<defs><clipPath id="find-${id}"><polygon points="${points}"/></clipPath></defs><polygon points="${points}" fill="${shape.colour}" stroke="#665141" stroke-width="1.5" stroke-linejoin="round"/><g clip-path="url(#find-${id})" fill="${shape.edge}" stroke="${shape.edge}">${detail}</g>`;
}
