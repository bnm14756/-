import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Lock,
  Move3d,
  Palette,
  Pause,
  Play,
  RotateCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PAINT_OPTIONS, VEHICLE_TIERS, WHEEL_OPTIONS } from '../data/initialData';
import type {
  PaintOption,
  VehicleBodyType,
  VehicleTierSpec,
  VehicleViewAngle,
  WeatherApiResponse,
  WheelOption,
} from '../types/driving';
import { ThreeCarViewer } from './ThreeCarViewer';

interface VehicleShowroomStageProps {
  equippedVehicle: VehicleTierSpec;
  highestUnlockedLevel: number;
  totalExp: number;
  fuelPercent: number;
  weather: WeatherApiResponse | null;
  safetyScore: number;
  continuousTimeLabel: string;
  paint: PaintOption;
  wheel: WheelOption;
  autoRotate: boolean;
  doorsAndLightsOpen: boolean;
  isResting: boolean;
  onToggleAutoRotate: () => void;
  onToggleDoorsAndLights: () => void;
  onSelectPaint: (paint: PaintOption) => void;
  onSelectWheel: (wheel: WheelOption) => void;
  onOpenGarage: () => void;
  onEvolveNext: () => void;
  onStartRest: () => void;
  onEarnDemoExp: (amount: number) => void;
}

interface VehicleIllustrationProps {
  bodyType: VehicleBodyType;
  paint: PaintOption;
  wheel: WheelOption;
  viewAngle?: VehicleViewAngle;
  rotationDeg?: number;
  doorsOpen: boolean;
  compact?: boolean;
}

interface VehicleProportions {
  halfWidth: number;
  halfLength: number;
  roofHalfW: number;
  roofOffsetY: number;
  hoodY: number;
  bumperY: number;
  wheelRadius: number;
  hasWing?: boolean;
  isBoxy?: boolean;
}

const BODY_PROPORTIONS: Record<VehicleBodyType, VehicleProportions> = {
  'compact-hatch': {
    halfWidth: 66,
    halfLength: 92,
    roofHalfW: 52,
    roofOffsetY: 56,
    hoodY: 100,
    bumperY: 162,
    wheelRadius: 21,
    isBoxy: true,
  },
  'smart-sedan': {
    halfWidth: 74,
    halfLength: 122,
    roofHalfW: 54,
    roofOffsetY: 64,
    hoodY: 105,
    bumperY: 162,
    wheelRadius: 22,
  },
  'compact-suv': {
    halfWidth: 78,
    halfLength: 114,
    roofHalfW: 58,
    roofOffsetY: 52,
    hoodY: 96,
    bumperY: 160,
    wheelRadius: 24,
    isBoxy: true,
  },
  'flagship-suv': {
    halfWidth: 84,
    halfLength: 132,
    roofHalfW: 64,
    roofOffsetY: 46,
    hoodY: 92,
    bumperY: 160,
    wheelRadius: 26,
    isBoxy: true,
  },
  'luxury-sedan': {
    halfWidth: 80,
    halfLength: 136,
    roofHalfW: 58,
    roofOffsetY: 60,
    hoodY: 101,
    bumperY: 162,
    wheelRadius: 24,
  },
  'gt-sports': {
    halfWidth: 88,
    halfLength: 134,
    roofHalfW: 54,
    roofOffsetY: 74,
    hoodY: 113,
    bumperY: 164,
    wheelRadius: 25,
    hasWing: true,
  },
};

const ANGLE_PRESETS = [
  { label: '정면 0°', deg: 0 },
  { label: '우측면 90°', deg: 90 },
  { label: '후면 180°', deg: 180 },
  { label: '좌측면 270°', deg: 270 },
  { label: '3/4 318°', deg: 318 },
] as const;

export const VehicleIllustration: React.FC<VehicleIllustrationProps> = React.memo(({
  bodyType,
  paint,
  wheel,
  viewAngle = 'side',
  rotationDeg,
  doorsOpen,
  compact = false,
}) => {
  const effectiveDeg =
    typeof rotationDeg === 'number'
      ? rotationDeg
      : viewAngle === 'front'
        ? 0
        : viewAngle === 'three-quarter'
          ? 318
          : 90;

  const normDeg = ((effectiveDeg % 360) + 360) % 360;
  const rad = (normDeg * Math.PI) / 180;
  const sin = Math.sin(rad); // +1 at 90 (right side), -1 at 270 (left side)
  const cos = Math.cos(rad); // +1 at 0 (front), -1 at 180 (rear)

  const props = BODY_PROPORTIONS[bodyType];
  const gradId = `body360-${bodyType}-${paint.id}-${compact ? 'sm' : 'lg'}`;
  const sideGradId = `side360-${bodyType}-${paint.id}-${compact ? 'sm' : 'lg'}`;
  const glassId = `glass360-${bodyType}-${compact ? 'sm' : 'lg'}`;

  const cx = 210;
  // Perspective horizontal offsets for front/rear faces and side elongation
  const sideDir = sin >= 0 ? 1 : -1;
  const absSin = Math.abs(sin);
  const absCos = Math.abs(cos);

  // Center shift between the visible end face (front or rear) and far end
  const halfLenProj = props.halfLength * absSin;
  const halfWidProj = props.halfWidth * absCos;
  const roofWidProj = props.roofHalfW * absCos;

  // Front face center X and Rear face center X
  // At 0° (front): frontX = cx, rearX = cx
  // At 90° (right side facing viewer): front at left (cx - halfLength), rear at right (cx + halfLength)
  // At 270° (left side facing viewer): front at right (cx + halfLength), rear at left (cx - halfLength)
  const frontCenterX = cx - sin * props.halfLength * 0.88;
  const rearCenterX = cx + sin * props.halfLength * 0.88;
  const showingFront = cos >= 0;
  const primaryEndX = showingFront ? frontCenterX : rearCenterX;
  const farEndX = showingFront ? rearCenterX : frontCenterX;

  const roofFrontX = cx - sin * props.halfLength * 0.44;
  const roofRearX = cx + sin * props.halfLength * (props.isBoxy ? 0.72 : 0.54);
  const primaryRoofX = showingFront ? roofFrontX : roofRearX;
  const farRoofX = showingFront ? roofRearX : roofFrontX;

  const hoodY = props.hoodY;
  const roofY = props.roofOffsetY;
  const bumperY = props.bumperY;

  const renderWheel360 = (wheelCenterX: number, wheelCenterY: number, isFrontWheel: boolean) => {
    const rx = Math.max(6, props.wheelRadius * Math.max(0.28, absSin));
    const ry = props.wheelRadius;
    const rimColor =
      wheel.spokeStyle === 'carbon'
        ? '#262A32'
        : wheel.spokeStyle === 'mesh'
          ? '#4B5563'
          : wheel.spokeStyle === 'machined'
            ? '#CBD5E1'
            : '#94A3B8';

    // Hide far wheel slightly when nearly head-on
    const showFace = absSin > 0.16;

    return (
      <g key={`${isFrontWheel ? 'fw' : 'rw'}`}>
        <ellipse
          cx={wheelCenterX}
          cy={wheelCenterY}
          rx={rx}
          ry={ry}
          fill="#0B0D11"
          stroke="#1F2937"
          strokeWidth="1.8"
        />
        {showFace && (
          <>
            <ellipse
              cx={wheelCenterX}
              cy={wheelCenterY}
              rx={rx * 0.68}
              ry={ry * 0.68}
              fill="#181C23"
              stroke={rimColor}
              strokeWidth="2"
            />
            {wheel.spokeStyle === 'aero' && (
              <ellipse
                cx={wheelCenterX}
                cy={wheelCenterY}
                rx={rx * 0.42}
                ry={ry * 0.42}
                fill={rimColor}
                opacity="0.85"
              />
            )}
            {wheel.spokeStyle === 'machined' &&
              [0, 72, 144, 216, 288].map((deg) => (
                <line
                  key={deg}
                  x1={wheelCenterX}
                  y1={wheelCenterY}
                  x2={wheelCenterX + Math.cos(((deg + normDeg) * Math.PI) / 180) * rx * 0.62}
                  y2={wheelCenterY + Math.sin(((deg + normDeg) * Math.PI) / 180) * ry * 0.62}
                  stroke="#E2E8F0"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              ))}
            {wheel.spokeStyle === 'mesh' &&
              [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <line
                  key={deg}
                  x1={wheelCenterX}
                  y1={wheelCenterY}
                  x2={wheelCenterX + Math.cos(((deg + normDeg) * Math.PI) / 180) * rx * 0.62}
                  y2={wheelCenterY + Math.sin(((deg + normDeg) * Math.PI) / 180) * ry * 0.62}
                  stroke="#94A3B8"
                  strokeWidth="1.7"
                />
              ))}
            {wheel.spokeStyle === 'carbon' && (
              <>
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <line
                    key={deg}
                    x1={wheelCenterX}
                    y1={wheelCenterY}
                    x2={wheelCenterX + Math.cos(((deg + normDeg) * Math.PI) / 180) * rx * 0.62}
                    y2={wheelCenterY + Math.sin(((deg + normDeg) * Math.PI) / 180) * ry * 0.62}
                    stroke="#F87171"
                    strokeWidth="2.2"
                  />
                ))}
                <ellipse
                  cx={wheelCenterX}
                  cy={wheelCenterY}
                  rx={rx * 0.22}
                  ry={ry * 0.22}
                  fill="#DC2626"
                />
              </>
            )}
          </>
        )}
      </g>
    );
  };

  // Front & rear axle X positions projected onto screen
  const frontAxleX = cx - sin * props.halfLength * 0.64;
  const rearAxleX = cx + sin * props.halfLength * 0.64;
  const axleY = bumperY - 2;

  // Turntable tick angles
  const turntableTicks = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <svg
      viewBox="0 0 420 220"
      className="w-full h-full select-none"
      role="img"
      aria-label={`${bodyType} 360도 스튜디오 뷰 (${Math.round(normDeg)}도)`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={paint.highlightHex} />
          <stop offset="52%" stopColor={paint.bodyHex} />
          <stop offset="100%" stopColor={paint.shadowHex} />
        </linearGradient>
        <linearGradient id={sideGradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={paint.highlightHex} stopOpacity="0.92" />
          <stop offset="55%" stopColor={paint.bodyHex} />
          <stop offset="100%" stopColor={paint.shadowHex} />
        </linearGradient>
        <linearGradient id={glassId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={doorsOpen ? '#38BDF8' : '#334155'} stopOpacity="0.86" />
          <stop offset="100%" stopColor="#090D14" stopOpacity="0.96" />
        </linearGradient>
      </defs>

      {/* 360° Studio Turntable Floor Ring */}
      {!compact && (
        <g opacity="0.55">
          <ellipse
            cx="210"
            cy="184"
            rx="168"
            ry="22"
            fill="none"
            stroke="#3EE84B"
            strokeOpacity="0.25"
            strokeWidth="1.2"
          />
          {turntableTicks.map((tDeg) => {
            const tr = ((tDeg + normDeg) * Math.PI) / 180;
            const tx = 210 + Math.sin(tr) * 168;
            const ty = 184 + Math.cos(tr) * 22;
            return <circle key={tDeg} cx={tx} cy={ty} r="1.4" fill="#3EE84B" opacity="0.55" />;
          })}
        </g>
      )}

      {/* Soft Studio Contact Shadow */}
      <ellipse
        cx="210"
        cy="184"
        rx={Math.max(85, halfLenProj + halfWidProj + 18)}
        ry="15"
        fill="#000000"
        opacity="0.65"
      />

      {/* Open Doors Wing Effect when doorsOpen */}
      {doorsOpen && (
        <g opacity="0.92">
          <path
            d={`M ${cx - Math.max(36, halfWidProj * 0.72)} ${hoodY + 6} L ${cx - Math.max(66, halfWidProj + 24)} ${hoodY - 22} L ${cx - Math.max(58, halfWidProj + 16)} ${hoodY + 34} L ${cx - Math.max(34, halfWidProj * 0.65)} ${bumperY - 18} Z`}
            fill={paint.bodyHex}
            stroke="#3EE84B"
            strokeWidth="1.2"
          />
          <path
            d={`M ${cx + Math.max(36, halfWidProj * 0.72)} ${hoodY + 6} L ${cx + Math.max(66, halfWidProj + 24)} ${hoodY - 22} L ${cx + Math.max(58, halfWidProj + 16)} ${hoodY + 34} L ${cx + Math.max(34, halfWidProj * 0.65)} ${bumperY - 18} Z`}
            fill={paint.bodyHex}
            stroke="#3EE84B"
            strokeWidth="1.2"
          />
        </g>
      )}

      {/* Far-side Tires when near head-on / rear-on */}
      {absSin <= 0.25 && (
        <>
          <rect
            x={primaryEndX - halfWidProj + 2}
            y={bumperY - 22}
            width="24"
            height="34"
            rx="6"
            fill="#090B0E"
          />
          <rect
            x={primaryEndX + halfWidProj - 26}
            y={bumperY - 22}
            width="24"
            height="34"
            rx="6"
            fill="#090B0E"
          />
        </>
      )}

      {/* Side Flank Body + Cabin (Visible whenever rotated away from pure 0°/180°) */}
      {absSin > 0.08 && (
        <g>
          {/* Side Lower Body */}
          <path
            d={`M ${primaryEndX - sideDir * halfWidProj * 0.6} ${hoodY + 8}
               L ${primaryEndX - sideDir * halfWidProj * 0.55} ${bumperY - 4}
               L ${farEndX + sideDir * halfWidProj * 0.4} ${bumperY - 4}
               L ${farEndX + sideDir * halfWidProj * 0.4} ${hoodY + 4}
               L ${farRoofX + sideDir * roofWidProj * 0.35} ${roofY}
               L ${primaryRoofX - sideDir * roofWidProj * 0.35} ${roofY}
               Z`}
            fill={`url(#${sideGradId})`}
            stroke={paint.highlightHex}
            strokeOpacity="0.35"
            strokeWidth="1.1"
          />
          {/* Side Windows */}
          <path
            d={`M ${primaryRoofX - sideDir * roofWidProj * 0.25} ${roofY + 7}
               L ${farRoofX + sideDir * roofWidProj * 0.25} ${roofY + 7}
               L ${farEndX + sideDir * halfWidProj * 0.2} ${hoodY + 2}
               L ${primaryEndX - sideDir * halfWidProj * 0.35} ${hoodY + 4}
               Z`}
            fill={`url(#${glassId})`}
          />
          {/* Door Seam */}
          <line
            x1={(frontAxleX + rearAxleX) / 2}
            y1={hoodY + 5}
            x2={(frontAxleX + rearAxleX) / 2 - sin * 6}
            y2={bumperY - 8}
            stroke={doorsOpen ? '#3EE84B' : '#0F172A'}
            strokeOpacity={doorsOpen ? '0.9' : '0.45'}
            strokeWidth={doorsOpen ? '2' : '1.3'}
          />
        </g>
      )}

      {/* GT Sports Rear Wing */}
      {props.hasWing && (
        <path
          d={`M ${rearCenterX - Math.max(24, halfWidProj * 0.78)} ${roofY + 10}
             L ${rearCenterX + Math.max(24, halfWidProj * 0.78)} ${roofY + 10}
             L ${rearCenterX + Math.max(18, halfWidProj * 0.68)} ${roofY + 17}
             L ${rearCenterX - Math.max(18, halfWidProj * 0.68)} ${roofY + 17} Z`}
          fill="#111827"
          stroke="#3EE84B"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
      )}

      {/* Primary Visible End Face (Front Fascia when cos >= 0, Rear Fascia when cos < 0) */}
      {absCos > 0.14 && (
        <g>
          {/* End Cabin Windshield / Rear Glass */}
          <path
            d={`M ${primaryRoofX - roofWidProj + 6 * absCos} ${roofY}
               Q ${primaryRoofX} ${roofY - 6} ${primaryRoofX + roofWidProj - 6 * absCos} ${roofY}
               L ${primaryEndX + halfWidProj - 8 * absCos} ${hoodY}
               L ${primaryEndX - halfWidProj + 8 * absCos} ${hoodY} Z`}
            fill={`url(#${gradId})`}
          />
          <path
            d={`M ${primaryRoofX - roofWidProj + 11 * absCos} ${roofY + 7}
               Q ${primaryRoofX} ${roofY + 2} ${primaryRoofX + roofWidProj - 11 * absCos} ${roofY + 7}
               L ${primaryEndX + halfWidProj - 14 * absCos} ${hoodY - 2}
               L ${primaryEndX - halfWidProj + 14 * absCos} ${hoodY - 2} Z`}
            fill={`url(#${glassId})`}
          />

          {/* End Bumper & Fascia */}
          <path
            d={`M ${primaryEndX - halfWidProj + 8 * absCos} ${hoodY}
               Q ${primaryEndX} ${hoodY - 6} ${primaryEndX + halfWidProj - 8 * absCos} ${hoodY}
               L ${primaryEndX + halfWidProj} ${hoodY + 22}
               L ${primaryEndX + halfWidProj - 4 * absCos} ${bumperY - 4}
               Q ${primaryEndX} ${bumperY + 4} ${primaryEndX - halfWidProj + 4 * absCos} ${bumperY - 4}
               L ${primaryEndX - halfWidProj} ${hoodY + 22} Z`}
            fill={`url(#${gradId})`}
          />

          {showingFront ? (
            <>
              {/* Front Grille */}
              <rect
                x={primaryEndX - halfWidProj * 0.62}
                y={hoodY + 22}
                width={halfWidProj * 1.24}
                height="24"
                rx="7"
                fill="#0B0E13"
                stroke="#2E3540"
                strokeWidth="1.2"
              />
              {/* Front Signature DRL Bar */}
              <line
                x1={primaryEndX - halfWidProj * 0.84}
                y1={hoodY + 12}
                x2={primaryEndX + halfWidProj * 0.84}
                y2={hoodY + 12}
                stroke={doorsOpen ? '#3EE84B' : '#E2E8F0'}
                strokeWidth={doorsOpen ? '4' : '2.5'}
                strokeLinecap="round"
              />
              {doorsOpen && (
                <ellipse
                  cx={primaryEndX}
                  cy={hoodY + 16}
                  rx={halfWidProj * 0.78}
                  ry="8"
                  fill="#BAE6FD"
                  opacity="0.24"
                />
              )}
            </>
          ) : (
            <>
              {/* Rear Horizon LED Tail Light Bar */}
              <line
                x1={primaryEndX - halfWidProj * 0.86}
                y1={hoodY + 14}
                x2={primaryEndX + halfWidProj * 0.86}
                y2={hoodY + 14}
                stroke={doorsOpen ? '#FF3B30' : '#DC2626'}
                strokeWidth={doorsOpen ? '4.8' : '3.4'}
                strokeLinecap="round"
              />
              {/* Rear Diffuser & Exhaust Tips */}
              <rect
                x={primaryEndX - halfWidProj * 0.68}
                y={bumperY - 14}
                width={halfWidProj * 1.36}
                height="11"
                rx="4"
                fill="#0B0E13"
              />
              <circle
                cx={primaryEndX - halfWidProj * 0.48}
                cy={bumperY - 8.5}
                r={Math.max(2, 3.8 * absCos)}
                fill="#94A3B8"
              />
              <circle
                cx={primaryEndX + halfWidProj * 0.48}
                cy={bumperY - 8.5}
                r={Math.max(2, 3.8 * absCos)}
                fill="#94A3B8"
              />
            </>
          )}

          {/* License Plate */}
          {absCos > 0.35 && (
            <rect
              x={primaryEndX - 28 * absCos}
              y={bumperY - 24}
              width={56 * absCos}
              height="12"
              rx="2.5"
              fill="#E2E8F0"
            />
          )}
        </g>
      )}

      {/* Side Wheels */}
      {absSin > 0.16 && (
        <>
          {renderWheel360(frontAxleX, axleY, true)}
          {renderWheel360(rearAxleX, axleY, false)}
        </>
      )}
    </svg>
  );
});

const VehicleShowroomStageInner: React.FC<VehicleShowroomStageProps> = ({
  equippedVehicle,
  highestUnlockedLevel,
  totalExp,
  fuelPercent,
  weather,
  safetyScore,
  continuousTimeLabel,
  paint,
  wheel,
  autoRotate,
  doorsAndLightsOpen,
  isResting,
  onToggleAutoRotate,
  onToggleDoorsAndLights,
  onSelectPaint,
  onSelectWheel,
  onOpenGarage,
  onEvolveNext,
  onStartRest,
  onEarnDemoExp,
}) => {
  const [rotationDeg, setRotationDeg] = useState<number>(328);
  const [cameraCommand, setCameraCommand] = useState<{ deg: number; seq: number } | null>(null);
  const [showCustomTray, setShowCustomTray] = useState(true);
  const [previewPaint, setPreviewPaint] = useState<PaintOption | null>(null);
  const [previewWheel, setPreviewWheel] = useState<WheelOption | null>(null);
  const customTrayRef = useRef<HTMLDivElement | null>(null);

  const issueCameraAngle = useCallback(
    (deg: number) => {
      if (autoRotate) onToggleAutoRotate();
      setRotationDeg(deg);
      setCameraCommand((prev) => ({ deg, seq: (prev?.seq ?? 0) + 1 }));
    },
    [autoRotate, onToggleAutoRotate]
  );

  // Auto-promote previewed paint/wheel to equipped as soon as the driver reaches its unlock level
  useEffect(() => {
    if (previewPaint && previewPaint.unlockLevel <= highestUnlockedLevel) {
      onSelectPaint(previewPaint);
      setPreviewPaint(null);
    }
    if (previewWheel && previewWheel.unlockLevel <= highestUnlockedLevel) {
      onSelectWheel(previewWheel);
      setPreviewWheel(null);
    }
  }, [highestUnlockedLevel, onSelectPaint, onSelectWheel, previewPaint, previewWheel]);

  const activeStagePaint = previewPaint ?? paint;
  const activeStageWheel = previewWheel ?? wheel;
  const isPreviewingLocked = Boolean(previewPaint || previewWheel);

  const nextTier = useMemo(
    () => VEHICLE_TIERS.find((t) => t.level === equippedVehicle.level + 1),
    [equippedVehicle.level]
  );
  const expToNext = nextTier ? Math.max(nextTier.requiredTotalExp - totalExp, 0) : 0;
  const canEvolveNow = Boolean(nextTier && totalExp >= nextTier.requiredTotalExp);
  const maxTierUnlocked = highestUnlockedLevel >= VEHICLE_TIERS[VEHICLE_TIERS.length - 1].level;

  const unlockedPaintCount = useMemo(
    () => PAINT_OPTIONS.filter((p) => p.unlockLevel <= highestUnlockedLevel).length,
    [highestUnlockedLevel]
  );
  const unlockedWheelCount = useMemo(
    () => WHEEL_OPTIONS.filter((w) => w.unlockLevel <= highestUnlockedLevel).length,
    [highestUnlockedLevel]
  );

  const handlePaintClick = useCallback(
    (opt: PaintOption) => {
      if (opt.unlockLevel <= highestUnlockedLevel) {
        setPreviewPaint(null);
        onSelectPaint(opt);
      } else {
        setPreviewPaint(opt);
        onSelectPaint(opt);
      }
    },
    [highestUnlockedLevel, onSelectPaint]
  );

  const handleWheelClick = useCallback(
    (w: WheelOption) => {
      if (w.unlockLevel <= highestUnlockedLevel) {
        setPreviewWheel(null);
        onSelectWheel(w);
      } else {
        setPreviewWheel(w);
        onSelectWheel(w);
      }
    },
    [highestUnlockedLevel, onSelectWheel]
  );

  const handleCyclePaint = useCallback(() => {
    const idx = PAINT_OPTIONS.findIndex((p) => p.id === activeStagePaint.id);
    const nextPaint = PAINT_OPTIONS[(idx + 1) % PAINT_OPTIONS.length];
    handlePaintClick(nextPaint);
  }, [activeStagePaint.id, handlePaintClick]);

  const handleCycleWheel = useCallback(() => {
    const idx = WHEEL_OPTIONS.findIndex((w) => w.id === activeStageWheel.id);
    const nextWheel = WHEEL_OPTIONS[(idx + 1) % WHEEL_OPTIONS.length];
    handleWheelClick(nextWheel);
  }, [activeStageWheel.id, handleWheelClick]);

  const handleUser3dInteraction = useCallback(() => {
    if (autoRotate) onToggleAutoRotate();
  }, [autoRotate, onToggleAutoRotate]);

  const handleOpenCustomizeBubble = () => {
    setShowCustomTray(true);
    window.setTimeout(() => {
      customTrayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 40);
  };

  const getAngleLabel = (deg: number) => {
    const n = ((Math.round(deg) % 360) + 360) % 360;
    if (n <= 20 || n >= 340) return '정면';
    if (n > 20 && n < 70) return '우측 전방';
    if (n >= 70 && n <= 110) return '우측면';
    if (n > 110 && n < 160) return '우측 후방';
    if (n >= 160 && n <= 200) return '후면';
    if (n > 200 && n < 250) return '좌측 후방';
    if (n >= 250 && n <= 290) return '좌측면';
    return '좌측 전방';
  };

  return (
    <section
      aria-label="스마트 쇼룸 360도 3D 스테이지"
      className="rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#454B54] via-[#1C2026] to-[#0B0D11] shadow-2xl"
    >
      <div className="px-5 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-7 flex flex-col items-center">
        {/* Top Floating Status Chip */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#0E1116]/90 border border-white/10 text-xs font-medium text-slate-200">
          <span>안전운전</span>
          <span className="font-mono tabular-nums font-bold text-[#3EE84B]">
            {safetyScore}점
          </span>
          <span aria-hidden="true" className="text-slate-500">
            ·
          </span>
          <span>연료</span>
          <span
            className={`font-mono tabular-nums font-bold ${
              fuelPercent <= 0.5
                ? 'text-red-400'
                : fuelPercent <= 20
                  ? 'text-amber-400'
                  : 'text-[#3EE84B]'
            }`}
          >
            {Math.round(fuelPercent)}%
          </span>
          <span aria-hidden="true" className="text-slate-500">
            ·
          </span>
          <span>연속 주행</span>
          <span className="font-mono tabular-nums text-white">{continuousTimeLabel}</span>
          {weather && weather.severity !== 'normal' && (
            <>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span
                className={`font-bold ${
                  weather.severity === 'warning' ? 'text-red-300' : 'text-amber-300'
                }`}
              >
                {weather.label}
              </span>
            </>
          )}
        </div>

        {fuelPercent <= 0.5 && (
          <div className="mt-2 px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-400/50 text-red-200 text-xs font-bold">
            연료 고갈(0%) — 주유소 통과 또는 동료에게 기름을 받아야 경험치를 얻을 수 있습니다
          </div>
        )}

        {/* Interactive 360° Vehicle Stage with 3 Speech-Bubble Hotspots */}
        <div className="relative w-full max-w-lg mt-6 mb-3">
          {/* Top-Center Speech Bubble */}
          <div className="flex justify-center mb-1">
            <button
              type="button"
              onClick={onToggleDoorsAndLights}
              className={`relative px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3EE84B] ${
                doorsAndLightsOpen
                  ? 'bg-[#3EE84B] text-[#071809] scale-[1.03]'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{doorsAndLightsOpen ? '도어 · 라이트 켜짐' : '차문을 열어보세요'}</span>
              <span
                aria-hidden="true"
                className={`absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 transition-colors duration-200 ${
                  doorsAndLightsOpen ? 'bg-[#3EE84B]' : 'bg-white'
                }`}
              />
            </button>
          </div>

          {/* Left & Right Speech Bubbles */}
          <div className="relative flex items-center justify-between z-10 px-1 sm:px-4 -mb-4">
            <button
              type="button"
              onClick={onToggleAutoRotate}
              className={`relative px-3.5 py-2 rounded-full text-xs font-bold shadow-lg transition-all duration-200 ease-out active:scale-95 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3EE84B] ${
                autoRotate
                  ? 'bg-[#3EE84B] text-[#071809] scale-[1.03]'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RotateCw size={12} className={autoRotate ? 'animate-spin' : ''} aria-hidden="true" />
              <span>{autoRotate ? '360° 회전 중지' : '차를 한바퀴 돌려보세요'}</span>
              <span
                aria-hidden="true"
                className={`absolute right-6 -bottom-1.5 w-3 h-3 rotate-45 transition-colors duration-200 ${
                  autoRotate ? 'bg-[#3EE84B]' : 'bg-white'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleOpenCustomizeBubble}
              className={`relative px-3.5 py-2 rounded-full text-xs font-bold shadow-lg transition-all duration-200 ease-out active:scale-95 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3EE84B] ${
                showCustomTray
                  ? 'bg-[#3EE84B] text-[#071809] scale-[1.03]'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Palette size={12} aria-hidden="true" />
              <span>휠·컬러 변경해보세요</span>
              <span
                aria-hidden="true"
                className={`absolute left-6 -bottom-1.5 w-3 h-3 rotate-45 transition-colors duration-200 ${
                  showCustomTray ? 'bg-[#3EE84B]' : 'bg-white'
                }`}
              />
            </button>
          </div>

          {/* Interactive Three.js 3D 360° Car Model Stage */}
          <div className="relative h-64 sm:h-80 w-full mt-2 rounded-2xl overflow-hidden border border-white/10 bg-[#14181f] shadow-inner">
            <ThreeCarViewer
              bodyType={equippedVehicle.bodyType}
              paint={activeStagePaint}
              wheel={activeStageWheel}
              cameraCommand={cameraCommand}
              autoRotate={autoRotate}
              doorsAndLightsOpen={doorsAndLightsOpen}
              onChangeRotation={setRotationDeg}
              onUserInteraction={handleUser3dInteraction}
              onClickDoorsOrLights={onToggleDoorsAndLights}
              onClickWheels={handleCycleWheel}
              onClickBodyPaint={handleCyclePaint}
            />

            {/* Subtle 3D Orbit & Click Hint (solid translucent background, no backdrop-blur over WebGL) */}
            <div className="pointer-events-none absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B0D11]/85 border border-white/10 text-[11px] text-slate-200">
              <Move3d size={12} className="text-[#3EE84B]" aria-hidden="true" />
              <span>드래그 360° 회전 · 도어/휠/차체 클릭</span>
            </div>

            <div className="pointer-events-none absolute bottom-2.5 right-3 px-2.5 py-1 rounded-full bg-[#0B0D11]/85 border border-white/10 text-[11px] font-mono tabular-nums text-slate-300 flex items-center gap-1.5">
              {isPreviewingLocked && (
                <span className="text-amber-400 font-bold">미리보기</span>
              )}
              <span>
                {activeStageWheel.sizeInch}인치 · {activeStagePaint.name}
              </span>
            </div>
          </div>

          {/* Interactive 360° Turntable Slider & Angle Snap Controls */}
          <div className="mt-2.5 space-y-2 px-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleAutoRotate}
                aria-label={autoRotate ? '360도 자동 회전 정지' : '360도 자동 회전 시작'}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0"
              >
                {autoRotate ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <input
                type="range"
                min={0}
                max={359}
                value={Math.round(rotationDeg)}
                onChange={(e) => issueCameraAngle(Number(e.target.value))}
                aria-label="차량 360도 회전 각도"
                className="w-full accent-[#3EE84B] cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <span className="text-xs font-mono tabular-nums text-[#3EE84B] font-bold whitespace-nowrap w-24 text-right">
                {Math.round(rotationDeg)}° · {getAngleLabel(rotationDeg)}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {ANGLE_PRESETS.map((preset) => {
                const isNear = Math.abs(((rotationDeg - preset.deg + 540) % 360) - 180) <= 10;
                return (
                  <button
                    key={preset.deg}
                    type="button"
                    onClick={() => issueCameraAngle(preset.deg)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums transition-colors ${
                      isNear
                        ? 'bg-[#3EE84B]/20 text-[#3EE84B] border border-[#3EE84B]/50 font-bold'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/15'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Expandable Level-Locked Paint & Wheel Customization Tray with smooth height/opacity transition */}
        <div
          ref={customTrayRef}
          className={`w-full max-w-lg grid transition-all duration-300 ease-out ${
            showCustomTray ? 'grid-rows-[1fr] opacity-100 mb-5' : 'grid-rows-[0fr] opacity-0 mb-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 rounded-2xl bg-[#0F1319] border border-white/15 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">
                  3D 컬러 &amp; 휠 커스터마이징 · 현재 LV.{highestUnlockedLevel} (해금: 컬러 {unlockedPaintCount}/{PAINT_OPTIONS.length} · 휠 {unlockedWheelCount}/{WHEEL_OPTIONS.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomTray(false)}
                  className="text-slate-400 hover:text-white shrink-0 ml-2 transition-colors"
                >
                  닫기
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {PAINT_OPTIONS.map((opt) => {
                  const unlocked = opt.unlockLevel <= highestUnlockedLevel;
                  const active = opt.id === activeStagePaint.id;
                  const isPreview = previewPaint?.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePaintClick(opt)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all duration-200 ease-out active:scale-95 ${
                        active && unlocked
                          ? 'bg-white text-slate-900 border-white font-semibold scale-[1.03]'
                          : isPreview
                            ? 'bg-amber-500/20 text-amber-200 border-amber-400 font-semibold scale-[1.03]'
                            : unlocked
                              ? 'bg-slate-900/80 text-slate-200 border-white/15 hover:border-white/35'
                              : 'bg-slate-950/70 text-slate-400 border-white/10 hover:border-amber-400/50'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/30 shrink-0 transition-transform duration-200"
                        style={{ backgroundColor: opt.bodyHex }}
                      />
                      <span>{opt.name}</span>
                      {!unlocked && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-amber-400">
                          <Lock size={10} aria-hidden="true" />
                          LV.{opt.unlockLevel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {WHEEL_OPTIONS.map((w) => {
                  const unlocked = w.unlockLevel <= highestUnlockedLevel;
                  const active = w.id === activeStageWheel.id;
                  const isPreview = previewWheel?.id === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleWheelClick(w)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-medium border text-left transition-all duration-200 ease-out active:scale-95 ${
                        active && unlocked
                          ? 'bg-[#3EE84B]/20 border-[#3EE84B] text-[#3EE84B] scale-[1.02]'
                          : isPreview
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 scale-[1.02]'
                            : unlocked
                              ? 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/30'
                              : 'bg-slate-950/70 border-white/10 text-slate-400 hover:border-amber-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-bold font-mono tabular-nums">
                        <span>{w.sizeInch}인치</span>
                        {!unlocked && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400">
                            <Lock size={10} aria-hidden="true" />
                            LV.{w.unlockLevel}
                          </span>
                        )}
                      </div>
                      <div className="truncate opacity-85">
                        {w.name.replace(`${w.sizeInch}인치 `, '')}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isPreviewingLocked && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2 text-xs transition-all duration-200">
                  <div className="flex items-center gap-2 text-amber-200 min-w-0">
                    <Eye size={14} className="text-amber-400 shrink-0" aria-hidden="true" />
                    <span>
                      3D 미리보기 중 · 영구 장착은{' '}
                      <strong className="font-mono tabular-nums">
                        LV.
                        {Math.max(
                          previewPaint?.unlockLevel ?? 1,
                          previewWheel?.unlockLevel ?? 1
                        )}
                      </strong>{' '}
                      달성 시 해금됩니다.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEarnDemoExp(600)}
                      className="px-2.5 py-1 rounded-full bg-[#3EE84B] hover:bg-[#33D440] text-[#071809] font-extrabold text-[11px] transition-colors"
                    >
                      +600 EXP로 해금하기
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewPaint(null);
                        setPreviewWheel(null);
                      }}
                      className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] transition-colors"
                    >
                      장착 상태로 복귀
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Headline & Neon-Green Subtitle */}
        <div className="text-center space-y-1.5 max-w-md mx-auto">
          <div className="text-xs font-mono tabular-nums text-slate-300">
            LV.{equippedVehicle.level} · {equippedVehicle.categoryLabel} · {equippedVehicle.powerLabel}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {equippedVehicle.name}
          </h2>
          <p className="text-sm sm:text-base font-bold text-[#3EE84B] font-mono tabular-nums">
            {nextTier
              ? `다음 진화(${nextTier.categoryLabel})까지 ${expToNext.toLocaleString()} EXP`
              : '최고 등급 GT 스포츠카 진화 완료'}
          </p>
        </div>

        {/* Full-Width Signature Lime-Green Pill Evolution Button */}
        <div className="w-full max-w-md mt-5 space-y-2.5">
          <button
            type="button"
            onClick={nextTier ? onEvolveNext : onOpenGarage}
            className="w-full py-3.5 px-6 rounded-full bg-[#3EE84B] hover:bg-[#33D440] text-[#071809] font-extrabold text-sm sm:text-base transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Sparkles size={17} aria-hidden="true" />
            <span>
              {nextTier
                ? canEvolveNow
                  ? `LV.${nextTier.level} ${nextTier.categoryLabel} 진화하기`
                  : `진화하기 · ${nextTier.categoryLabel} (${expToNext.toLocaleString()} EXP 남음)`
                : maxTierUnlocked
                  ? '최고 등급 진화 완료 · 차고 보기'
                  : '진화 차고 열기'}
            </span>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onEarnDemoExp(500)}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={13} className="text-[#3EE84B]" aria-hidden="true" />
              <span>안전운전 보상 테스트 (+500 EXP)</span>
            </button>
            <button
              type="button"
              onClick={onOpenGarage}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-100 transition-colors flex items-center gap-1"
            >
              <span>전체 차종 차고 보기</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sky-Blue Contrast Card */}
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 rounded-2xl bg-[#D8ECFA] text-slate-900 p-5 flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0057B8]">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>플레오스 세이프 패키지</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
            {isResting
              ? '15분 필수 휴식 진행 중 · 곧 보상이 지급됩니다'
              : '안전한 휴식 습관이 차량 등급과 커스텀을 해금합니다'}
          </h3>
          <p className="text-xs text-slate-700">
            레벨업할수록 새로운 차종과 전용 외장 컬러·휠 옵션이 순차적으로 열립니다.
          </p>
          <button
            type="button"
            onClick={onStartRest}
            className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#0057B8] hover:underline focus-visible:outline-none"
          >
            <span>{isResting ? '휴식 케어 현황 보기' : '휴게소 15분 휴식 시작하기'}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="hidden sm:flex flex-col items-end shrink-0 w-36">
          <div className="text-[11px] font-bold text-slate-600 mb-0.5">
            {nextTier ? `NEXT LV.${nextTier.level}` : 'MAX CLASS'}
          </div>
          <div className="w-32 h-16">
            <VehicleIllustration
              bodyType={(nextTier ?? equippedVehicle).bodyType}
              paint={paint}
              wheel={wheel}
              viewAngle="side"
              doorsOpen={false}
              compact
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export const VehicleShowroomStage = React.memo(VehicleShowroomStageInner);

