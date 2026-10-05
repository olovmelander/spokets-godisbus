import {
  AdditiveBlending, BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, SphereGeometry,
} from 'three';
import type { ChapterData } from '../../sim/types';
import { outlook, outlookPane } from '../backdrop';
import { BOARD, boards } from './ground';
import { drawn, heightAt } from './kit';

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
    const floor = Math.min(...chapter.ground.map((p) => p.y));
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
    const wall = new Mesh(new PlaneGeometry(long, 26), new MeshBasicMaterial({ map: panels, color: evening ? '#8c7252' : '#ffffff' }));
    wall.position.set((house.from + house.to) / 2, floor + 11, -9);
    wall.renderOrder = -2;
    group.add(wall);
    // Where the chapter goes out of doors the house ends: its white corner board, and the garden beyond it.
    if (chapter.outdoors !== undefined) {
      const corner = new Mesh(new BoxGeometry(0.7, 26, 0.5), new MeshStandardMaterial({ color: '#efe8da', roughness: 0.8 }));
      corner.position.set(chapter.outdoors + 0.35, floor + 11, -8.9);
      group.add(corner);
    }
    const frame = new MeshBasicMaterial({ color: evening ? '#a8977c' : '#f6efe2' });
    for (const x of house.windows) {
      // The frame, and a hole of sky in it: whatever is outside shows through, at night the northern lights.
      for (const [dx, dy, w, h] of [[0, 2.6, 5.4, 0.3], [0, -2.6, 5.4, 0.3], [-2.55, 0, 0.3, 5.5], [2.55, 0, 0.3, 5.5], [0, 0, 0.18, 5.2], [0, 0, 5.1, 0.18]] as const) {
        const bar = new Mesh(new PlaneGeometry(w, h), frame);
        bar.position.set(x + dx, heightAt(chapter, x) + 6 + dy, -8.9);
        group.add(bar);
      }
    }
    // Pappa's shelf: his figures in a row, athletes and tomtar, and the first place in the row.
    if (chapter.shelf) {
      const { x, y, filled } = chapter.shelf;
      const dim = evening ? 0.62 : 1;
      const wood = (hex: string) => new MeshStandardMaterial({ color: new Color(hex).multiplyScalar(dim), roughness: 0.85 });
      const board = new Mesh(new BoxGeometry(8.6, 0.16, 0.9), wood('#8a6a44'));
      board.position.set(x, y, -8.5);
      group.add(board);
      const tones = ['#d9bd8b', '#c9a877', '#e2c898', '#b99262', '#d2b07e', '#c4a070', '#dcc08e'];
      for (let i = 0; i < 7; i++) {
        // Klonk comes back beside the old first figure after the carving lesson.
        if (chapter.epilogue && i === 1) continue;
        const at = x - 3.6 + i * 1.2;
        if (i === 0 && !filled) {
          // The empty place: a paler patch on the wall where a figure once stood.
          const gap = new Mesh(new PlaneGeometry(0.9, 1.2), new MeshBasicMaterial({ color: evening ? '#b09a74' : '#fff6da', transparent: true, opacity: 0.75 }));
          gap.position.set(at, y + 0.68, -8.88);
          group.add(gap);
          continue;
        }
        // The first one, home again, is old: grey, with moss on its shoulder.
        const old = i === 0;
        const material = wood(old ? '#8f8c7e' : tones[i]!);
        const tall = old ? 0.62 : 0.7 + (i % 3) * 0.12;
        const body = new Mesh(new CylinderGeometry(0.17, 0.24, tall, 10), material);
        body.position.set(at, y + 0.08 + tall / 2, -8.5);
        const head = new Mesh(new SphereGeometry(0.19, 12, 9), material);
        head.position.set(at, y + 0.08 + tall + 0.14, -8.5);
        group.add(body, head);
        // Every second one is a tomte, with a pointed cap carved from the same piece.
        if (i % 2 === 0 && !old) {
          const cap = new Mesh(new ConeGeometry(0.19, 0.42, 10), wood('#7d8ea0'));
          cap.position.set(at, y + 0.08 + tall + 0.46, -8.5);
          group.add(cap);
        }
      }
    }
    // The wall is solid between the windows: it is cut by drawing the sky's own colour there, behind the frames.
    const sky = evening
      ? drawn(32, 32, (c) => {
          // The night outside, with the northern lights low over the trees.
          c.fillStyle = '#142046';
          c.fillRect(0, 0, 32, 32);
          const lights = c.createLinearGradient(0, 4, 0, 26);
          lights.addColorStop(0, 'rgba(90,240,170,0)');
          lights.addColorStop(0.6, 'rgba(90,240,170,0.75)');
          lights.addColorStop(1, 'rgba(90,240,170,0)');
          c.fillStyle = lights;
          c.fillRect(0, 4, 32, 22);
        })
      : null;
    // In the morning the garden's far scenery is outside, each window with its own part of it.
    const glass = new MeshBasicMaterial({ map: sky ?? outlook(), fog: false });
    for (const [i, x] of house.windows.entries()) {
      const pane = new Mesh(sky ? new PlaneGeometry(5.1, 5.2) : outlookPane(5.1, 5.2, i), glass);
      pane.position.set(x, heightAt(chapter, x) + 6, -8.95);
      group.add(pane);
    }
  } else if (house) {
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
    group.add(boards, corner);
    for (const x of house.windows) {
      const window = new Mesh(new PlaneGeometry(7.5, 10), glass);
      window.position.set(x, heightAt(chapter, x) + 15, -20.9);
      group.add(window);
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
