import * as THREE from 'three';
import type { PaintOption, VehicleBodyType, WheelOption } from '../types/driving';

export type InteractablePartType = 'door' | 'wheel' | 'body' | 'lights';

export interface HoverTarget {
  part: InteractablePartType;
  index?: number; // 0 = left door, 1 = right door; or wheel index 0..3
}

export interface CarDimensionSpec {
  length: number;
  width: number;
  bodyHeight: number;
  cabinHeight: number;
  groundClearance: number;
  wheelRadius: number;
  wheelWidth: number;
  wheelbaseRatio: number;
  hoodRatio: number;
  cabinFrontRatio: number;
  cabinRearRatio: number;
  trunkDeckDrop: number;
  isHatchOrSuv: boolean;
  hasWing: boolean;
  hasRoofRails: boolean;
}

const BODY_SPECS: Record<VehicleBodyType, CarDimensionSpec> = {
  'compact-hatch': {
    length: 3.45,
    width: 1.68,
    bodyHeight: 0.62,
    cabinHeight: 0.54,
    groundClearance: 0.2,
    wheelRadius: 0.3,
    wheelWidth: 0.21,
    wheelbaseRatio: 0.68,
    hoodRatio: 0.22,
    cabinFrontRatio: 0.34,
    cabinRearRatio: 0.88,
    trunkDeckDrop: 0.08,
    isHatchOrSuv: true,
    hasWing: false,
    hasRoofRails: true,
  },
  'smart-sedan': {
    length: 4.18,
    width: 1.8,
    bodyHeight: 0.56,
    cabinHeight: 0.48,
    groundClearance: 0.16,
    wheelRadius: 0.32,
    wheelWidth: 0.22,
    wheelbaseRatio: 0.62,
    hoodRatio: 0.27,
    cabinFrontRatio: 0.38,
    cabinRearRatio: 0.78,
    trunkDeckDrop: 0.08,
    isHatchOrSuv: false,
    hasWing: false,
    hasRoofRails: false,
  },
  'compact-suv': {
    length: 4.02,
    width: 1.86,
    bodyHeight: 0.68,
    cabinHeight: 0.55,
    groundClearance: 0.23,
    wheelRadius: 0.35,
    wheelWidth: 0.24,
    wheelbaseRatio: 0.64,
    hoodRatio: 0.25,
    cabinFrontRatio: 0.36,
    cabinRearRatio: 0.88,
    trunkDeckDrop: 0.06,
    isHatchOrSuv: true,
    hasWing: false,
    hasRoofRails: true,
  },
  'flagship-suv': {
    length: 4.52,
    width: 1.96,
    bodyHeight: 0.72,
    cabinHeight: 0.58,
    groundClearance: 0.24,
    wheelRadius: 0.38,
    wheelWidth: 0.26,
    wheelbaseRatio: 0.63,
    hoodRatio: 0.26,
    cabinFrontRatio: 0.36,
    cabinRearRatio: 0.91,
    trunkDeckDrop: 0.05,
    isHatchOrSuv: true,
    hasWing: false,
    hasRoofRails: true,
  },
  'luxury-sedan': {
    length: 4.55,
    width: 1.9,
    bodyHeight: 0.58,
    cabinHeight: 0.48,
    groundClearance: 0.15,
    wheelRadius: 0.34,
    wheelWidth: 0.24,
    wheelbaseRatio: 0.62,
    hoodRatio: 0.29,
    cabinFrontRatio: 0.4,
    cabinRearRatio: 0.8,
    trunkDeckDrop: 0.07,
    isHatchOrSuv: false,
    hasWing: false,
    hasRoofRails: false,
  },
  'gt-sports': {
    length: 4.35,
    width: 2.0,
    bodyHeight: 0.48,
    cabinHeight: 0.41,
    groundClearance: 0.12,
    wheelRadius: 0.35,
    wheelWidth: 0.28,
    wheelbaseRatio: 0.63,
    hoodRatio: 0.31,
    cabinFrontRatio: 0.43,
    cabinRearRatio: 0.77,
    trunkDeckDrop: 0.06,
    isHatchOrSuv: false,
    hasWing: true,
    hasRoofRails: false,
  },
};

export interface BuiltCarRig {
  root: THREE.Group;
  bodyPaintMaterial: THREE.MeshPhysicalMaterial;
  leftDoorPaintMaterial: THREE.MeshPhysicalMaterial;
  rightDoorPaintMaterial: THREE.MeshPhysicalMaterial;
  drlMaterial: THREE.MeshStandardMaterial;
  tailLightMaterial: THREE.MeshStandardMaterial;
  cabinAmbientMaterial: THREE.MeshStandardMaterial;
  headlightGlowPool: THREE.MeshBasicMaterial;
  doorPuddleMaterial: THREE.MeshBasicMaterial;
  leftDoorPivot: THREE.Group;
  rightDoorPivot: THREE.Group;
  wheelHubs: THREE.Group[];
  wheelMounts: THREE.Group[];
  interactiveMeshes: THREE.Object3D[];
  spec: CarDimensionSpec;
  setDoorsOpen: (open: boolean, immediate?: boolean) => void;
  setWheels: (wheel: WheelOption, animate?: boolean) => void;
  setPaint: (paint: PaintOption, immediate?: boolean) => void;
  setHoveredTarget: (target: HoverTarget | null) => void;
  triggerEvolutionAnim: () => void;
  stepAnimations: (dt: number) => boolean;
  dispose: () => void;
}

function tagInteractPart(
  obj: THREE.Object3D,
  part: InteractablePartType,
  index?: number
): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData.interactPart = part;
      if (typeof index === 'number') {
        child.userData.interactIndex = index;
      }
    }
  });
}

function createExtrudedSideProfile(
  points: Array<[number, number]>,
  width: number,
  bevelSize = 0.04
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const innerDepth = Math.max(0.08, width - bevelSize * 2);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 5,
  });

  // Rotate so profile X maps to +Z (front of vehicle) and extrusion Z maps to X (width)
  geom.translate(0, 0, -innerDepth / 2);
  geom.rotateY(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

interface WheelBuildResult {
  group: THREE.Group;
  rimMat: THREE.MeshStandardMaterial;
  tireMat: THREE.MeshStandardMaterial;
}

function buildCompositeWheel(
  wheelOpt: WheelOption,
  baseRadius: number,
  tireWidth: number,
  isLeftSide: boolean
): WheelBuildResult {
  const wheelGroup = new THREE.Group();
  const sizeScale = 0.9 + ((wheelOpt.sizeInch - 16) / 5) * 0.16;
  const radius = baseRadius * sizeScale;
  const rimRadius = radius * (0.58 + ((wheelOpt.sizeInch - 16) / 5) * 0.16);
  const sideSign = isLeftSide ? 1 : -1;

  // 1. Tire barrel
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#13161c',
    roughness: 0.88,
    metalness: 0.04,
  });
  const tireGeo = new THREE.CylinderGeometry(radius, radius, tireWidth * 0.94, 24, 1);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  wheelGroup.add(tireMesh);

  // Tire outer sidewall ring (kept recessed behind rim face so spokes stay prominent)
  const shoulderGeo = new THREE.TorusGeometry(radius * 0.84, radius * 0.13, 8, 22);
  shoulderGeo.rotateY(Math.PI / 2);
  const shoulderOuter = new THREE.Mesh(shoulderGeo, tireMat);
  shoulderOuter.position.x = sideSign * (tireWidth * 0.34);
  wheelGroup.add(shoulderOuter);

  // 2. Brake rotor + caliper visible behind spokes
  const rotorMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.88,
    roughness: 0.28,
  });
  const rotorGeo = new THREE.CylinderGeometry(rimRadius * 0.78, rimRadius * 0.78, 0.025, 18);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotor = new THREE.Mesh(rotorGeo, rotorMat);
  rotor.position.x = sideSign * (tireWidth * 0.26);
  wheelGroup.add(rotor);

  const caliperColor =
    wheelOpt.spokeStyle === 'carbon'
      ? '#ef4444'
      : wheelOpt.spokeStyle === 'mesh'
        ? '#f59e0b'
        : wheelOpt.spokeStyle === 'machined'
          ? '#38bdf8'
          : '#64748b';
  const caliperMat = new THREE.MeshStandardMaterial({
    color: caliperColor,
    metalness: 0.45,
    roughness: 0.28,
  });
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, rimRadius * 0.4, rimRadius * 0.28),
    caliperMat
  );
  caliper.position.set(sideSign * (tireWidth * 0.31), rimRadius * 0.24, -rimRadius * 0.34);
  wheelGroup.add(caliper);

  // 3. Rim Barrel Back + Outer Rim Lip + Distinct Spokes (proud of tire shoulder)
  const rimColor =
    wheelOpt.spokeStyle === 'carbon'
      ? '#262d38'
      : wheelOpt.spokeStyle === 'mesh'
        ? '#64748b'
        : wheelOpt.spokeStyle === 'machined'
          ? '#f1f5f9'
          : '#cbd5e1';

  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: wheelOpt.spokeStyle === 'carbon' ? 0.5 : 0.92,
    roughness: wheelOpt.spokeStyle === 'carbon' ? 0.3 : 0.16,
  });

  const rimInnerDiscGeo = new THREE.CylinderGeometry(rimRadius * 0.96, rimRadius * 0.96, 0.03, 22);
  rimInnerDiscGeo.rotateZ(Math.PI / 2);
  const rimBackMat = new THREE.MeshStandardMaterial({
    color: '#090c10',
    metalness: 0.35,
    roughness: 0.7,
  });
  const rimBack = new THREE.Mesh(rimInnerDiscGeo, rimBackMat);
  rimBack.position.x = sideSign * (tireWidth * 0.22);
  wheelGroup.add(rimBack);

  const faceX = sideSign * (tireWidth * 0.47);
  const rimLipGeo = new THREE.TorusGeometry(rimRadius, 0.024, 10, 24);
  rimLipGeo.rotateY(Math.PI / 2);
  const rimLip = new THREE.Mesh(rimLipGeo, rimMat);
  rimLip.position.x = faceX;
  wheelGroup.add(rimLip);

  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(rimRadius * 0.23, rimRadius * 0.25, 0.045, 16),
    wheelOpt.spokeStyle === 'carbon'
      ? new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.65, roughness: 0.22 })
      : rimMat
  );
  hubCap.rotation.z = Math.PI / 2;
  hubCap.position.x = faceX;
  wheelGroup.add(hubCap);

  const spokeGroup = new THREE.Group();
  spokeGroup.position.x = faceX;

  if (wheelOpt.spokeStyle === 'aero') {
    const innerRingGeo = new THREE.TorusGeometry(rimRadius * 0.52, 0.02, 8, 20);
    innerRingGeo.rotateY(Math.PI / 2);
    spokeGroup.add(new THREE.Mesh(innerRingGeo, rimMat));

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, rimRadius * 0.82, 0.064),
        rimMat
      );
      spoke.position.set(
        0,
        Math.cos(angle) * rimRadius * 0.48,
        Math.sin(angle) * rimRadius * 0.48
      );
      spoke.rotation.x = angle;
      spokeGroup.add(spoke);
    }
  } else if (wheelOpt.spokeStyle === 'machined') {
    for (let i = 0; i < 5; i++) {
      const baseAngle = (i * Math.PI * 2) / 5;
      for (const offset of [-0.15, 0.15]) {
        const a = baseAngle + offset;
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.032, rimRadius * 0.86, 0.026),
          rimMat
        );
        spoke.position.set(
          0,
          Math.cos(a) * rimRadius * 0.5,
          Math.sin(a) * rimRadius * 0.5
        );
        spoke.rotation.x = a;
        spokeGroup.add(spoke);
      }
    }
  } else if (wheelOpt.spokeStyle === 'mesh') {
    const accentMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.7,
      roughness: 0.24,
    });
    const ringGeo = new THREE.TorusGeometry(rimRadius * 0.94, 0.012, 8, 24);
    ringGeo.rotateY(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, accentMat);
    ring.position.x = sideSign * 0.015;
    spokeGroup.add(ring);

    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, rimRadius * 0.88, 0.024),
        rimMat
      );
      spoke.position.set(
        0,
        Math.cos(a) * rimRadius * 0.5,
        Math.sin(a) * rimRadius * 0.5
      );
      spoke.rotation.x = a + (i % 2 === 0 ? 0.14 : -0.14);
      spokeGroup.add(spoke);
    }
  } else {
    const redRingMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      metalness: 0.55,
      roughness: 0.22,
    });
    const accentRingGeo = new THREE.TorusGeometry(rimRadius * 0.94, 0.016, 8, 24);
    accentRingGeo.rotateY(Math.PI / 2);
    const accentRing = new THREE.Mesh(accentRingGeo, redRingMat);
    accentRing.position.x = sideSign * 0.018;
    spokeGroup.add(accentRing);

    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, rimRadius * 0.88, 0.03),
        rimMat
      );
      spoke.position.set(
        0,
        Math.cos(a) * rimRadius * 0.52,
        Math.sin(a) * rimRadius * 0.52
      );
      spoke.rotation.x = a;
      spokeGroup.add(spoke);
    }
  }

  wheelGroup.add(spokeGroup);
  tagInteractPart(wheelGroup, 'wheel');
  return { group: wheelGroup, rimMat, tireMat };
}

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
}

export function createStudioFloorShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildProceduralCar(
  bodyType: VehicleBodyType,
  paint: PaintOption,
  wheelOpt: WheelOption,
  isSoftwareGl = false
): BuiltCarRig {
  const spec = BODY_SPECS[bodyType];
  const root = new THREE.Group();

  const halfL = spec.length / 2;
  const halfW = spec.width / 2;
  const baseBottom = spec.groundClearance;
  const beltY = baseBottom + spec.bodyHeight;
  const roofY = beltY + spec.cabinHeight;

  const frontX = halfL;
  const rearX = -halfL;
  const hoodEndX = frontX - spec.length * spec.hoodRatio;
  const cabinFrontX = frontX - spec.length * spec.cabinFrontRatio;
  const cabinRearX = frontX - spec.length * spec.cabinRearRatio;

  const frontAxleZ = spec.length * spec.wheelbaseRatio * 0.5;
  const rearAxleZ = -spec.length * spec.wheelbaseRatio * 0.5;

  // Separate bodyPaintMaterial and per-side doorPaintMaterials so hover highlighting isolates each door cleanly
  const bodyPaintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(paint.bodyHex),
    metalness: 0.28,
    roughness: 0.28,
    clearcoat: isSoftwareGl ? 0.35 : 0.95,
    clearcoatRoughness: 0.08,
    reflectivity: 0.85,
    envMapIntensity: 0.9,
  });

  const leftDoorPaintMaterial = bodyPaintMaterial.clone();
  const rightDoorPaintMaterial = bodyPaintMaterial.clone();

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: '#151920',
    metalness: 0.14,
    roughness: 0.82,
  });

  const interiorSeatMat = new THREE.MeshStandardMaterial({
    color: '#1f2530',
    metalness: 0.1,
    roughness: 0.72,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.92,
    roughness: 0.16,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#0e1726',
    metalness: 0.12,
    roughness: 0.06,
    clearcoat: isSoftwareGl ? 0.2 : 0.9,
    transparent: true,
    opacity: 0.82,
  });

  const drlMaterial = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    emissive: new THREE.Color('#e2e8f0'),
    emissiveIntensity: 0.95,
    roughness: 0.15,
    metalness: 0.2,
  });

  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    emissive: new THREE.Color('#dc2626'),
    emissiveIntensity: 1.0,
    roughness: 0.2,
    metalness: 0.15,
  });

  const cabinAmbientMaterial = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    emissive: new THREE.Color('#3ee84b'),
    emissiveIntensity: 0.2,
    roughness: 0.45,
    metalness: 0.2,
  });

  const headlightGlowPool = new THREE.MeshBasicMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const doorPuddleMaterial = new THREE.MeshBasicMaterial({
    color: '#3ee84b',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const doorFrontZ = frontAxleZ - spec.wheelRadius * 1.15;
  const doorRearZ = rearAxleZ + spec.wheelRadius * 1.12;
  const doorSpanZ = Math.max(0.85, doorFrontZ - doorRearZ);

  // 1. Front Nose + Front Fenders
  const frontPoints: Array<[number, number]> = [
    [doorFrontZ, baseBottom + 0.03],
    [doorFrontZ, beltY - 0.02],
    [hoodEndX, beltY - 0.02],
    [frontX - 0.16, beltY - 0.1],
    [frontX, baseBottom + 0.2],
    [frontX - 0.05, baseBottom + 0.02],
  ];
  const frontSectionGeo = createExtrudedSideProfile(frontPoints, spec.width * 0.95, 0.045);
  const frontSectionMesh = new THREE.Mesh(frontSectionGeo, bodyPaintMaterial);
  frontSectionMesh.castShadow = true;
  frontSectionMesh.receiveShadow = true;
  tagInteractPart(frontSectionMesh, 'body');
  root.add(frontSectionMesh);

  // 2. Rear Quarter + Trunk/Tailgate
  const rearPoints: Array<[number, number]> = [
    [rearX + 0.04, baseBottom + 0.05],
    [rearX, beltY - spec.trunkDeckDrop],
    [cabinRearX - 0.1, beltY - 0.01],
    [doorRearZ, beltY - 0.01],
    [doorRearZ, baseBottom + 0.03],
    [rearX + 0.12, baseBottom + 0.02],
  ];
  const rearSectionGeo = createExtrudedSideProfile(rearPoints, spec.width * 0.95, 0.045);
  const rearSectionMesh = new THREE.Mesh(rearSectionGeo, bodyPaintMaterial);
  rearSectionMesh.castShadow = true;
  rearSectionMesh.receiveShadow = true;
  tagInteractPart(rearSectionMesh, 'body');
  root.add(rearSectionMesh);

  // 3. Lower Floor Sill & Center Cabin Interior (revealed when left/right doors open!)
  const floorPan = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.92, 0.09, spec.length * 0.92),
    trimMaterial
  );
  floorPan.position.set(0, baseBottom + 0.04, 0);
  root.add(floorPan);

  const centerTunnel = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.22, doorSpanZ * 0.92),
    trimMaterial
  );
  centerTunnel.position.set(0, baseBottom + 0.16, (doorFrontZ + doorRearZ) * 0.5);
  root.add(centerTunnel);

  const dashBoard = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.72, 0.26, 0.34),
    trimMaterial
  );
  dashBoard.position.set(0, baseBottom + 0.34, doorFrontZ - 0.14);
  root.add(dashBoard);

  const cabinAmbient = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.56, 0.07, 0.04),
    cabinAmbientMaterial
  );
  cabinAmbient.position.set(0, baseBottom + 0.44, doorFrontZ - 0.3);
  root.add(cabinAmbient);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.02, 8, 16),
    trimMaterial
  );
  steeringWheel.position.set(spec.width * 0.2, baseBottom + 0.44, doorFrontZ - 0.36);
  steeringWheel.rotation.x = -0.35;
  root.add(steeringWheel);

  for (const side of [-1, 1]) {
    const seatGroup = new THREE.Group();
    seatGroup.position.set(
      side * (spec.width * 0.22),
      baseBottom + 0.14,
      (doorFrontZ + doorRearZ) * 0.5 - 0.1
    );

    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.42), interiorSeatMat);
    cushion.position.set(0, 0.04, 0.05);
    seatGroup.add(cushion);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.1), interiorSeatMat);
    backrest.position.set(0, 0.28, -0.14);
    backrest.rotation.x = -0.18;
    seatGroup.add(backrest);

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), interiorSeatMat);
    headrest.position.set(0, 0.55, -0.2);
    seatGroup.add(headrest);

    root.add(seatGroup);
  }

  // 4. Sculpted Greenhouse Roof Canopy & Front/Rear Glass
  const cabinRoofFrontX = cabinFrontX - 0.12;
  const cabinRoofRearX = spec.isHatchOrSuv ? cabinRearX + 0.18 : cabinRearX + 0.34;
  const cabinWidth = spec.width * 0.78;

  const roofCapPoints: Array<[number, number]> = [
    [cabinRearX - 0.06, beltY - 0.02],
    [cabinRoofRearX, roofY],
    [cabinRoofFrontX, roofY],
    [cabinRoofFrontX + 0.12, roofY - 0.06],
    [cabinRoofRearX - 0.14, roofY - 0.06],
    [doorRearZ + 0.04, beltY - 0.02],
  ];
  const roofShellGeo = createExtrudedSideProfile(roofCapPoints, cabinWidth, 0.04);
  const roofShell = new THREE.Mesh(roofShellGeo, bodyPaintMaterial);
  roofShell.castShadow = true;
  tagInteractPart(roofShell, 'body');
  root.add(roofShell);

  const aPillarLen = Math.hypot(hoodEndX - cabinRoofFrontX, roofY - beltY);
  const aPillarAngle = Math.atan2(roofY - beltY, hoodEndX - cabinRoofFrontX);
  for (const side of [-1, 1]) {
    const aPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.055, aPillarLen),
      bodyPaintMaterial
    );
    aPillar.position.set(
      side * (cabinWidth * 0.45),
      (beltY + roofY) * 0.5 - 0.01,
      (hoodEndX + cabinRoofFrontX) * 0.5
    );
    aPillar.rotation.x = Math.PI / 2 - aPillarAngle;
    tagInteractPart(aPillar, 'body');
    root.add(aPillar);
  }

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(cabinWidth * 0.84, 0.018, aPillarLen * 0.9),
    glassMaterial
  );
  windshield.position.set(
    0,
    (beltY + roofY) * 0.5,
    (hoodEndX + cabinRoofFrontX) * 0.5 + 0.01
  );
  windshield.rotation.x = Math.PI / 2 - aPillarAngle;
  tagInteractPart(windshield, 'body');
  root.add(windshield);

  const rearGlassLen = Math.hypot(cabinRoofRearX - cabinRearX, roofY - beltY);
  const rearGlassAngle = Math.atan2(roofY - beltY, cabinRoofRearX - cabinRearX);
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(cabinWidth * 0.82, 0.018, rearGlassLen * 0.9),
    glassMaterial
  );
  rearGlass.position.set(
    0,
    (beltY + roofY) * 0.5,
    (cabinRoofRearX + cabinRearX) * 0.5 - 0.01
  );
  rearGlass.rotation.x = Math.PI / 2 - rearGlassAngle;
  tagInteractPart(rearGlass, 'body');
  root.add(rearGlass);

  // 5. Wheel-Arch Fender Flares & Dark Wheelhouse Liners
  const archMat = spec.isHatchOrSuv ? trimMaterial : bodyPaintMaterial;
  for (const side of [-1, 1]) {
    for (const axleZ of [frontAxleZ, rearAxleZ]) {
      const archGeo = new THREE.TorusGeometry(
        spec.wheelRadius * 1.15,
        0.048,
        8,
        18,
        Math.PI
      );
      archGeo.rotateY(Math.PI / 2);
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(side * (halfW - 0.03), spec.wheelRadius * 0.98, axleZ);
      tagInteractPart(arch, 'body');
      root.add(arch);

      const wheelWellLiner = new THREE.Mesh(
        new THREE.CylinderGeometry(
          spec.wheelRadius * 1.1,
          spec.wheelRadius * 1.1,
          spec.wheelWidth * 1.1,
          14,
          1,
          false,
          0,
          Math.PI
        ),
        trimMaterial
      );
      wheelWellLiner.rotation.z = Math.PI / 2;
      wheelWellLiner.position.set(
        side * (halfW - spec.wheelWidth * 0.52),
        spec.wheelRadius * 0.98,
        axleZ
      );
      root.add(wheelWellLiner);
    }
  }

  // 6. Front Grille, Horizon DRL Bar, License Plate & Glow Pool
  const grilleW = spec.width * 0.62;
  const grilleH = spec.bodyHeight * 0.34;
  const grilleY = baseBottom + grilleH * 0.5 + 0.09;
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(grilleW, grilleH, 0.06),
    trimMaterial
  );
  grille.position.set(0, grilleY, frontX - 0.01);
  root.add(grille);

  for (let s = -1; s <= 1; s++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(grilleW * 0.92, 0.014, 0.07),
      chromeMaterial
    );
    slat.position.set(0, grilleY + s * (grilleH * 0.24), frontX - 0.004);
    root.add(slat);
  }

  const drlBar = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.84, 0.042, 0.05),
    drlMaterial
  );
  drlBar.position.set(0, beltY - 0.11, frontX - 0.018);
  tagInteractPart(drlBar, 'lights');
  root.add(drlBar);

  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width * 0.17, 0.075, 0.065),
      drlMaterial
    );
    lamp.position.set(side * (halfW - 0.2), beltY - 0.15, frontX - 0.015);
    tagInteractPart(lamp, 'lights');
    root.add(lamp);
  }

  const frontPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.11, 0.02),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.45, metalness: 0.1 })
  );
  frontPlate.position.set(0, baseBottom + 0.14, frontX + 0.025);
  root.add(frontPlate);

  const glowPoolGeo = new THREE.CircleGeometry(1.15, 20);
  glowPoolGeo.rotateX(-Math.PI / 2);
  const glowPool = new THREE.Mesh(glowPoolGeo, headlightGlowPool);
  glowPool.position.set(0, 0.008, frontX + 1.05);
  glowPool.scale.set(1.1, 1, 1.45);
  root.add(glowPool);

  const puddleGeo = new THREE.CircleGeometry(0.85, 16);
  puddleGeo.rotateX(-Math.PI / 2);
  for (const side of [-1, 1]) {
    const puddle = new THREE.Mesh(puddleGeo, doorPuddleMaterial);
    puddle.position.set(side * (halfW + 0.38), 0.007, (doorFrontZ + doorRearZ) * 0.5);
    root.add(puddle);
  }

  // 7. Rear Horizon LED Tail Light Bar, Diffuser & Dual Exhaust Tips
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.86, 0.048, 0.05),
    tailLightMaterial
  );
  tailBar.position.set(0, beltY - spec.trunkDeckDrop - 0.06, rearX + 0.01);
  tagInteractPart(tailBar, 'lights');
  root.add(tailBar);

  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.72, 0.11, 0.07),
    trimMaterial
  );
  diffuser.position.set(0, baseBottom + 0.08, rearX + 0.01);
  root.add(diffuser);

  for (const side of [-1, 1]) {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.09, 12),
      chromeMaterial
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * (halfW * 0.52), baseBottom + 0.07, rearX - 0.015);
    root.add(exhaust);
  }

  const rearPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.11, 0.02),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.45, metalness: 0.1 })
  );
  rearPlate.position.set(0, baseBottom + 0.24, rearX - 0.01);
  root.add(rearPlate);

  // 8. Optional SUV Roof Rails or GT Sports Rear Wing
  if (spec.hasRoofRails) {
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.035, spec.length * 0.42),
        chromeMaterial
      );
      rail.position.set(side * (cabinWidth * 0.42), roofY + 0.035, -spec.length * 0.08);
      root.add(rail);
    }
  }

  if (spec.hasWing) {
    const wingBlade = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width * 0.9, 0.035, 0.24),
      trimMaterial
    );
    wingBlade.position.set(0, beltY + 0.24, rearX + 0.18);
    wingBlade.rotation.x = 0.12;
    wingBlade.castShadow = true;
    root.add(wingBlade);

    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.25, 0.16),
        trimMaterial
      );
      pylon.position.set(side * (spec.width * 0.3), beltY + 0.11, rearX + 0.18);
      root.add(pylon);
    }
  }

  // 9. Articulated Left (+X) & Right (-X) Doors
  const buildDoorAssembly = (side: -1 | 1, doorIndex: number): THREE.Group => {
    const doorMat = side === 1 ? leftDoorPaintMaterial : rightDoorPaintMaterial;
    const pivot = new THREE.Group();
    pivot.position.set(side * (halfW - 0.055), baseBottom + 0.08, doorFrontZ);

    const doorH = spec.bodyHeight - 0.1;

    const outerSkin = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, doorH, doorSpanZ),
      doorMat
    );
    outerSkin.position.set(0, doorH * 0.5, -doorSpanZ * 0.5);
    outerSkin.castShadow = true;
    pivot.add(outerSkin);

    const innerCard = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, doorH * 0.88, doorSpanZ * 0.92),
      interiorSeatMat
    );
    innerCard.position.set(-side * 0.038, doorH * 0.5, -doorSpanZ * 0.5);
    pivot.add(innerCard);

    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.036, 0.16),
      chromeMaterial
    );
    doorHandle.position.set(side * 0.042, doorH * 0.78, -doorSpanZ * 0.72);
    pivot.add(doorHandle);

    const winH = spec.cabinHeight * 0.82;
    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, winH, doorSpanZ * 0.74),
      glassMaterial
    );
    doorGlass.position.set(-side * 0.045, doorH + winH * 0.45, -doorSpanZ * 0.56);
    doorGlass.rotation.z = side * 0.16;
    pivot.add(doorGlass);

    const bPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, winH + 0.04, 0.065),
      trimMaterial
    );
    bPillar.position.set(-side * 0.045, doorH + winH * 0.45, -doorSpanZ * 0.92);
    bPillar.rotation.z = side * 0.16;
    pivot.add(bPillar);

    const mirrorArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.032, 0.042),
      trimMaterial
    );
    mirrorArm.position.set(side * 0.06, doorH - 0.04, -0.14);
    pivot.add(mirrorArm);

    const mirrorCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.08, 0.095),
      doorMat
    );
    mirrorCap.position.set(side * 0.115, doorH - 0.02, -0.15);
    mirrorCap.castShadow = true;
    pivot.add(mirrorCap);

    tagInteractPart(pivot, 'door', doorIndex);
    return pivot;
  };

  const leftDoorPivot = buildDoorAssembly(1, 0);
  const rightDoorPivot = buildDoorAssembly(-1, 1);
  root.add(leftDoorPivot, rightDoorPivot);

  // 10. Four Wheel Mounts + Memoized Wheel Cache & Hover Rim Tracking
  const wheelMounts: THREE.Group[] = [];
  const wheelHubs: THREE.Group[] = [];
  let wheelRimMaterials: THREE.MeshStandardMaterial[] = [];
  let wheelTireMaterials: THREE.MeshStandardMaterial[] = [];
  const interactiveMeshes: THREE.Object3D[] = [];
  const wheelCache = new Map<string, WheelBuildResult[]>();
  let appliedWheelId = '';

  const rebuildInteractiveList = () => {
    interactiveMeshes.length = 0;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.userData.interactPart) {
        interactiveMeshes.push(obj);
      }
    });
  };

  const trackHalfW = halfW - spec.wheelWidth * 0.28;
  const mountPositions: Array<{ x: number; z: number; isLeft: boolean }> = [
    { x: trackHalfW, z: frontAxleZ, isLeft: true },
    { x: -trackHalfW, z: frontAxleZ, isLeft: false },
    { x: trackHalfW, z: rearAxleZ, isLeft: true },
    { x: -trackHalfW, z: rearAxleZ, isLeft: false },
  ];

  const applyWheels = (nextWheelOpt: WheelOption) => {
    if (appliedWheelId === nextWheelOpt.id) return;
    appliedWheelId = nextWheelOpt.id;

    const sizeScale = 0.9 + ((nextWheelOpt.sizeInch - 16) / 5) * 0.16;
    const effectiveWheelY = spec.wheelRadius * sizeScale;
    wheelRimMaterials = [];
    wheelTireMaterials = [];

    let cachedSet = wheelCache.get(nextWheelOpt.id);
    if (!cachedSet) {
      cachedSet = mountPositions.map((pos) =>
        buildCompositeWheel(nextWheelOpt, spec.wheelRadius, spec.wheelWidth, pos.isLeft)
      );
      wheelCache.set(nextWheelOpt.id, cachedSet);
    }

    mountPositions.forEach((pos, idx) => {
      let mount = wheelMounts[idx];
      if (!mount) {
        mount = new THREE.Group();
        wheelMounts[idx] = mount;
        root.add(mount);
      } else {
        while (mount.children.length > 0) {
          mount.remove(mount.children[0]);
        }
      }
      mount.position.set(pos.x, effectiveWheelY, pos.z);
      const built = cachedSet![idx];
      tagInteractPart(built.group, 'wheel', idx);
      wheelHubs[idx] = built.group;
      wheelRimMaterials.push(built.rimMat);
      wheelTireMaterials.push(built.tireMat);
      mount.add(built.group);
    });

    rebuildInteractiveList();
  };

  // Pre-allocated animation state & scratch colors (zero per-frame allocations)
  const targetPaintColor = new THREE.Color(paint.bodyHex);
  const currentPaintColor = new THREE.Color(paint.bodyHex);
  const hoverEmerald = new THREE.Color('#3ee84b');
  const hoverCyan = new THREE.Color('#38bdf8');
  const hoverDarkEmerald = new THREE.Color('#14532d');
  const drlDefaultColor = new THREE.Color('#e2e8f0');
  const drlOpenColor = new THREE.Color('#7dd3fc');
  const tailDefaultColor = new THREE.Color('#dc2626');
  const tailOpenColor = new THREE.Color('#ff3b30');

  let targetDoorFactor = 0;
  let currentDoorFactor = 0;
  let wheelSwapAnim = 0; // counts down 1 -> 0 for wheel spin + scale pop
  let evolutionAnim = 0; // counts down 1 -> 0 for car entrance scale + swivel
  let hoverTarget: HoverTarget | null = null;

  // Smoothed per-part hover blend weights
  let leftDoorHover = 0;
  let rightDoorHover = 0;
  let bodyHover = 0;
  let lightsHover = 0;
  const wheelHovers = [0, 0, 0, 0];

  const applyDoorsAndLights = (factor: number) => {
    const clamped = Math.max(0, Math.min(1, factor));
    leftDoorPivot.rotation.y = -clamped * 0.92;
    rightDoorPivot.rotation.y = clamped * 0.92;
    cabinAmbientMaterial.emissiveIntensity = 0.2 + clamped * 1.8;
    headlightGlowPool.opacity = clamped * 0.28;
    doorPuddleMaterial.opacity = clamped * 0.22;
  };

  const applyHoverVisuals = () => {
    // 1. Body shell highlight
    bodyPaintMaterial.emissive.copy(hoverCyan);
    bodyPaintMaterial.emissiveIntensity = bodyHover * 0.24;

    // 2. Left & Right door independent highlights + subtle handle/door micro-pop
    leftDoorPaintMaterial.emissive.copy(hoverEmerald);
    leftDoorPaintMaterial.emissiveIntensity = leftDoorHover * 0.34;
    leftDoorPivot.scale.setScalar(1 + leftDoorHover * 0.014);

    rightDoorPaintMaterial.emissive.copy(hoverEmerald);
    rightDoorPaintMaterial.emissiveIntensity = rightDoorHover * 0.34;
    rightDoorPivot.scale.setScalar(1 + rightDoorHover * 0.014);

    // 3. Per-wheel rim/tire glow + subtle scale pop (hovered wheel brighter, other wheels soft)
    for (let i = 0; i < 4; i++) {
      const wHover = wheelHovers[i];
      const rimMat = wheelRimMaterials[i];
      const tireMat = wheelTireMaterials[i];
      if (rimMat) {
        rimMat.emissive.copy(hoverEmerald);
        rimMat.emissiveIntensity = wHover * 0.48;
      }
      if (tireMat) {
        tireMat.emissive.copy(hoverDarkEmerald);
        tireMat.emissiveIntensity = wHover * 0.24;
      }
      const mount = wheelMounts[i];
      if (mount) {
        const swapScale = wheelSwapAnim > 0 ? 1 - Math.sin(wheelSwapAnim * Math.PI) * 0.08 : 1;
        mount.scale.setScalar(swapScale * (1 + wHover * 0.04));
      }
    }

    // 4. Lights highlight blended cleanly with open/closed light baseline
    const openGlow = currentDoorFactor > 0.25 ? 1 : 0;
    drlMaterial.emissive.copy(openGlow ? drlOpenColor : drlDefaultColor);
    if (lightsHover > 0.02) {
      drlMaterial.emissive.lerp(hoverEmerald, lightsHover * 0.75);
    }
    drlMaterial.emissiveIntensity =
      0.95 + currentDoorFactor * 2.3 + lightsHover * 1.35;

    tailLightMaterial.emissive.copy(openGlow ? tailOpenColor : tailDefaultColor);
    tailLightMaterial.emissiveIntensity =
      1.0 + currentDoorFactor * 2.3 + lightsHover * 1.4;
  };

  const setWheels = (nextWheelOpt: WheelOption, animate = false) => {
    const changed = appliedWheelId !== '' && appliedWheelId !== nextWheelOpt.id;
    applyWheels(nextWheelOpt);
    if (animate && changed) {
      wheelSwapAnim = 1;
    }
    applyHoverVisuals();
  };

  const setPaint = (nextPaint: PaintOption, immediate = false) => {
    targetPaintColor.set(nextPaint.bodyHex);
    if (immediate) {
      currentPaintColor.copy(targetPaintColor);
      bodyPaintMaterial.color.copy(currentPaintColor);
      leftDoorPaintMaterial.color.copy(currentPaintColor);
      rightDoorPaintMaterial.color.copy(currentPaintColor);
    }
  };

  const setDoorsOpen = (open: boolean, immediate = false) => {
    targetDoorFactor = open ? 1 : 0;
    if (immediate) {
      currentDoorFactor = targetDoorFactor;
      applyDoorsAndLights(currentDoorFactor);
      applyHoverVisuals();
    }
  };

  const setHoveredTarget = (target: HoverTarget | null) => {
    hoverTarget = target;
  };

  const triggerEvolutionAnim = () => {
    evolutionAnim = 1;
    root.scale.setScalar(0.88);
    root.rotation.y = -0.34;
  };

  const stepAnimations = (dt: number): boolean => {
    let active = false;
    const fastAlpha = 1 - Math.exp(-14 * dt);
    const medAlpha = 1 - Math.exp(-10 * dt);

    // 1. Smooth door & light open/close damping
    if (Math.abs(currentDoorFactor - targetDoorFactor) > 0.003) {
      currentDoorFactor += (targetDoorFactor - currentDoorFactor) * medAlpha;
      applyDoorsAndLights(currentDoorFactor);
      active = true;
    } else if (currentDoorFactor !== targetDoorFactor) {
      currentDoorFactor = targetDoorFactor;
      applyDoorsAndLights(currentDoorFactor);
    }

    // 2. Smooth paint color lerp transition
    const colorDiff =
      Math.abs(currentPaintColor.r - targetPaintColor.r) +
      Math.abs(currentPaintColor.g - targetPaintColor.g) +
      Math.abs(currentPaintColor.b - targetPaintColor.b);
    if (colorDiff > 0.003) {
      currentPaintColor.lerp(targetPaintColor, medAlpha);
      bodyPaintMaterial.color.copy(currentPaintColor);
      leftDoorPaintMaterial.color.copy(currentPaintColor);
      rightDoorPaintMaterial.color.copy(currentPaintColor);
      active = true;
    } else if (colorDiff > 0) {
      currentPaintColor.copy(targetPaintColor);
      bodyPaintMaterial.color.copy(currentPaintColor);
      leftDoorPaintMaterial.color.copy(currentPaintColor);
      rightDoorPaintMaterial.color.copy(currentPaintColor);
    }

    // 3. Smooth wheel swap roll & spring scale
    if (wheelSwapAnim > 0.01) {
      wheelSwapAnim = Math.max(0, wheelSwapAnim - dt * 2.8);
      for (let i = 0; i < wheelHubs.length; i++) {
        if (wheelHubs[i]) {
          wheelHubs[i].rotation.x = (1 - wheelSwapAnim) * Math.PI * 1.1;
        }
      }
      active = true;
    } else if (wheelSwapAnim !== 0) {
      wheelSwapAnim = 0;
    }

    // 4. Smooth vehicle evolution entrance (scale + swivel)
    if (evolutionAnim > 0.005) {
      evolutionAnim += (0 - evolutionAnim) * (1 - Math.exp(-8 * dt));
      if (evolutionAnim < 0.008) evolutionAnim = 0;
      root.scale.setScalar(1 - evolutionAnim * 0.12);
      root.rotation.y = -evolutionAnim * 0.34;
      active = true;
    } else if (root.rotation.y !== 0 || root.scale.x !== 1) {
      root.scale.setScalar(1);
      root.rotation.y = 0;
    }

    // 5. Smooth per-part hover glow damping
    const tLeftDoor =
      hoverTarget?.part === 'door' && (hoverTarget.index === undefined || hoverTarget.index === 0)
        ? 1
        : 0;
    const tRightDoor =
      hoverTarget?.part === 'door' && (hoverTarget.index === undefined || hoverTarget.index === 1)
        ? 1
        : 0;
    const tBody = hoverTarget?.part === 'body' ? 1 : 0;
    const tLights = hoverTarget?.part === 'lights' ? 1 : 0;

    if (Math.abs(leftDoorHover - tLeftDoor) > 0.01) {
      leftDoorHover += (tLeftDoor - leftDoorHover) * fastAlpha;
      active = true;
    } else {
      leftDoorHover = tLeftDoor;
    }

    if (Math.abs(rightDoorHover - tRightDoor) > 0.01) {
      rightDoorHover += (tRightDoor - rightDoorHover) * fastAlpha;
      active = true;
    } else {
      rightDoorHover = tRightDoor;
    }

    if (Math.abs(bodyHover - tBody) > 0.01) {
      bodyHover += (tBody - bodyHover) * fastAlpha;
      active = true;
    } else {
      bodyHover = tBody;
    }

    if (Math.abs(lightsHover - tLights) > 0.01) {
      lightsHover += (tLights - lightsHover) * fastAlpha;
      active = true;
    } else {
      lightsHover = tLights;
    }

    for (let i = 0; i < 4; i++) {
      const targetW =
        hoverTarget?.part === 'wheel'
          ? hoverTarget.index === i
            ? 1.0
            : 0.35
          : 0;
      if (Math.abs(wheelHovers[i] - targetW) > 0.01) {
        wheelHovers[i] += (targetW - wheelHovers[i]) * fastAlpha;
        active = true;
      } else {
        wheelHovers[i] = targetW;
      }
    }

    applyHoverVisuals();
    return active;
  };

  // Initialize wheel state & lights cleanly
  applyWheels(wheelOpt);
  applyDoorsAndLights(0);

  const dispose = () => {
    wheelCache.forEach((wheelSet) => {
      wheelSet.forEach((w) => disposeObject3D(w.group));
    });
    wheelCache.clear();
    disposeObject3D(root);
  };

  return {
    root,
    bodyPaintMaterial,
    leftDoorPaintMaterial,
    rightDoorPaintMaterial,
    drlMaterial,
    tailLightMaterial,
    cabinAmbientMaterial,
    headlightGlowPool,
    doorPuddleMaterial,
    leftDoorPivot,
    rightDoorPivot,
    wheelHubs,
    wheelMounts,
    interactiveMeshes,
    spec,
    setDoorsOpen,
    setWheels,
    setPaint,
    setHoveredTarget,
    triggerEvolutionAnim,
    stepAnimations,
    dispose,
  };
}
