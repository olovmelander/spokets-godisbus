import {
  AdditiveBlending, BoxGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, Path, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../sim/types';
import { outlook, outlookPane } from '../backdrop';
import { BOARD, boards } from './ground';
import { drawn, heightAt } from './kit';
import { roomThings } from '../home-room';
import { HOME_BATHROOM, HOME_LAYOUT } from '../../content/home-layout';

/** Half the opening that a window which opens cuts through the wall: a little more than its glass, under its frame. */
export const OPENING = { x: 2.6, y: 2.65 } as const;

/**
 * The room's wall with real window and bathroom openings, centred relative to the wall.
 * Its texture lies as on a plane, 0 to 1 across.
 */
function wallWithOpenings(wide: number, tall: number, openings: readonly { x: number; y: number; halfWidth: number; halfHeight: number }[]): BufferGeometry {
  if (!openings.length) return new PlaneGeometry(wide, tall);
  const outline = new Shape();
  outline.moveTo(-wide / 2, -tall / 2);
  outline.lineTo(wide / 2, -tall / 2);
  outline.lineTo(wide / 2, tall / 2);
  outline.lineTo(-wide / 2, tall / 2);
  outline.closePath();
  for (const opening of openings) {
    const hole = new Path();
    hole.moveTo(opening.x - opening.halfWidth, opening.y - opening.halfHeight);
    hole.lineTo(opening.x - opening.halfWidth, opening.y + opening.halfHeight);
    hole.lineTo(opening.x + opening.halfWidth, opening.y + opening.halfHeight);
    hole.lineTo(opening.x + opening.halfWidth, opening.y - opening.halfHeight);
    hole.closePath();
    outline.holes.push(hole);
  }
  const geometry = new ShapeGeometry(outline);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, position.getX(i) / wide + 0.5, position.getY(i) / tall + 0.5);
  return geometry;
}

// --- the house and the deck ---------------------------------------------------------------------------------

/**
 * What is built: the house's red wall behind the scene, and a deck overhead with the sun falling through
 * between its boards. The wall is drawn small, so that it is as soft as everything else that far away.
 */
export function built(chapter: ChapterData, indoors = false): Group {
  const group = new Group();
  const house = chapter.house;
  if (house && indoors) {
    // Seen from inside: a pale panelled wall close behind him, and windows that let the sky in.
    const long = house.to - house.from;
    // The garden below the deck is not the room's floor: using its lowest point lowered the entire wall
    // and exposed outdoor sky over it in portrait. The room stays on its own level.
    const roomTo = chapter.outdoors ?? house.to;
    const inside = chapter.ground.filter(point => point.x >= house.from && point.x < roomTo);
    const floor = inside.length ? Math.min(...inside.map(point => point.y)) : heightAt(chapter, (house.from + roomTo) / 2);
    const panels = drawn(128, 64, (c) => {
      c.fillStyle = '#eadcc0';
      c.fillRect(0, 0, 128, 64);
      for (let x = 0; x < 128; x += 16) {
        c.fillStyle = 'rgba(150,126,88,0.35)';
        c.fillRect(x, 0, 1.5, 64);
      }
      // A rail and darker boards below it.
      c.fillStyle = 'rgba(128,100,66,0.5)';
      c.fillRect(0, 44, 128, 3);
      c.fillStyle = 'rgba(150,120,80,0.25)';
      c.fillRect(0, 47, 128, 17);
    }, true);
    panels.repeat.set(long / 12, 1);
    // In the evening the room is lit by candles: the wall is dim and warm, and the windows are dark.
    const evening = chapter.night !== undefined;
    const centre = (house.from + house.to) / 2;
    const openings: { x: number; y: number; halfWidth: number; halfHeight: number }[] = house.opens === undefined ? [] : [{
      x: house.opens - centre, y: heightAt(chapter, house.opens) + 6 - (floor + 11),
      halfWidth: OPENING.x, halfHeight: OPENING.y,
    }];
    const bath = HOME_BATHROOM;
    const bathroomHere = bath.x - bath.openingWidth / 2 > house.from && bath.x + bath.openingWidth / 2 < roomTo;
    if (bathroomHere) openings.push({ x: bath.x - centre, y: bath.openingHeight / 2 - .03 - 11,
      halfWidth: bath.openingWidth / 2, halfHeight: bath.openingHeight / 2 + .03 });
    const wall = new Mesh(wallWithOpenings(long, 26, openings),
      new MeshBasicMaterial({ map: panels, color: evening ? '#8c7252' : '#ffffff' }));
    wall.name = 'home-back-wall';
    wall.position.set(centre, floor + 11, HOME_LAYOUT.wall.z);
    wall.renderOrder = -2;
    group.add(wall);
    // Continuous painted skirting joins the furniture to the room. It stops at the real doorway rather than
    // running across Elof's feet or covering the tiled threshold behind it.
    const spans = bathroomHere ? [[house.from, bath.x - bath.openingWidth / 2], [bath.x + bath.openingWidth / 2, roomTo]] : [[house.from, roomTo]];
    const skirting = spans.filter(([from, to]) => to! > from!).map(([from, to]) =>
      new BoxGeometry(to! - from!, HOME_LAYOUT.wall.skirtingHeight, HOME_LAYOUT.wall.skirtingDepth)
        .translate((from! + to!) / 2, floor + HOME_LAYOUT.wall.skirtingHeight / 2, HOME_LAYOUT.wall.z + .1));
    const trim = new Mesh(mergeGeometries(skirting), new MeshStandardMaterial({ color: '#e4dccb', roughness: .8 }));
    trim.name = 'home-wall-skirting'; group.add(trim); skirting.forEach(shape => shape.dispose());
    // A room has a continuous floor towards the viewer. The platformer's cutaway remains outdoors;
    // indoors it used to leave a black pit beneath the family on a tall phone screen.
    const roomWidth = roomTo - house.from;
    const depth = 128;
    const floorMap = boards();
    floorMap.repeat.set(roomWidth / (BOARD * 2), depth / (BOARD * 2));
    const roomFloor = new Mesh(new PlaneGeometry(roomWidth, depth).rotateX(-Math.PI / 2),
      new MeshStandardMaterial({ color: '#b49a78', map: floorMap, roughness: 0.86 }));
    roomFloor.name = 'home-continuous-floor';
    roomFloor.position.set((house.from + roomTo) / 2, floor - 0.015, depth / 2 + 0.44);
    group.add(roomFloor);
    // The same recognisable furniture as Stormkvällen. It stands behind the actors and the walking plane;
    // the sofa stays beside the hall; the shelf and final windowsill remain clear in the same home.
    if (chapter.id === 'prolog') group.add(roomThings({ rug: HOME_LAYOUT.dining.x, blanket: false }));
    if (chapter.id === 'epilog') group.add(roomThings({ rug: HOME_LAYOUT.dining.x, blanket: false }));
    // Where the chapter goes out of doors the house ends: its white corner board, and the garden beyond it.
    if (chapter.outdoors !== undefined) {
      const corner = new Mesh(new BoxGeometry(0.7, 26, 0.5), new MeshStandardMaterial({ color: '#efe8da', roughness: 0.8 }));
      corner.position.set(chapter.outdoors + 0.35, floor + 11, -8.9);
      group.add(corner);
    }
    const frame = new MeshStandardMaterial({ color: evening ? '#c3b498' : '#f6efe2', roughness: 0.82 });
    for (const x of house.windows) {
      // Solid painted joinery catches the room's light. One merged draw includes the projecting sill;
      // the glass keeps the same opening and the story's window positions stay exactly where they were.
      const base = heightAt(chapter, x);
      // The window that opens has no fixed cross: its two halves carry their own (the chapter's `casement`).
      const opens = x === house.opens;
      const bars = [[0, 2.6, 5.4, 0.3], [0, -2.6, 5.4, 0.3], [-2.55, 0, 0.3, 5.5], [2.55, 0, 0.3, 5.5], ...(opens ? [] : [[0, 0, 0.18, 5.2], [0, 0, 5.1, 0.18]])]
        .map(([dx, dy, w, h]) => new BoxGeometry(w!, h!, 0.16).translate(x + dx!, base + 6 + dy!, -8.88));
      bars.push(new BoxGeometry(5.8, 0.18, 1.15).translate(x, base + 3.27, -8.48));
      // Its opening goes through the wall: the jambs and the head show their depth when the halves stand open.
      if (opens) {
        for (const [dx, dy, w, h] of [[-OPENING.x - 0.06, 0, 0.12, OPENING.y * 2], [OPENING.x + 0.06, 0, 0.12, OPENING.y * 2], [0, OPENING.y + 0.06, OPENING.x * 2 + 0.24, 0.12], [0, -OPENING.y - 0.06, OPENING.x * 2 + 0.24, 0.12]] as const) {
          bars.push(new BoxGeometry(w, h, 0.5).translate(x + dx, base + 6 + dy, -9.25));
        }
      }
      const joinery = new Mesh(mergeGeometries(bars), frame);
      joinery.name = `home-window-frame:${x}`;
      group.add(joinery);
      bars.forEach((part) => part.dispose());
    }
    // Pappa's shelf: his figures in a row, athletes and tomtar, and the first place in the row.
    if (chapter.shelf) {
      const { x, y, filled } = chapter.shelf;
      const dim = evening ? 0.62 : 1;
      const wood = (hex: string) => new MeshStandardMaterial({ color: new Color(hex).multiplyScalar(dim), roughness: 0.85 });
      // The shelf bridges the window, but stands forward of its joinery. Its rear still supports the
      // widest carving's turned feet (the bear reaches z -8.771); the frame ends at z -8.8.
      const board = new Mesh(new BoxGeometry(9.8, 0.16, 0.8), wood('#8a6a44'));
      board.name = 'home-carving-shelf';
      board.position.set(x + 0.6, y, -8.38);
      group.add(board);
      // Wall brackets support the two ends on solid wall, outside both window jambs.
      const brackets = [x - 4, x + 5.3].flatMap(at => [
        new BoxGeometry(0.14, 0.84, 0.12).translate(at, y - 0.5, -8.94),
        new BoxGeometry(0.14, 0.14, 0.92).translate(at, y - 0.15, -8.48),
      ]);
      const support = new Mesh(mergeGeometries(brackets), wood('#795a39'));
      support.name = 'home-shelf-brackets';
      group.add(support);
      brackets.forEach(part => part.dispose());
      const tones = ['#d9bd8b', '#c9a877', '#e2c898', '#b99262', '#d2b07e', '#c4a070', '#dcc08e'];
      // The pieces stand in for his carvings, which take their place where their private pack exists.
      const carved = ['tragubbe', 'hylla-luva', 'hylla-kotte', 'hylla-svamp', 'hylla-gumma', 'hylla-fiskare', 'hylla-rock', 'hylla-keps', 'hylla-bjorn'];
      for (let i = 0; i < carved.length; i++) {
        // Klonk comes back beside the old first figure after the carving lesson.
        if (chapter.epilogue && i === 1) continue;
        const at = x - 3.6 + (i < 2 ? i * 1.2 : 0.2 + i);
        if (i === 0 && !filled) {
          // The empty place: a paler patch on the wall where a figure once stood.
          const gap = new Mesh(new PlaneGeometry(0.9, 1.2), new MeshBasicMaterial({ color: evening ? '#b09a74' : '#fff6da', transparent: true, opacity: 0.75 }));
          gap.position.set(at, y + 0.68, -8.88);
          group.add(gap);
          continue;
        }
        // The first one, home again, is old: grey, with moss on its shoulder.
        const old = i === 0;
        const material = wood(old ? '#8f8c7e' : tones[i % tones.length]!);
        const tall = old ? 0.62 : 0.7 + (i % 3) * 0.12;
        const piece = new Group();
        piece.position.set(at, y + 0.08, -8.5);
        piece.userData.model = carved[i];
        piece.userData.disposeFallback = true;
        piece.userData.fit = 1;
        piece.userData.turn = (i % 3 - 1) * 0.16;
        // Broad knife-cut planes read as carved wood, including without the private collection pack.
        const body = new Mesh(new CylinderGeometry(0.17, 0.24, tall, 6), material);
        body.position.y = tall / 2;
        body.rotation.y = 0.18 * (i % 3);
        const head = new Mesh(new SphereGeometry(0.19, 7, 5), material);
        head.position.y = tall + 0.14;
        piece.add(body, head);
        const nose = new Mesh(new ConeGeometry(0.055, 0.14, 4), wood('#d7ae7c'));
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, tall + 0.13, 0.21);
        piece.add(nose);
        const eyes = wood('#35485a');
        for (const side of [-1, 1]) {
          const eye = new Mesh(new SphereGeometry(0.018, 6, 4), eyes);
          eye.position.set(side * 0.07, tall + 0.19, 0.17);
          piece.add(eye);
        }
        group.add(piece);
        // Every second one is a tomte, with a pointed cap carved from the same piece.
        if (i % 2 === 0 && !old) {
          const cap = new Mesh(new ConeGeometry(0.19, 0.42, 10), wood('#7d8ea0'));
          cap.position.y = tall + 0.46;
          piece.add(cap);
        }
        // A richer public fallback still costs one draw per carving, fewer than the old cylinder/head pair.
        const parts = piece.children.map((child) => {
          const mesh = child as Mesh;
          mesh.updateMatrix();
          const shape = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
          shape.applyMatrix4(mesh.matrix);
          const colour = (mesh.material as MeshStandardMaterial).color;
          const colours = new Float32Array(shape.getAttribute('position').count * 3);
          for (let j = 0; j < colours.length; j += 3) colours.set([colour.r, colour.g, colour.b], j);
          shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
          return shape;
        });
        const materials = new Set(piece.children.map((child) => (child as Mesh).material as MeshStandardMaterial));
        for (const child of piece.children) (child as Mesh).geometry.dispose();
        materials.forEach((material) => material.dispose());
        piece.clear();
        piece.add(new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true })));
        parts.forEach((part) => part.dispose());
      }
    }
    // The wall is solid between the windows: it is cut by drawing the sky's own colour there, behind the frames.
    const sky = evening
      ? drawn(320, 48, (c) => {
          // The night outside, with the northern lights as the mountain has them (../aurora.ts): upright rays
          // over a bright lower border that swings, violet at the top.
          c.fillStyle = '#142046';
          c.fillRect(0, 0, 320, 48);
          for (let x = 0; x < 320; x++) {
            const border = 34 + 4 * Math.sin(x * 0.035) + 1.5 * Math.sin(x * 0.15);
            const ray = 0.35 + 0.65 * Math.abs(Math.sin(x * 0.9) * Math.sin(x * 0.23 + 1));
            const light = c.createLinearGradient(0, border - 28, 0, border);
            light.addColorStop(0, 'rgba(150,90,255,0)');
            light.addColorStop(0.35, `rgba(150,90,255,${0.3 * ray})`);
            light.addColorStop(0.8, `rgba(90,240,170,${0.75 * ray})`);
            light.addColorStop(1, `rgba(210,255,225,${ray})`);
            c.fillStyle = light;
            c.fillRect(x, border - 28, 1, 28);
          }
        })
      : null;
    // In the morning the garden's far scenery is outside, each window with its own part of it; at night, its
    // own part of the sky.
    const glass = new MeshBasicMaterial({ map: sky ?? outlook(), fog: false, name: 'window-glass' });
    for (const [i, x] of house.windows.entries()) {
      // Through the window that opens, the night is further off and wide enough to fill the opening from any side.
      const opens = x === house.opens;
      const shape = sky ? new PlaneGeometry(opens ? 14 : 5.1, opens ? 12 : 5.2) : outlookPane(opens ? 14 : 5.1, opens ? 12 : 5.2, i);
      const uv = shape.getAttribute('uv');
      if (sky) for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / house.windows.length);
      const pane = new Mesh(shape, glass);
      pane.position.set(x, heightAt(chapter, x) + 6, opens ? -12.5 : -8.95);
      if (opens) pane.name = 'window-outside';
      group.add(pane);
    }
  } else if (house) {
    // Kept while the environment loads, and for the older deck look course. The garden's baked
    // veranda and whole house replace this plain wall before the first playable frame.
    const exterior = new Group();
    if (chapter.id === 'garden') exterior.name = 'garden-home-placeholder';
    group.add(exterior);
    const long = house.to - house.from;
    const floor = Math.min(...chapter.ground.map((p) => p.y));
    // Falu red boards with their cover strips, lit from the left.
    const wall = drawn(128, 32, (c) => {
      c.fillStyle = '#8f2d22';
      c.fillRect(0, 0, 128, 32);
      for (let x = 0; x < 128; x += 16) {
        c.fillStyle = 'rgba(60,14,10,0.55)';
        c.fillRect(x + 11, 0, 2, 32);
        c.fillStyle = 'rgba(214,96,74,0.5)';
        c.fillRect(x + 8, 0, 3, 32);
      }
    }, true);
    wall.repeat.set(long / 9.6, 1);
    const boards = new Mesh(new PlaneGeometry(long, 70), new MeshBasicMaterial({ map: wall }));
    boards.position.set((house.from + house.to) / 2, floor + 33, -21);
    boards.renderOrder = -2;
    // The white board at the wall's corner, and a window with its white frame for each place asked for.
    const white = new MeshBasicMaterial({ color: '#f1ece2' });
    const corner = new Mesh(new PlaneGeometry(1.8, 70), white);
    corner.position.set(house.to - 0.9, floor + 33, -20.95);
    const pane = drawn(24, 32, (c) => {
      c.fillStyle = '#f1ece2';
      c.fillRect(0, 0, 24, 32);
      const glass = c.createLinearGradient(0, 0, 24, 32);
      glass.addColorStop(0, '#fdf6d8');
      glass.addColorStop(1, '#9fc4d8');
      c.fillStyle = glass;
      c.fillRect(3, 3, 8, 12);
      c.fillRect(13, 3, 8, 12);
      c.fillRect(3, 17, 8, 12);
      c.fillRect(13, 17, 8, 12);
    });
    const glass = new MeshBasicMaterial({ map: pane });
    exterior.add(boards, corner);
    for (const x of house.windows) {
      const window = new Mesh(new PlaneGeometry(7.5, 10), glass);
      window.position.set(x, heightAt(chapter, x) + 15, -20.9);
      exterior.add(window);
    }
  }
  for (const roof of chapter.roofs ?? []) {
    const long = roof.to - roof.from;
    const mid = (roof.from + roof.to) / 2;
    const dark = new MeshStandardMaterial({ color: '#5f4f3e', roughness: 0.9 });
    const map = boards();
    map.repeat.set(long / (BOARD * 2), 9 / (BOARD * 2));
    const deck = new Mesh(new BoxGeometry(long, 0.28, 9), new MeshStandardMaterial({ color: '#b49a78', map, roughness: 0.8 }));
    deck.position.set(mid, roof.y - 0.14, -3.4);
    group.add(deck);
    const place = new Object3D();
    const joists = new InstancedMesh(new BoxGeometry(0.34, 0.8, 9), dark, Math.ceil(long / 2.6) + 1);
    for (let i = 0; i < joists.count; i++) {
      place.position.set(Math.min(roof.to - 0.2, roof.from + 0.2 + i * 2.6), roof.y - 0.68, -3.4);
      place.updateMatrix();
      joists.setMatrixAt(i, place.matrix);
    }
    joists.computeBoundingSphere();
    group.add(joists);
    // The sun between the boards: stripes of light on the ground below.
    const stripes = new InstancedMesh(
      new PlaneGeometry(0.13, 7).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: '#ffe7ae', transparent: true, opacity: 0.34, blending: AdditiveBlending, fog: false, depthWrite: false }),
      Math.floor(long / BOARD),
    );
    for (let i = 0; i < stripes.count; i++) {
      const x = roof.from + (i + 0.5) * BOARD;
      place.position.set(x, heightAt(chapter, x) + 0.03, -2.4);
      place.updateMatrix();
      stripes.setMatrixAt(i, place.matrix);
    }
    stripes.computeBoundingSphere();
    stripes.renderOrder = 2;
    group.add(stripes);
  }
  return group;
}
