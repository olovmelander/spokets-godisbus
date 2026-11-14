/** Godisracet's camera: behind the direction of travel, so a drifting kart is seen turned into its bend; it
 * drops back and widens under a boost, hangs behind a jump, jolts when the kart is hit, and tours the lap
 * behind the menu. Reduced motion keeps the framing and leaves out the shake, the roll and the widening.
 */
import * as THREE from 'three';
import { TOP_SPEED, type Kart } from '../sim/kart';
import type { Track } from '../sim/track';

export type CameraMode = 'menu' | 'race' | 'result';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * Math.max(0, dt));
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const wobble = (t: number, seed: number) => Math.sin(t * 1.93 + seed) * .5 + Math.sin(t * 3.17 + seed * 2.3) * .32 + Math.sin(t * 5.71 + seed * 4.1) * .18;
const verticalFov = (horizontal: number, aspect: number) => THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(horizontal) / 2) / Math.max(.1, aspect)));

export function createChaseCamera(camera: THREE.PerspectiveCamera, track: Track, { calm }: { calm: boolean }) {
  const point = track.point(0), kart = new THREE.Vector3(), position = new THREE.Vector3(), target = new THREE.Vector3(), direction = new THREE.Vector3();
  let ready = false, yaw = 0, yawRate = 0, rush = 0, roll = 0, trauma = 0, fov = 60, height = 0, tour = 0;
  function setFov(next: number, dt: number) {
    fov = ready ? fov + (next - fov) * ease(4, dt) : next;
    if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  return {
    reset() { ready = false; trauma = 0; roll = 0; rush = 0; yawRate = 0; },
    /** A jolt in 0..1: a barrier, a landing, a hit. */
    shake(amount: number) { if (!calm) trauma = clamp(trauma + amount, 0, 1); },
    /** The lap distance the picture is about: the player in a race, the camera's own tour behind the menu. */
    get focus() { return tour; },
    update(driver: Kart, mode: CameraMode, dt: number, time: number) {
      const step = clamp(dt, 0, .1), portrait = clamp((1.3 - camera.aspect) / .84, 0, 1);
      trauma = Math.max(0, trauma - step * 1.8);
      if (mode === 'menu') {
        // A slow flight round the whole course, looking down the road ahead.
        tour = calm ? 40 : time * 15;
        track.point(tour, 0, point);
        position.set(point.x - Math.sin(point.angle) * 7, point.y + 7.5, point.z - Math.cos(point.angle) * 7);
        track.point(tour + 24, 0, point); target.set(point.x, point.y + 1, point.z);
        if (!ready) { camera.position.copy(position); ready = true; }
        camera.position.lerp(position, ease(2, step)); camera.up.set(0, 1, 0); camera.lookAt(target);
        setFov(Math.max(58, verticalFov(52, camera.aspect)), step);
        return;
      }
      track.point(driver.distance, driver.lane, point);
      kart.set(point.x, point.y + driver.y, point.z);
      tour = driver.distance;
      const travel = point.angle + driver.heading + (driver.speed < -.5 ? 0 : 0);
      if (mode === 'result') {
        const angle = travel + Math.PI + (calm ? .8 : time * .22);
        position.set(kart.x + Math.sin(angle) * 7.5, kart.y + 2.6, kart.z + Math.cos(angle) * 7.5);
        target.copy(kart); target.y += .8;
        if (!ready) { camera.position.copy(position); ready = true; }
        camera.position.lerp(position, ease(1.8, step)); camera.up.set(0, 1, 0); camera.lookAt(target);
        setFov(Math.max(50, verticalFov(44, camera.aspect)), step);
        return;
      }
      if (!ready) { yaw = travel; height = kart.y; yawRate = 0; }
      const before = yaw;
      // Round a spin the camera holds its line, and in a drift it stays a little behind the swing.
      yaw += wrap(travel - yaw) * ease(driver.spin > 0 ? 2 : driver.drift ? 6 : 8, step);
      yawRate += ((step ? wrap(yaw - before) / step : 0) - yawRate) * ease(6, step);
      const fast = clamp(driver.speed / TOP_SPEED, 0, 1.4);
      rush += ((driver.boostTime > 0 ? 1 : 0) - rush) * ease(driver.boostTime > 0 ? 7 : 2.5, step);
      const back = 5.6 + .7 * fast + 1.5 * rush + portrait * 1.5, up = 2.5 + .2 * fast + portrait * .8;
      direction.set(Math.sin(yaw), 0, Math.cos(yaw));
      position.copy(kart).addScaledVector(direction, -back);
      // The camera rides at its own height over the road, and lags a jump so the kart is seen to fly.
      height += (point.y + Math.min(driver.y, 1.2) * .35 - height) * ease(driver.airborne ? 3 : 9, ready ? step : 1);
      position.y = Math.max(height + up, track.height(driver.distance - back) + 1.2);
      target.copy(kart).addScaledVector(direction, 5 + 3 * fast);
      target.y = height + .9 + clamp(driver.y, 0, 3) * .3;
      camera.position.copy(position); camera.up.set(0, 1, 0); camera.lookAt(target);
      ready = true;
      const wish = calm ? 0 : clamp(-yawRate * .05, -.06, .06);
      roll += (wish - roll) * ease(5, step);
      camera.rotateZ(roll);
      setFov(Math.min(100, Math.max(62, verticalFov(46, camera.aspect)) + (calm ? 0 : 8 * Math.min(1, fast) ** 2 + 13 * rush)), step);
      if (!calm) {
        const jolt = trauma * trauma, buzz = .004 * fast * fast + .01 * rush;
        camera.translateX(buzz * wobble(time * 23, 1.1) + jolt * .22 * wobble(time * 19, 4.2));
        camera.translateY(buzz * wobble(time * 27, 2.7) + jolt * .17 * wobble(time * 17, 7.7));
        camera.rotateZ(jolt * .06 * wobble(time * 15, 3.3));
      }
    },
  };
}
