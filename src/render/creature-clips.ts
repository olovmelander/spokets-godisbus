import { AnimationMixer, LoopOnce, LoopRepeat, PropertyBinding, type AnimationAction, type AnimationClip, type Object3D, type SkinnedMesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * A creature modelled, rigged and animated in Blender (art/blender/creature-tools.py), as the game plays it: one copy
 * of the model for each place it is in, with its own bones and its own mixer.
 *
 * The model comes from a pack (./assets.ts `model`, which keeps the GLB's clips on the model as `animations`). Its clips
 * are named '<creature>:<clip>' (crane:fly, crane:kneel); here they go by their own names (fly, kneel). A clip is either
 * played, on its own clock, or scrubbed: shown at a phase the game works out itself every frame (a wingbeat by the game's
 * rhythm, a step by how far the creature has gone, a rise by how high it is). Changing from one to another fades over
 * `fade` seconds, and the weights of the clips shown always add up to one, so that a pose never sags towards the
 * model's rest between them.
 *
 *   const crane = creatureClips(model, 'crane');      // null if the model has no clips of that creature
 *   group.add(crane.root);
 *   crane.play('kneel');                              // runs on its own; calling it again every frame is fine
 *   crane.scrub('fly', beat, 1 - glide);              // or, every frame: this phase, with this share
 *   crane.scrub('glide', 0.5, glide);
 *   crane.update(dt);                                 // once a frame, after play/scrub
 *   crane.bone('saddle')?.getWorldPosition(seat);     // a bone by its Blender name ('wing.L' too)
 */
export interface CreatureClips {
  /** The copy to put in the scene. */
  readonly root: Object3D;
  /** Its clips, by their own names. */
  readonly names: readonly string[];
  has(name: string): boolean;
  /** A clip's length in seconds; 0 for one it does not have. */
  duration(name: string): number;
  /**
   * From now on the clip plays on its own clock, looping, or once and held at its end; the others fade out over `fade`
   * seconds. Playing the clip that plays already changes nothing, unless `restart`.
   */
  play(name: string, options?: { fade?: number; once?: boolean; speed?: number; restart?: boolean }): void;
  /**
   * Until the next update, the clip shows `phase` of its length (0 to 1; outside that, it wraps) with `weight`. The
   * clips scrubbed in one frame share the pose by their weights. One that is neither scrubbed nor played fades out.
   */
  scrub(name: string, phase: number, weight?: number): void;
  /** Moves the clocks and the fades on by `dt` seconds, and poses the bones. */
  update(dt: number): void;
  /** A bone, by its name in Blender. */
  bone(name: string): Object3D | undefined;
  /** What it shows now: each clip with weight, and its phase. For tests and the debug view. */
  showing(): { name: string; weight: number; phase: number }[];
  dispose(): void;
}

interface Track {
  action: AnimationAction;
  duration: number;
  /** How far it is faded in, from 0 to 1, and its share of the pose while it is in. */
  presence: number;
  share: number;
  /** Its weight in the last pose. */
  weight: number;
  time: number;
  /** Played on its own clock. */
  speed: number;
  once: boolean;
}

/** The creature's clips in a model, by their own names: those named '<creature>:<name>'. */
export function creatureClipsOf(model: Object3D, creature: string): AnimationClip[] {
  const prefix = `${creature}:`;
  return (model.animations ?? []).filter((clip) => clip.name.startsWith(prefix));
}

export function creatureClips(model: Object3D, creature: string, { fade: defaultFade = 0.25 } = {}): CreatureClips | null {
  const clips = creatureClipsOf(model, creature);
  if (clips.length === 0) return null;
  const root = clone(model);
  root.animations = [];
  // A creature's bones carry it far from where its mesh was bound (folded, kneeling, flying), so the box three would
  // cull it by is not its own: it is always drawn. There are few of them, and they are near him.
  root.traverse((node) => { if ((node as SkinnedMesh).isSkinnedMesh) node.frustumCulled = false; });
  const mixer = new AnimationMixer(root);
  const tracks = new Map<string, Track>();
  for (const clip of clips) {
    const name = clip.name.slice(creature.length + 1);
    const action = mixer.clipAction(clip);
    action.setLoop(LoopRepeat, Infinity);
    action.paused = true;
    action.enabled = true;
    action.setEffectiveWeight(0);
    action.play();
    tracks.set(name, { action, duration: clip.duration, presence: 0, share: 0, weight: 0, time: 0, speed: 1, once: false });
  }
  let playing: string | null = null;
  let fade = defaultFade;
  const scrubbed = new Map<string, number>();
  const wrap = (phase: number) => (phase >= 0 && phase <= 1 ? phase : phase - Math.floor(phase));

  return {
    root,
    names: [...tracks.keys()],
    has: (name) => tracks.has(name),
    duration: (name) => tracks.get(name)?.duration ?? 0,
    play(name, options = {}) {
      const track = tracks.get(name);
      if (!track) return;
      if (playing === name && !options.restart) return;
      playing = name;
      fade = options.fade ?? defaultFade;
      track.speed = options.speed ?? 1;
      track.once = options.once ?? false;
      if (options.restart || track.presence === 0) track.time = 0;
      scrubbed.clear();
    },
    scrub(name, phase, weight = 1) {
      const track = tracks.get(name);
      if (!track) return;
      playing = null;
      track.time = wrap(phase) * track.duration;
      scrubbed.set(name, (scrubbed.get(name) ?? 0) + Math.max(0, weight));
    },
    update(dt) {
      const total = [...scrubbed.values()].reduce((sum, w) => sum + w, 0);
      // Nothing shown yet: what is asked for comes at once, as there is nothing to fade from.
      const first = [...tracks.values()].every((track) => track.presence === 0);
      const step = first ? 1 : fade > 0 ? dt / fade : 1;
      for (const [name, track] of tracks) {
        const wanted = scrubbed.size > 0 ? scrubbed.has(name) : name === playing;
        if (scrubbed.has(name)) track.share = total > 0 ? scrubbed.get(name)! / total : 0;
        else if (name === playing) track.share = 1;
        if (name === playing && dt > 0) {
          track.time += dt * track.speed;
          track.time = track.once ? Math.min(track.time, track.duration) : track.time % track.duration;
        }
        // In and out at the pace of a fade; a share follows its weight at once.
        track.presence += Math.max(-step, Math.min(step, (wanted ? 1 : 0) - track.presence));
      }
      const sum = [...tracks.values()].reduce((s, track) => s + track.presence * track.share, 0);
      for (const track of tracks.values()) {
        track.weight = sum > 0 ? (track.presence * track.share) / sum : 0;
        track.action.setEffectiveWeight(track.weight);
        track.action.setLoop(track.once ? LoopOnce : LoopRepeat, Infinity);
        track.action.clampWhenFinished = track.once;
        track.action.time = track.time;
      }
      scrubbed.clear();
      mixer.update(dt);
    },
    bone: (name) => root.getObjectByName(PropertyBinding.sanitizeNodeName(name)),
    showing: () => [...tracks].filter(([, track]) => track.weight > 0)
      .map(([name, track]) => ({ name, weight: track.weight, phase: track.duration > 0 ? track.time / track.duration : 0 })),
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      root.removeFromParent();
    },
  };
}
