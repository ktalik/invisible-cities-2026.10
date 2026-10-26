// Uniforms shared by every kit shader. The stage advances `time` every frame
// (and the screenshot harness sets it deterministically).

import * as THREE from 'three';

export const U = {
  time: { value: 0 },
  /** Direction towards the sun, set from the current environment. */
  sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
  sunColor: { value: new THREE.Color('#fff2dd') },
};
