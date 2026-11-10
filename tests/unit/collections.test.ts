import { describe, expect, it } from 'vitest';
import { Mesh, Box3, Vector3 } from 'three';
import { COURSES, loadAdventure2 } from '../../src/content/chapters';
import { addCollections, COLLECTION_PLACES, collectionReceipts, keepsakesFound, memoryFound, STORM_MEMORIES } from '../../src/content/collections';
import { album, albumComplete, KINDS } from '../../src/content/kinds';
import { lostFound } from '../../src/content/lost';
import { STORM_SWEETS, stormSticker } from '../../src/content/storm-sweets';
import { FIND_SHAPES } from '../../src/content/collection-items';
import { sv } from '../../src/content/sv';
import { stormSweet } from '../../src/render/storm-sweet';
import { souvenir } from '../../src/render/souvenir';
import { rememberFlags, visitChapter } from '../../src/save/journey';
import { newSave, readSave } from '../../src/save/store';
import { Sim } from '../../src/sim/sim';
import { STEP } from '../../src/sim/constants';
import { createPhotoMoments } from '../../src/content/photos';

await loadAdventure2();
const idle = {x:0,y:0,hop:false,hopHeld:false,act:false};

describe('one collection through both adventures',()=>{
  it('keeps earlier sweets, finds and memories after changing adventure, saving, reloading and replaying',()=>{
    const save=newSave(1,'garden');
    save.flags={garden:['found:gelehallon','lost:marble','memory'], stormoga:['scene:motet','scene:lampa:bertil','found:norrskensruta','lost:lanternstar']};
    const next=visitChapter(save,'stormoga',true);
    next.flags.stormoga=rememberFlags(next.flags.stormoga!,new Set(['found:norrskensruta','lost:lanternstar']),'stormoga');
    const loaded=readSave(JSON.stringify(next));
    expect(loaded.kind).toBe('save');
    if(loaded.kind!=='save') return;
    expect(album(loaded.save.flags)).toEqual(['gelehallon','norrskensruta']);
    expect(lostFound(loaded.save.flags)).toEqual(['marble','lanternstar']);
    expect(memoryFound('garden',loaded.save.flags)).toBe(true);
    expect(memoryFound('storm:lights',loaded.save.flags)).toBe(true);
    expect(keepsakesFound(loaded.save.flags)).toContain('lampfriends');
    expect(visitChapter(loaded.save,'garden',true).flags).toEqual(loaded.save.flags);
    expect(albumComplete(Object.keys(KINDS).filter(id=>!STORM_SWEETS[id]))).toBe(true);
  });

  it('adds exactly eight distinct special sweets without renumbering the trail or side candy',()=>{
    expect(Object.keys(STORM_SWEETS)).toHaveLength(8);
    for(const [id,item] of Object.entries(COLLECTION_PLACES)) {
      const chapter=COURSES[id]!;
      const candy=[...chapter.candy], side=[...chapter.side ?? []];
      const spots=chapter.spots!.length;
      addCollections(chapter);
      expect(chapter.spots).toHaveLength(spots);
      expect(chapter.candy).toEqual(candy); expect(chapter.side ?? []).toEqual(side);
      expect(chapter.spots!.filter(spot=>spot.id===`lost:${item.find}`)).toHaveLength(1);
      if(item.kind) expect(chapter.hidden!.filter(sweet=>sweet.kind===item.kind)).toHaveLength(1);
    }
  });

  it('collects the new objects and sweets on their actual stable surfaces without a fall',()=>{
    for(const [id,item] of Object.entries(COLLECTION_PLACES)) {
      const chapter=COURSES[id]!;
      const sim=new Sim({...chapter, scenes:[], beats:[], spawn:{x:item.x,y:item.y+.02}}, {}, {flags:item.after?[item.after]:[]});
      for(let n=0;n<.3/STEP;n++) sim.step(idle);
      if(item.kind) expect(sim.flags.has(`found:${item.kind}`),id).toBe(true);
      for(let n=0;n<.2/STEP;n++) sim.step({...idle,x:1});
      expect(sim.flags.has(`lost:${item.find}`),`${id}: ${sim.curr.x},${sim.curr.y}`).toBe(true);
      expect(sim.bubbles,id).toBe(0);
      expect(sim.curr.y,id).toBeGreaterThan(item.y-.15);
    }
  });

  it('locks story pictures to real discoveries and retains each as a separate replayable receipt',()=>{
    for(const [id,story] of Object.entries(STORM_MEMORIES)) {
      expect(memoryFound(id,{})).toBe(false);
      const flags=collectionReceipts(story.chapter,[story.flag]);
      expect(flags).toContain(`memory:${id}`);
      expect(memoryFound(id,{[story.chapter]:flags})).toBe(true);
      expect(sv.collection.stories[id]!.captions).toHaveLength(story.pictures.length);
    }
  });

  it('gives each new sweet a bounded model and a matching original sticker, with no missing asset socket',()=>{
    for(const kind of Object.keys(STORM_SWEETS)) {
      const model=stormSweet(kind)!;
      expect(model).not.toBeNull();
      const size=new Box3().setFromObject(model).getSize(new Vector3());
      expect(Math.max(size.x,size.y)).toBeGreaterThan(.3);
      expect(Math.max(size.x,size.y,size.z)).toBeLessThan(.6);
      expect(stormSticker(kind)).toContain(STORM_SWEETS[kind]!.colour);
      model.traverse(node=>{if(node instanceof Mesh) expect(node.geometry.getAttribute('position').count).toBeGreaterThan(10); expect(node.userData.sweet).toBeUndefined();});
    }
    for(const id of Object.keys(FIND_SHAPES)) expect(souvenir(id).children.length,id).toBeGreaterThan(1);
  });

  it('takes second-adventure photos only during newly experienced moments, and waits while play is paused',()=>{
    const tick=createPhotoMoments('alven',new Set());
    expect(tick({mode:'ride'},new Set(['al:raft']),1.3)).toBeNull();
    expect(tick({mode:'ride'},new Set(['al:raft']),0)).toBeNull();
    expect(tick({mode:'ride'},new Set(['al:raft']),.11)).toBe('raft');
    expect(tick({mode:'ride'},new Set(['al:raft']),5)).toBeNull();
    expect(createPhotoMoments('alven',new Set(['al:raft']))({mode:'ride'},new Set(['al:raft']),5)).toBeNull();
  });
});
