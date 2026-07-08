/**
 * Hybrid tactical-board 3D unit renderer (Three.js GLB + animation mixer).
 * Viewers are cached per board token uid so combat re-renders do not reload GLBs.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const STATES = (typeof UNIT_VISUAL !== "undefined" && UNIT_VISUAL.STATES) || {
  IDLE: "idle",
  WALK: "walk",
  ATTACK: "attack",
  SKILL: "skill",
  FALL: "fall"
};

const CLIP_ALIASES =
  (typeof UNIT_VISUAL !== "undefined" && UNIT_VISUAL.CLIP_ALIASES) || {
    idle: ["Idle", "idle"],
    walk: ["Walk", "walk"],
    attack: ["Attack", "attack"],
    skill: ["Skill", "skill"],
    fall: ["Death", "Fall", "death"]
  };

const LOOPING = new Set([STATES.IDLE]);
const loader = new GLTFLoader();
const modelCache = new Map();
/** @type {Map<string, TokenViewer>} */
const viewers = new Map();
let rafId = null;
let clock = new THREE.Clock();
let bridge = null;

function tokenKeyFromEl(tokenEl) {
  if (!tokenEl) return "";
  const foe = tokenEl.getAttribute("data-tactical-foe");
  if (foe != null) return `foe:${foe}`;
  const ally = tokenEl.getAttribute("data-tactical-ally");
  if (ally != null) return `ally:${ally}`;
  return "";
}

function loadGltf(url) {
  const key = String(url || "").trim();
  if (!key) return Promise.reject(new Error("empty model url"));
  if (modelCache.has(key)) return modelCache.get(key);
  const p = new Promise((resolve, reject) => {
    loader.load(
      key,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err || new Error(`failed to load ${key}`))
    );
  });
  modelCache.set(key, p);
  p.catch(() => modelCache.delete(key));
  return p;
}

function normalizeAnimState(state) {
  if (state === "walking") return "walk";
  if (state === "falling") return "fall";
  return state;
}

function resolveClipName(state, model3dDef, gltf, skillName) {
  const st = normalizeAnimState(state);
  const clips = gltf.animations || [];
  if (!clips.length) return null;
  const byName = new Map(clips.map((c) => [c.name, c]));
  const skillClip =
    skillName &&
    typeof UNIT_VISUAL !== "undefined" &&
    UNIT_VISUAL.resolveSkillVisualClip &&
    UNIT_VISUAL.resolveSkillVisualClip(skillName, model3dDef);
  if (typeof skillClip === "string" && skillClip.trim() && byName.has(skillClip.trim())) {
    return skillClip.trim();
  }
  const custom = model3dDef?.animations?.[st] ?? model3dDef?.animations?.[state];
  if (typeof custom === "string" && custom.trim() && byName.has(custom.trim())) {
    return custom.trim();
  }
  const aliases = CLIP_ALIASES[st] || CLIP_ALIASES[state] || [];
  for (const alias of aliases) {
    if (byName.has(alias)) return alias;
  }
  for (const clip of clips) {
    const lower = clip.name.toLowerCase();
    if (lower.includes(st)) return clip.name;
  }
  if (st === STATES.SKILL) {
    for (const alias of CLIP_ALIASES.attack || []) {
      if (byName.has(alias)) return alias;
    }
  }
  return clips[0] ? clips[0].name : null;
}

function applyMeshMaterialFixes(obj, model3dDef) {
  if (!obj || !obj.isMesh) return;
  obj.frustumCulled = false;
  if (model3dDef?.forceSolidMaterial) {
    const solid = new THREE.MeshStandardMaterial({
      color: 0x8be06b,
      emissive: 0x183818,
      emissiveIntensity: 0.35,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => m && m.dispose && m.dispose());
    obj.material = solid;
    return;
  }
  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
  mats.forEach((m) => {
    if (!m) return;
    m.transparent = false;
    m.opacity = 1;
    m.side = THREE.DoubleSide;
    m.depthWrite = true;
    m.needsUpdate = true;
  });
}

function updateSkinnedMeshes(root) {
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!obj.isSkinnedMesh || !obj.skeleton) return;
    obj.skeleton.update();
    if (typeof obj.computeBoundingBox === "function") obj.computeBoundingBox();
    if (typeof obj.computeBoundingSphere === "function") obj.computeBoundingSphere();
  });
}

function computeContentBounds(content) {
  updateSkinnedMeshes(content);
  const box = new THREE.Box3();
  let hasBounds = false;
  const bonePos = new THREE.Vector3();

  content.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.isSkinnedMesh) {
      if (typeof obj.computeBoundingBox === "function") obj.computeBoundingBox();
      const skinnedBox = new THREE.Box3();
      if (obj.boundingBox) {
        skinnedBox.copy(obj.boundingBox).applyMatrix4(obj.matrixWorld);
      } else {
        skinnedBox.setFromObject(obj);
      }
      if (Number.isFinite(skinnedBox.min.x)) {
        if (!hasBounds) {
          box.copy(skinnedBox);
          hasBounds = true;
        } else {
          box.union(skinnedBox);
        }
      }
      return;
    }
    const g = obj.geometry;
    if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingBox) return;
    const meshBox = g.boundingBox.clone().applyMatrix4(obj.matrixWorld);
    if (!hasBounds) {
      box.copy(meshBox);
      hasBounds = true;
    } else {
      box.union(meshBox);
    }
  });

  if (!hasBounds || box.getSize(new THREE.Vector3()).lengthSq() < 1e-6) {
    content.traverse((obj) => {
      if (!obj.isSkinnedMesh || !obj.skeleton) return;
      obj.skeleton.bones.forEach((bone) => {
        bone.getWorldPosition(bonePos);
        if (!hasBounds) {
          box.set(bonePos, bonePos);
          hasBounds = true;
        } else {
          box.expandByPoint(bonePos);
        }
      });
    });
  }

  if (!hasBounds) box.setFromObject(content);
  return box;
}

function normalizeModel(content, model3dDef) {
  content.traverse((obj) => applyMeshMaterialFixes(obj, model3dDef));

  const holder = new THREE.Group();
  holder.name = "unitModelHolder";
  holder.add(content);

  const box = computeContentBounds(content);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const dims = [size.x, size.y, size.z].filter((v) => Number.isFinite(v) && v > 0);
  const maxDim = dims.length ? Math.max(...dims) : 1;
  const targetSize = Number(model3dDef?.baseScale);
  const fitTarget = Number.isFinite(targetSize) && targetSize > 0 ? targetSize : 1.6;
  const scaleMult = Number(model3dDef?.scale);
  const scale =
    (fitTarget / maxDim) * (Number.isFinite(scaleMult) && scaleMult > 0 ? scaleMult : 1);

  content.position.set(-center.x, -box.min.y, -center.z);
  content.position.y += Number(model3dDef?.yOffset) || 0;
  holder.scale.setScalar(scale);
  const rotY = Number(model3dDef?.rotationY);
  const rotX = Number(model3dDef?.rotationX);
  const rotZ = Number(model3dDef?.rotationZ);
  if (Number.isFinite(rotY) && rotY !== 0) holder.rotation.y = THREE.MathUtils.degToRad(rotY);
  if (Number.isFinite(rotX) && rotX !== 0) holder.rotation.x = THREE.MathUtils.degToRad(rotX);
  if (Number.isFinite(rotZ) && rotZ !== 0) holder.rotation.z = THREE.MathUtils.degToRad(rotZ);
  updateSkinnedMeshes(holder);

  const outBox = new THREE.Box3().setFromObject(holder);
  const outSize = outBox.getSize(new THREE.Vector3());
  const outDims = [outSize.x, outSize.y, outSize.z].filter((v) => Number.isFinite(v) && v > 0);
  const radius = outDims.length ? Math.max(...outDims) * 0.5 : 1;
  const safeRadius = Math.max(0.25, Math.min(4, radius));
  const safeHeight =
    Number.isFinite(outSize.y) && outSize.y > 0 ? Math.max(0.2, Math.min(8, outSize.y)) : 1;

  if (model3dDef?.debugLogBounds) {
    console.info("[UnitModel3D] fitted", {
      url: model3dDef.url,
      rawSize: { x: size.x, y: size.y, z: size.z },
      scale,
      outSize: { x: outSize.x, y: outSize.y, z: outSize.z }
    });
  }

  return {
    root: holder,
    radius: safeRadius,
    height: safeHeight,
    uniformScale: scale
  };
}

class TokenViewer {
  constructor(tokenKey, model3dDef) {
    this.tokenKey = tokenKey;
    this.model3dDef = model3dDef;
    this.tokenEl = null;
    this.mountEl = null;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "unit-model3d-canvas";

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
    this.camera.position.set(0, 1.35, 3.4);
    this.camera.lookAt(0, 0.75, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    const debugBg = !!this.model3dDef?.debugForceVisible;
    this.renderer.setClearColor(debugBg ? 0x2a003f : 0x000000, debugBg ? 0.35 : 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3028, 1.05);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff2dd, 1.15);
    key.position.set(2.2, 4.5, 3.2);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8c8ff, 0.35);
    fill.position.set(-2.5, 1.5, -2);
    this.scene.add(fill);
    if (this.model3dDef?.debugForceVisible) {
      const dbgGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const dbgMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: false });
      this.debugCube = new THREE.Mesh(dbgGeo, dbgMat);
      this.debugCube.position.set(0, 0.4, 0);
      this.scene.add(this.debugCube);
    } else {
      this.debugCube = null;
    }

    this.model = null;
    this.mixer = null;
    this.actions = new Map();
    this.skillActions = new Map();
    this.gltf = null;
    this.currentState = "";
    this.currentSkillName = "";
    this.currentAction = null;
    this.modelRadius = 1;
    this.modelHeight = 1;
    this.modelRotationY = null;
    this.cameraPitchDeg = null;
    this.cameraYawDeg = null;
    this.uniformScale = 1;
    this.facingFlip = 1;
    this.flipRoot = null;
    this.pendingActionDone = null;
    this._actionDoneResolve = null;
    this.loaded = false;
    this.failed = false;
    this.loading = false;
    this.errorReason = "";
    this.mixerFinishedHandler = (ev) => {
      if (!ev || ev.action !== this.currentAction) return;
      const st = this.currentState;
      if (st === STATES.FALL) {
        const unit = this.tokenEl && bridge?.getUnitForToken?.(this.tokenEl);
        if (unit && bridge?.onFallComplete) bridge.onFallComplete(unit, this.tokenEl);
        return;
      }
      if (st === STATES.WALK) {
        this.finishActionWait();
        return;
      }
      if (st === STATES.ATTACK || st === STATES.SKILL) {
        this.finishActionWait();
        const unit = this.tokenEl && bridge?.getUnitForToken?.(this.tokenEl);
        if (unit && bridge?.onActionAnimComplete) bridge.onActionAnimComplete(unit, st);
        this.playState(STATES.IDLE, { force: true });
      }
    };
  }

  finishActionWait() {
    if (this._actionDoneResolve) {
      this._actionDoneResolve();
      this._actionDoneResolve = null;
    }
    this.pendingActionDone = null;
  }

  beginActionWait() {
    this.finishActionWait();
    this.pendingActionDone = new Promise((resolve) => {
      this._actionDoneResolve = resolve;
    });
    return this.pendingActionDone;
  }

  applyFacingFlip() {
    if (!this.model) return;
    const s = Math.abs(this.uniformScale) || 1;
    const flip = this.facingFlip < 0 ? -1 : 1;
    if (this.flipRoot) {
      this.flipRoot.scale.set(flip, 1, 1);
      this.model.scale.setScalar(s);
    } else {
      this.model.scale.set(s * flip, s, s);
    }
  }

  setFacingFlip(facingSign) {
    const next = Number(facingSign) < 0 ? -1 : 1;
    this.facingFlip = next;
    this.applyFacingFlip();
    if (this.loaded && !this.failed) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  attach(tokenEl, mountEl) {
    this.tokenEl = tokenEl;
    this.mountEl = mountEl;
    if (!this.mountEl) return;
    if (this.canvas.parentNode !== this.mountEl) {
      this.mountEl.appendChild(this.canvas);
    }
    if (!this.loading && !this.loaded && !this.failed) {
      this.load();
    } else if (this.loaded) {
      this.mountEl.classList.add("unit-model3d-mount--ready");
      this.resize();
      this.syncFromBridge();
      if (this.tokenEl && bridge?.onTokenViewerReady) bridge.onTokenViewerReady(this.tokenEl);
      ensureTick();
    } else if (this.failed) {
      this.mountEl.classList.add("unit-model3d-mount--failed");
    }
  }

  async load() {
    if (this.loading || this.loaded || this.failed) return;
    this.loading = true;
    try {
      const gltf = await loadGltf(this.model3dDef.url);
      this.gltf = gltf;
      // Rigged GLBs must be cloned via SkeletonUtils, not scene.clone(true).
      const content = cloneSkinned(gltf.scene);
      const fitted = normalizeModel(content, this.model3dDef);
      this.modelRadius = fitted.radius;
      this.modelHeight = fitted.height;
      this.uniformScale = Number.isFinite(fitted.uniformScale) && fitted.uniformScale > 0 ? fitted.uniformScale : 1;
      this.flipRoot = new THREE.Group();
      this.flipRoot.name = "unitModelFlip";
      this.scene.add(this.flipRoot);
      this.model = fitted.root;
      this.flipRoot.add(this.model);
      this.applyFacingFlip();
      if (Number.isFinite(this.modelRotationY)) {
        this.model.rotation.y = THREE.MathUtils.degToRad(this.modelRotationY);
      }
      if (!this.model3dDef?.disableAnimations && gltf.animations && gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(this.model);
        this.mixer.addEventListener("finished", this.mixerFinishedHandler);
        const states = [STATES.IDLE, STATES.WALK, STATES.ATTACK, STATES.SKILL, STATES.FALL];
        for (const state of states) {
          const clipName = resolveClipName(state, this.model3dDef, gltf);
          if (!clipName) continue;
          const clip = THREE.AnimationClip.findByName(gltf.animations, clipName);
          if (clip) this.actions.set(state, this.mixer.clipAction(clip));
        }
      }
      this.loaded = true;
      this.loading = false;
      if (this.mountEl) {
        this.mountEl.classList.remove("unit-model3d-mount--failed");
        this.mountEl.classList.add("unit-model3d-mount--ready");
      }
      if (this.tokenEl && this.tokenEl.classList) {
        this.tokenEl.classList.add("fight-tactical-token--model3d-ready");
        this.tokenEl.classList.remove("fight-tactical-token--model3d-fallback");
      }
      const initial =
        (this.tokenEl && bridge?.getAnimStateForToken?.(this.tokenEl)) || STATES.IDLE;
      this.playState(initial, { force: true });
      this.resize();
      if (this.tokenEl && bridge?.onTokenViewerReady) bridge.onTokenViewerReady(this.tokenEl);
      ensureTick();
    } catch (err) {
      this.loading = false;
      this.errorReason = err && err.message ? String(err.message) : "unknown GLB load error";
      console.error("[UnitModel3D] load failed:", this.model3dDef.url, err);
      if (this.model3dDef?.debugForceVisible) {
        // Keep rendering a guaranteed visible probe so we can isolate mount/layer issues.
        const dbgGeo = new THREE.SphereGeometry(0.4, 20, 20);
        const dbgMat = new THREE.MeshBasicMaterial({ color: 0xff3355 });
        const failProbe = new THREE.Mesh(dbgGeo, dbgMat);
        failProbe.position.set(0, 0.55, 0);
        this.scene.add(failProbe);
        this.debugCube = failProbe;
        this.loaded = true;
        this.failed = false;
        if (this.mountEl) {
          this.mountEl.classList.remove("unit-model3d-mount--failed");
          this.mountEl.classList.add("unit-model3d-mount--ready");
        }
        if (this.tokenEl && this.tokenEl.classList) {
          this.tokenEl.classList.add("fight-tactical-token--model3d-ready");
          this.tokenEl.classList.remove("fight-tactical-token--model3d-fallback");
        }
        this.resize();
        ensureTick();
      } else {
        this.failed = true;
        if (this.mountEl) this.mountEl.classList.add("unit-model3d-mount--failed");
        if (this.tokenEl && this.tokenEl.classList) {
          this.tokenEl.classList.remove("fight-tactical-token--model3d-ready");
          this.tokenEl.classList.add("fight-tactical-token--model3d-fallback");
        }
      }
      if (this.tokenEl && bridge?.onLoadFailed) bridge.onLoadFailed(this.tokenEl, this.errorReason);
    }
  }

  resize() {
    if (!this.mountEl || this.failed || !this.loaded) return;
    const w = Math.max(1, this.mountEl.clientWidth);
    const h = Math.max(1, this.mountEl.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.model3dDef?.debugForceVisible) {
      // Fixed debug camera so probes stay visible even if model bounds are bad.
      this.camera.position.set(0, 1.15, 3.2);
      this.camera.near = 0.01;
      this.camera.far = 50;
      this.camera.lookAt(0, 0.45, 0);
      this.camera.updateProjectionMatrix();
      return;
    }
    const fov = THREE.MathUtils.degToRad(this.camera.fov || 28);
    const targetY = Math.max(0.3, this.modelHeight * 0.55);
    const dist = Math.max(1.2, (this.modelRadius * 1.85) / Math.tan(fov * 0.5));
    // cameraPitch (degrees): 0 = head-on, 90 = straight top-down. Default ~12deg.
    const pitchOverride = Number(this.cameraPitchDeg);
    const pitchRaw = Number.isFinite(pitchOverride)
      ? pitchOverride
      : Number(this.model3dDef?.cameraPitch);
    const pitchDeg = Number.isFinite(pitchRaw) ? Math.max(-10, Math.min(89, pitchRaw)) : 12;
    const pitch = THREE.MathUtils.degToRad(pitchDeg);
    const yawOverride = Number(this.cameraYawDeg);
    const yawRaw = Number.isFinite(yawOverride) ? yawOverride : Number(this.model3dDef?.cameraYaw);
    const yawDeg = Number.isFinite(yawRaw) ? yawRaw : 0;
    const yaw = THREE.MathUtils.degToRad(yawDeg);
    const horiz = Math.cos(pitch) * dist;
    const camX = horiz * Math.sin(yaw);
    const camZ = horiz * Math.cos(yaw);
    const camY = targetY + Math.sin(pitch) * dist;
    this.camera.position.set(camX, camY, camZ);
    this.camera.near = Math.max(0.01, dist * 0.02);
    this.camera.far = Math.max(20, dist + this.modelRadius * 8);
    this.camera.lookAt(0, targetY, 0);
    this.camera.updateProjectionMatrix();
  }

  getActionForState(state, skillName) {
    const st = normalizeAnimState(state || STATES.IDLE);
    const customClip = resolveClipName(st, this.model3dDef, this.gltf, skillName);
    const defaultClip = resolveClipName(st, this.model3dDef, this.gltf, null);
    if (!customClip || customClip === defaultClip) {
      return this.actions.get(st) || this.actions.get(STATES.IDLE);
    }
    const key = `${st}::${skillName || customClip}`;
    let action = this.skillActions.get(key);
    if (!action && this.mixer && this.gltf) {
      const clip = THREE.AnimationClip.findByName(this.gltf.animations, customClip);
      if (clip) {
        action = this.mixer.clipAction(clip);
        this.skillActions.set(key, action);
      }
    }
    return action || this.actions.get(st) || this.actions.get(STATES.IDLE);
  }

  playState(state, opts = {}) {
    if (!this.loaded || this.failed) return;
    const next = normalizeAnimState(state || STATES.IDLE);
    const skillName = opts.skillName || null;
    if (!opts.force && this.currentState === next && this.currentSkillName === skillName) return;
    if (
      opts.force &&
      this.currentState === next &&
      this.currentSkillName === skillName &&
      this.currentAction &&
      typeof this.currentAction.isRunning === "function" &&
      this.currentAction.isRunning() &&
      !LOOPING.has(next)
    ) {
      return;
    }
    if (this.currentState === STATES.FALL) {
      if (next !== STATES.FALL) return;
      if (
        !opts.force &&
        this.currentAction &&
        typeof this.currentAction.isRunning === "function" &&
        !this.currentAction.isRunning()
      ) {
        return;
      }
    }

    const action = this.getActionForState(next, skillName);
    if (!action) return;

    const prev = this.currentAction;
    this.currentState = next;
    this.currentSkillName = skillName;
    this.currentAction = action;
    action.reset();
    const oncePerStep = next === STATES.WALK && !!opts.oncePerStep;
    const shouldLoop = !oncePerStep && LOOPING.has(next);
    action.setLoop(shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce, shouldLoop ? Infinity : 1);
    action.clampWhenFinished = !shouldLoop;
    action.enabled = true;
    const targetDurationMs = Number(opts.durationMs);
    if (oncePerStep && targetDurationMs > 0) {
      const clip = action.getClip();
      const stepSec = targetDurationMs / 1000;
      const clipDur = clip && clip.duration > 0 ? clip.duration : 0;
      action.setEffectiveTimeScale(clipDur > 0 && stepSec > 0 ? clipDur / stepSec : 1);
    } else if (
      !shouldLoop &&
      targetDurationMs > 0 &&
      (next === STATES.ATTACK || next === STATES.SKILL || next === STATES.FALL)
    ) {
      const clip = action.getClip();
      const targetSec = targetDurationMs / 1000;
      const clipDur = clip && clip.duration > 0 ? clip.duration : 0;
      action.setEffectiveTimeScale(clipDur > 0 && targetSec > 0 ? clipDur / targetSec : 1);
    } else {
      action.setEffectiveTimeScale(1);
    }
    action.setEffectiveWeight(1);
    action.play();
    if (prev && prev !== action) {
      prev.crossFadeTo(action, 0.12, false);
    }
    if (!shouldLoop && next !== STATES.IDLE && next !== STATES.FALL) {
      this.beginActionWait();
    }
  }

  syncFromBridge() {
    if (!this.loaded || this.failed || !this.tokenEl || !bridge?.getAnimStateForToken) return;
    const facing = bridge.getFacingForToken?.(this.tokenEl);
    if (facing != null) this.setFacingFlip(facing);
    const skillName = bridge.getVisualSkillForToken?.(this.tokenEl) || null;
    const state = bridge.getAnimStateForToken(this.tokenEl);
    const force = !!(bridge.shouldForceVisualSync && bridge.shouldForceVisualSync(this.tokenEl));
    this.playState(state, { skillName, force });
  }

  estimateClipDurationMs(state, skillName, durationMs) {
    const targetMs = Number(durationMs);
    if (targetMs > 0 && (state === STATES.ATTACK || state === STATES.SKILL || state === STATES.FALL)) {
      return targetMs;
    }
    const action = this.getActionForState(state, skillName);
    const clip = action && typeof action.getClip === "function" ? action.getClip() : null;
    if (!clip || !Number.isFinite(clip.duration) || clip.duration <= 0) return 0;
    const oncePerStep = state === STATES.WALK;
    if (oncePerStep) return 0;
    return Math.ceil(clip.duration * 1000);
  }

  setModelRotation(rotationYDeg) {
    const deg = Number(rotationYDeg);
    if (!Number.isFinite(deg)) return;
    this.modelRotationY = deg;
    if (!this.loaded || this.failed || !this.model) return;
    this.model.rotation.y = THREE.MathUtils.degToRad(deg);
    this.renderer.render(this.scene, this.camera);
  }

  setCameraPitch(pitchDeg) {
    const deg = Number(pitchDeg);
    if (!Number.isFinite(deg)) return;
    this.cameraPitchDeg = Math.max(-10, Math.min(89, deg));
    if (!this.loaded || this.failed) return;
    this.resize();
    this.renderer.render(this.scene, this.camera);
  }

  setCameraYaw(yawDeg) {
    const deg = Number(yawDeg);
    if (!Number.isFinite(deg)) return;
    this.cameraYawDeg = Math.max(-180, Math.min(180, deg));
    if (!this.loaded || this.failed) return;
    this.resize();
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    if (!this.loaded || this.failed) return;
    if (this.mixer) this.mixer.update(dt);
    if (this.debugCube) this.debugCube.rotation.y += dt * 1.35;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.mixer) {
      this.mixer.removeEventListener("finished", this.mixerFinishedHandler);
      this.mixer.stopAllAction();
    }
    this.actions.clear();
    this.skillActions.clear();
    if (this.flipRoot) {
      this.scene.remove(this.flipRoot);
      this.flipRoot = null;
    } else if (this.model) {
      this.scene.remove(this.model);
    }
    if (this.model) {
      this.model.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose && m.dispose());
        }
      });
    }
    this.renderer.dispose();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.tokenEl = null;
    this.mountEl = null;
    this.loaded = false;
    this.loading = false;
  }
}

function ensureTick() {
  if (rafId != null) return;
  clock.start();
  const tick = () => {
    const dt = Math.min(0.05, clock.getDelta());
    let active = 0;
    viewers.forEach((viewer) => {
      if (!viewer || viewer.failed || !viewer.loaded || !viewer.mountEl) return;
      viewer.resize();
      viewer.syncFromBridge();
      viewer.update(dt);
      active++;
    });
    if (active > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(tick);
}

function hydrateLayer(layerEl, nextBridge) {
  if (!layerEl) return;
  bridge = nextBridge || bridge;
  const activeKeys = new Set();

  layerEl.querySelectorAll(".fight-tactical-token").forEach((token) => {
    const mount = token.querySelector(".unit-model3d-mount");
    if (!mount) return;
    const key = tokenKeyFromEl(token);
    if (!key) return;
    activeKeys.add(key);

    const model3dDef = bridge?.getModel3dForToken?.(token);
    if (!model3dDef) return;

    let viewer = viewers.get(key);
    if (!viewer) {
      viewer = new TokenViewer(key, model3dDef);
      viewers.set(key, viewer);
    } else if (model3dDef) {
      viewer.model3dDef = model3dDef;
    }
    viewer.attach(token, mount);
  });

  for (const [key, viewer] of viewers) {
    if (!activeKeys.has(key)) {
      viewer.dispose();
      viewers.delete(key);
    }
  }

  ensureTick();
}

function setTokenAnim(tokenEl, state, opts) {
  const key = tokenKeyFromEl(tokenEl);
  if (!key) return;
  const viewer = viewers.get(key);
  if (viewer) viewer.playState(state, opts || {});
}

function setTokenModelRotation(tokenEl, rotationYDeg) {
  const key = tokenKeyFromEl(tokenEl);
  if (!key) return;
  const viewer = viewers.get(key);
  if (viewer) viewer.setModelRotation(rotationYDeg);
}

function setTokenCameraPitch(tokenEl, pitchDeg) {
  const key = tokenKeyFromEl(tokenEl);
  if (!key) return;
  const viewer = viewers.get(key);
  if (viewer) viewer.setCameraPitch(pitchDeg);
}

function setTokenCameraYaw(tokenEl, yawDeg) {
  const key = tokenKeyFromEl(tokenEl);
  if (!key) return;
  const viewer = viewers.get(key);
  if (viewer) viewer.setCameraYaw(yawDeg);
}

function setTokenFacing(tokenEl, facingSign) {
  const key = tokenKeyFromEl(tokenEl);
  if (!key) return;
  const viewer = viewers.get(key);
  if (viewer) viewer.setFacingFlip(facingSign);
}

function estimateClipDurationMs(tokenEl, state, skillName, durationMs) {
  const key = tokenKeyFromEl(tokenEl);
  if (!key) return 0;
  const viewer = viewers.get(key);
  if (!viewer || !viewer.loaded) return 0;
  return viewer.estimateClipDurationMs(
    normalizeAnimState(state || STATES.IDLE),
    skillName || null,
    durationMs
  );
}

function releaseStuckActionWaits() {
  viewers.forEach((viewer) => {
    if (viewer && viewer.pendingActionDone) viewer.finishActionWait();
  });
}

function whenActionAnimsSettled(timeoutMs) {
  const pending = [];
  viewers.forEach((viewer) => {
    if (viewer && viewer.pendingActionDone) pending.push(viewer.pendingActionDone);
  });
  if (!pending.length) return Promise.resolve();
  const wait = Promise.all(pending);
  const limit = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 2500;
  const timeout = new Promise((resolve) => {
    setTimeout(() => {
      releaseStuckActionWaits();
      resolve();
    }, limit);
  });
  return Promise.race([wait, timeout]);
}

function disposeAll() {
  for (const viewer of viewers.values()) {
    viewer.dispose();
  }
  viewers.clear();
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

window.UnitModel3D = {
  STATES,
  hydrateLayer,
  setTokenAnim,
  setTokenModelRotation,
  setTokenCameraPitch,
  setTokenCameraYaw,
  setTokenFacing,
  estimateClipDurationMs,
  whenActionAnimsSettled,
  releaseStuckActionWaits,
  disposeAll,
  ensureTick
};
