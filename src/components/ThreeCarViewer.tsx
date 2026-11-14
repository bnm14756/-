import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  buildProceduralCar,
  createStudioFloorShadowTexture,
  type BuiltCarRig,
  type HoverTarget,
  type InteractablePartType,
} from '../three/carModelBuilder';
import type { PaintOption, VehicleBodyType, WheelOption } from '../types/driving';

interface ThreeCarViewerProps {
  bodyType: VehicleBodyType;
  paint: PaintOption;
  wheel: WheelOption;
  cameraCommand: { deg: number; seq: number } | null;
  autoRotate: boolean;
  doorsAndLightsOpen: boolean;
  onChangeRotation: (deg: number) => void;
  onUserInteraction?: () => void;
  onClickDoorsOrLights?: () => void;
  onClickWheels?: () => void;
  onClickBodyPaint?: () => void;
}

const HOVER_LABELS: Record<InteractablePartType, string> = {
  door: '도어 클릭 · 문 열기 / 닫기',
  wheel: '휠 클릭 · 다음 휠 옵션 변경',
  body: '차체 클릭 · 다음 외장 컬러 변경',
  lights: '램프 클릭 · 라이트 & 도어 전환',
};

function normalizeDeg(deg: number): number {
  return ((Math.round(deg) % 360) + 360) % 360;
}

function shortestAngleDiffRad(fromRad: number, toRad: number): number {
  let diff = (toRad - fromRad) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function probeIsSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      probeCanvas.getContext('webgl2') ||
      probeCanvas.getContext('webgl') ||
      probeCanvas.getContext('experimental-webgl');
    if (!gl) return false;
    const webgl = gl as WebGLRenderingContext;
    const ext = webgl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = ext
      ? String(webgl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(webgl.getParameter(webgl.RENDERER) ?? '');
    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName);
    webgl.getExtension('WEBGL_lose_context')?.loseContext();
    return isSoftware;
  } catch {
    return false;
  }
}

const ThreeCarViewerInner: React.FC<ThreeCarViewerProps> = ({
  bodyType,
  paint,
  wheel,
  cameraCommand,
  autoRotate,
  doorsAndLightsOpen,
  onChangeRotation,
  onUserInteraction,
  onClickDoorsOrLights,
  onClickWheels,
  onClickBodyPaint,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [hoveredPart, setHoveredPart] = useState<InteractablePartType | null>(null);

  // Memoize GPU capability check, car rig cache, studio stage geometry/materials, and reusable math objects
  const isSoftwareGl = useMemo(() => probeIsSoftwareWebGL(), []);
  const rigCache = useMemo(() => new Map<VehicleBodyType, BuiltCarRig>(), []);
  const reusableMath = useMemo(
    () => ({
      tmpOffset: new THREE.Vector3(),
      tmpSpherical: new THREE.Spherical(),
      raycaster: new THREE.Raycaster(),
      pointerNdc: new THREE.Vector2(),
    }),
    []
  );

  const studioStage = useMemo(() => {
    const studioFloorGeo = new THREE.CircleGeometry(14, 36);
    studioFloorGeo.rotateX(-Math.PI / 2);
    const studioFloorMat = new THREE.MeshStandardMaterial({
      color: '#12161d',
      roughness: 0.78,
      metalness: 0.2,
    });
    const studioFloor = new THREE.Mesh(studioFloorGeo, studioFloorMat);
    studioFloor.receiveShadow = !isSoftwareGl;
    studioFloor.position.y = -0.015;

    const turntableDiscGeo = new THREE.CylinderGeometry(2.78, 2.86, 0.03, 48);
    const turntableDiscMat = new THREE.MeshStandardMaterial({
      color: '#1b2029',
      roughness: 0.36,
      metalness: 0.52,
    });
    const turntableDisc = new THREE.Mesh(turntableDiscGeo, turntableDiscMat);
    turntableDisc.receiveShadow = !isSoftwareGl;
    turntableDisc.position.y = -0.015;

    const turntableRingGeo = new THREE.RingGeometry(2.74, 2.78, 56);
    turntableRingGeo.rotateX(-Math.PI / 2);
    const turntableRingMat = new THREE.MeshBasicMaterial({
      color: '#3ee84b',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const turntableRing = new THREE.Mesh(turntableRingGeo, turntableRingMat);
    turntableRing.position.y = 0.002;

    const shadowTex = createStudioFloorShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(5.6, 5.6);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.position.y = 0.004;

    const group = new THREE.Group();
    group.add(studioFloor, turntableDisc, turntableRing, contactShadow);

    return {
      group,
      turntableRingMat,
      dispose: () => {
        studioFloorGeo.dispose();
        studioFloorMat.dispose();
        turntableDiscGeo.dispose();
        turntableDiscMat.dispose();
        turntableRingGeo.dispose();
        turntableRingMat.dispose();
        contactShadowGeo.dispose();
        contactShadowMat.dispose();
        shadowTex.dispose();
      },
    };
  }, [isSoftwareGl]);

  // Memoize the active 3D car rig for the current bodyType
  const activeCarRig = useMemo(() => {
    let rig = rigCache.get(bodyType);
    if (!rig) {
      rig = buildProceduralCar(bodyType, paint, wheel, isSoftwareGl);
      rigCache.set(bodyType, rig);
    }
    return rig;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyType, isSoftwareGl, rigCache]);

  const initialDegRef = useRef(cameraCommand?.deg ?? 328);
  const autoRotateRef = useRef(autoRotate);
  const doorsOpenRef = useRef(doorsAndLightsOpen);
  const onChangeRotationRef = useRef(onChangeRotation);
  const onUserInteractionRef = useRef(onUserInteraction);
  const onClickDoorsRef = useRef(onClickDoorsOrLights);
  const onClickWheelsRef = useRef(onClickWheels);
  const onClickBodyRef = useRef(onClickBodyPaint);

  autoRotateRef.current = autoRotate;
  doorsOpenRef.current = doorsAndLightsOpen;
  onChangeRotationRef.current = onChangeRotation;
  onUserInteractionRef.current = onUserInteraction;
  onClickDoorsRef.current = onClickDoorsOrLights;
  onClickWheelsRef.current = onClickWheels;
  onClickBodyRef.current = onClickBodyPaint;

  const rigRef = useRef<BuiltCarRig>(activeCarRig);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const kickAnimLoopRef = useRef<(() => void) | null>(null);
  const ringFlashRef = useRef<number>(0);

  const isDraggingRef = useRef(false);
  const lastReportedDegRef = useRef<number>(normalizeDeg(initialDegRef.current));
  const lastReportTimeRef = useRef<number>(0);
  const targetAzimuthRadRef = useRef<number | null>(null);
  const currentHoverRef = useRef<HoverTarget | null>(null);
  const hasMountedOnceRef = useRef(false);

  // Single mount WebGL initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: isSoftwareGl ? 'default' : 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#14181f');
    scene.fog = new THREE.Fog('#14181f', 9, 22);
    sceneRef.current = scene;

    // PBR Environment reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const pmremTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = pmremTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    const initialAz = (initialDegRef.current * Math.PI) / 180;
    const initialDist = 5.35;
    const initialHeight = 1.55;
    camera.position.set(
      Math.sin(initialAz) * initialDist,
      initialHeight,
      Math.cos(initialAz) * initialDist
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.56, 0);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3.2;
    controls.maxDistance = 7.8;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.85;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.1;
    controls.autoRotate = false;
    controls.update();

    // 3-point studio lighting
    const hemiLight = new THREE.HemisphereLight('#e2e8f0', '#0f172a', 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 2.45);
    keyLight.position.set(4.5, 6.2, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(512, 512);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -3.8;
      keyLight.shadow.camera.right = 3.8;
      keyLight.shadow.camera.top = 3.8;
      keyLight.shadow.camera.bottom = -3.8;
      keyLight.shadow.bias = -0.0006;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#93c5fd', 1.45);
    rimLight.position.set(-4.5, 3.2, -4.8);
    scene.add(rimLight);

    const topFillLight = new THREE.DirectionalLight('#f8fafc', 0.85);
    topFillLight.position.set(0, 6.5, 0.5);
    scene.add(topFillLight);

    // Attach memoized studio floor stage & initial car rig
    scene.add(studioStage.group);
    rigRef.current.setDoorsOpen(doorsOpenRef.current, true);
    scene.add(rigRef.current.root);

    let disposed = false;
    let renderPending = false;
    let animFrameId: number | null = null;
    let lastTime = performance.now();

    const { tmpOffset, tmpSpherical, raycaster, pointerNdc } = reusableMath;

    const drawFrame = () => {
      renderPending = false;
      if (disposed) return;
      renderer.render(scene, camera);
    };

    const requestRender = () => {
      if (disposed || renderPending || animFrameId !== null) return;
      renderPending = true;
      requestAnimationFrame(drawFrame);
    };
    requestRenderRef.current = requestRender;

    const syncDegFromCamera = (forceEmit = false) => {
      const az = controls.getAzimuthalAngle();
      const deg = normalizeDeg((az * 180) / Math.PI);
      const now = performance.now();
      if (deg !== lastReportedDegRef.current) {
        if (forceEmit || now - lastReportTimeRef.current >= 130) {
          lastReportedDegRef.current = deg;
          lastReportTimeRef.current = now;
          onChangeRotationRef.current(deg);
        }
      }
    };

    const stepLoop = (now: number) => {
      animFrameId = null;
      if (disposed) return;
      const dt = Math.max(0.004, Math.min((now - lastTime) / 1000, 0.05));
      lastTime = now;

      let needsMoreFrames = false;

      // 1. Step all car rig animations (doors, color lerp, wheel swap, evolution entrance, hover glow)
      if (rigRef.current.stepAnimations(dt)) {
        needsMoreFrames = true;
      }

      // 2. Turntable ring pulse flash on state transitions
      if (ringFlashRef.current > 0.01) {
        ringFlashRef.current *= Math.exp(-6 * dt);
        studioStage.turntableRingMat.opacity = 0.45 + ringFlashRef.current * 0.5;
        needsMoreFrames = true;
      } else if (studioStage.turntableRingMat.opacity !== 0.45) {
        ringFlashRef.current = 0;
        studioStage.turntableRingMat.opacity = 0.45;
      }

      // 3. Smooth camera azimuth transition for preset buttons / slider
      if (targetAzimuthRadRef.current !== null && !isDraggingRef.current) {
        tmpOffset.copy(camera.position).sub(controls.target);
        tmpSpherical.setFromVector3(tmpOffset);
        const diff = shortestAngleDiffRad(tmpSpherical.theta, targetAzimuthRadRef.current);
        if (Math.abs(diff) > 0.008) {
          tmpSpherical.theta += diff * (1 - Math.exp(-11 * dt));
          tmpOffset.setFromSpherical(tmpSpherical);
          camera.position.copy(controls.target).add(tmpOffset);
          camera.lookAt(controls.target);
          needsMoreFrames = true;
        } else {
          tmpSpherical.theta = targetAzimuthRadRef.current;
          tmpOffset.setFromSpherical(tmpSpherical);
          camera.position.copy(controls.target).add(tmpOffset);
          camera.lookAt(controls.target);
          targetAzimuthRadRef.current = null;
          syncDegFromCamera(true);
        }
        controls.update();
      } else if (autoRotateRef.current && !isDraggingRef.current) {
        tmpOffset.copy(camera.position).sub(controls.target);
        tmpSpherical.setFromVector3(tmpOffset);
        tmpSpherical.theta = (tmpSpherical.theta + dt * 0.72) % (Math.PI * 2);
        tmpOffset.setFromSpherical(tmpSpherical);
        camera.position.copy(controls.target).add(tmpOffset);
        camera.lookAt(controls.target);
        controls.update();
        syncDegFromCamera(false);
        needsMoreFrames = true;
      } else if (controls.enableDamping && !isDraggingRef.current) {
        const prevAz = controls.getAzimuthalAngle();
        const prevPol = controls.getPolarAngle();
        const moved = controls.update();
        const deltaAz = Math.abs(controls.getAzimuthalAngle() - prevAz);
        const deltaPol = Math.abs(controls.getPolarAngle() - prevPol);
        if (moved && (deltaAz > 0.0008 || deltaPol > 0.0008)) {
          syncDegFromCamera(false);
          needsMoreFrames = true;
        }
      }

      renderPending = false;
      renderer.render(scene, camera);

      if (needsMoreFrames) {
        animFrameId = requestAnimationFrame(stepLoop);
      }
    };

    const kickAnimLoop = () => {
      if (disposed || animFrameId !== null) return;
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(stepLoop);
    };
    kickAnimLoopRef.current = kickAnimLoop;

    let cachedRect = renderer.domElement.getBoundingClientRect();
    const refreshCanvasRect = () => {
      cachedRect = renderer.domElement.getBoundingClientRect();
    };

    let pointerDownPos: { x: number; y: number } | null = null;
    let lastRaycastTime = 0;

    const raycastTargetAt = (clientX: number, clientY: number): HoverTarget | null => {
      const rig = rigRef.current;
      if (rig.interactiveMeshes.length === 0) return null;
      if (cachedRect.width <= 0 || cachedRect.height <= 0) {
        refreshCanvasRect();
      }
      if (cachedRect.width <= 0 || cachedRect.height <= 0) return null;

      pointerNdc.x = ((clientX - cachedRect.left) / cachedRect.width) * 2 - 1;
      pointerNdc.y = -((clientY - cachedRect.top) / cachedRect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(rig.interactiveMeshes, false);
      if (hits.length === 0) return null;
      const hitObj = hits[0].object;
      const part = hitObj.userData.interactPart as InteractablePartType | undefined;
      if (!part) return null;
      const index =
        typeof hitObj.userData.interactIndex === 'number'
          ? (hitObj.userData.interactIndex as number)
          : undefined;
      return { part, index };
    };

    const clearHover = () => {
      if (currentHoverRef.current !== null) {
        currentHoverRef.current = null;
        setHoveredPart(null);
        rigRef.current.setHoveredTarget(null);
        renderer.domElement.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
        kickAnimLoop();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      refreshCanvasRect();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current) {
        if (currentHoverRef.current !== null) clearHover();
        return;
      }
      const now = performance.now();
      if (now - lastRaycastTime < 48) return;
      lastRaycastTime = now;

      const hit = raycastTargetAt(e.clientX, e.clientY);
      const prev = currentHoverRef.current;
      const changed =
        (hit?.part ?? null) !== (prev?.part ?? null) ||
        (hit?.index ?? -1) !== (prev?.index ?? -1);

      if (changed) {
        currentHoverRef.current = hit;
        setHoveredPart(hit?.part ?? null);
        rigRef.current.setHoveredTarget(hit);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
        kickAnimLoop();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerDownPos) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      pointerDownPos = null;
      if (dist >= 6) return;

      const clicked = raycastTargetAt(e.clientX, e.clientY);
      if (!clicked) return;

      if (clicked.part === 'door' || clicked.part === 'lights') {
        onClickDoorsRef.current?.();
      } else if (clicked.part === 'wheel') {
        onClickWheelsRef.current?.();
      } else if (clicked.part === 'body') {
        onClickBodyRef.current?.();
      }
    };

    const handlePointerLeave = () => {
      pointerDownPos = null;
      clearHover();
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('scroll', refreshCanvasRect, { passive: true });

    const handleControlStart = () => {
      isDraggingRef.current = true;
      targetAzimuthRadRef.current = null;
      renderer.domElement.style.cursor = 'grabbing';
      clearHover();
      onUserInteractionRef.current?.();
    };

    const handleControlChange = () => {
      syncDegFromCamera(false);
      requestRender();
    };

    const handleControlEnd = () => {
      isDraggingRef.current = false;
      renderer.domElement.style.cursor = currentHoverRef.current ? 'pointer' : 'grab';
      syncDegFromCamera(true);
      if (autoRotateRef.current || controls.enableDamping) {
        kickAnimLoop();
      }
    };

    controls.addEventListener('start', handleControlStart);
    controls.addEventListener('change', handleControlChange);
    controls.addEventListener('end', handleControlEnd);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || disposed) return;
      const w = Math.max(Math.floor(entry.contentRect.width), 100);
      const h = Math.max(Math.floor(entry.contentRect.height), 100);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      refreshCanvasRect();
      requestRender();
    });
    resizeObserver.observe(container);

    requestRender();
    if (autoRotateRef.current) {
      kickAnimLoop();
    }

    return () => {
      disposed = true;
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', refreshCanvasRect);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      controls.removeEventListener('start', handleControlStart);
      controls.removeEventListener('change', handleControlChange);
      controls.removeEventListener('end', handleControlEnd);
      controls.dispose();

      rigCache.forEach((cachedRig) => {
        scene.remove(cachedRig.root);
        cachedRig.dispose();
      });
      rigCache.clear();
      studioStage.dispose();
      pmremTarget.dispose();

      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isSoftwareGl, reusableMath, rigCache, studioStage]);

  // Swap memoized 3D car rig with smooth evolution entrance animation
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rigRef.current && rigRef.current !== activeCarRig) {
      scene.remove(rigRef.current.root);
    }
    activeCarRig.setPaint(paint, true);
    activeCarRig.setWheels(wheel, false);
    activeCarRig.setDoorsOpen(doorsOpenRef.current, true);
    activeCarRig.setHoveredTarget(currentHoverRef.current);
    if (activeCarRig.root.parent !== scene) {
      scene.add(activeCarRig.root);
    }
    rigRef.current = activeCarRig;

    if (hasMountedOnceRef.current) {
      activeCarRig.triggerEvolutionAnim();
      ringFlashRef.current = 1;
      kickAnimLoopRef.current?.();
    } else {
      hasMountedOnceRef.current = true;
      requestRenderRef.current?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCarRig]);

  // Smoothly interpolate exterior paint color on state change
  useEffect(() => {
    rigRef.current.setPaint(paint, false);
    ringFlashRef.current = Math.max(ringFlashRef.current, 0.55);
    kickAnimLoopRef.current?.();
  }, [paint]);

  // Swap wheel rims with smooth roll & spring settle animation on state change
  useEffect(() => {
    rigRef.current.setWheels(wheel, true);
    rigRef.current.setHoveredTarget(currentHoverRef.current);
    ringFlashRef.current = Math.max(ringFlashRef.current, 0.55);
    kickAnimLoopRef.current?.();
  }, [wheel]);

  // Animate doors & lights smoothly on state change
  useEffect(() => {
    rigRef.current.setDoorsOpen(doorsAndLightsOpen, false);
    ringFlashRef.current = Math.max(ringFlashRef.current, 0.45);
    kickAnimLoopRef.current?.();
  }, [doorsAndLightsOpen]);

  // Start/stop auto-rotate spin
  useEffect(() => {
    if (autoRotate) {
      targetAzimuthRadRef.current = null;
      kickAnimLoopRef.current?.();
    }
  }, [autoRotate]);

  // Respond only to explicit UI preset/slider commands
  useEffect(() => {
    if (!cameraCommand) return;
    const norm = normalizeDeg(cameraCommand.deg);
    lastReportedDegRef.current = norm;
    targetAzimuthRadRef.current = (norm * Math.PI) / 180;
    kickAnimLoopRef.current?.();
  }, [cameraCommand]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#14181f] text-slate-300 text-xs p-4 text-center">
        현재 환경에서 WebGL 3D 가속을 사용할 수 없어 차량 미리보기 모드로 전환되었습니다.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        aria-label="Three.js 3D 차량 360도 쇼룸 뷰어 (드래그 회전, 스크롤 줌, 도어·휠·차체 클릭 인터랙션)"
        className="w-full h-full select-none"
      />
      <div
        aria-live="polite"
        className={`pointer-events-none absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0B0D11]/90 border border-[#3EE84B]/60 text-[11px] font-bold text-[#3EE84B] shadow-md transition-all duration-200 ease-out ${
          hoveredPart ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'
        }`}
      >
        {hoveredPart ? HOVER_LABELS[hoveredPart] : ''}
      </div>
    </div>
  );
};

export const ThreeCarViewer = React.memo(ThreeCarViewerInner);
