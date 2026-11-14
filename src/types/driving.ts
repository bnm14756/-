export type WorkspaceTab = 'showroom' | 'carplay' | 'habits' | 'rest' | 'garage' | 'music' | 'logs';

export type ParticipantRole = '운전자' | '동승자';

export type VehicleViewAngle = 'front' | 'three-quarter' | 'side';

export type VehicleBodyType =
  | 'compact-hatch'
  | 'smart-sedan'
  | 'compact-suv'
  | 'flagship-suv'
  | 'luxury-sedan'
  | 'gt-sports';

export interface VehicleTierSpec {
  level: number;
  code: string;
  bodyType: VehicleBodyType;
  categoryLabel: string;
  name: string;
  subtitle: string;
  requiredTotalExp: number;
  lengthMm: number;
  powerLabel: string;
  safetyBonus: string;
}

export interface PaintOption {
  id: string;
  name: string;
  bodyHex: string;
  highlightHex: string;
  shadowHex: string;
  unlockLevel: number;
}

export interface WheelOption {
  id: string;
  name: string;
  sizeInch: number;
  spokeStyle: 'aero' | 'machined' | 'mesh' | 'carbon';
  unlockLevel: number;
}

export interface SongTrack {
  id: number;
  title: string;
  artist: string;
  duration: string;
  genre: string;
  pickedBy: ParticipantRole;
  votes: number;
  userVoted?: boolean;
}

export interface RestAreaOption {
  id: string;
  name: string;
  highway: string;
  distanceKm: number;
  evChargersAvailable: number;
  sleepLounge: boolean;
}

export interface VehicleQuest {
  id: string;
  title: string;
  description: string;
  rewardExp: number;
  progress: number;
  target: number;
  unit: string;
  completed: boolean;
}

export interface DriveLogEntry {
  id: string;
  timestamp: string;
  segment: string;
  type: '휴식 완료' | '주행 구간' | '안전 경고' | '톨게이트 돌파' | '주유 · 충전' | '연료 나눔';
  durationLabel: string;
  distanceKm: number;
  safetyDelta: string;
  expEarned: number;
}

export interface ToastNotice {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'warning' | 'info';
}

export type CongestionLevel = '원활' | '서행' | '정체';

export interface CorridorNode {
  id: string;
  name: string;
  kind: 'tollgate' | 'junction' | 'rest-area' | 'gas-station';
  kmMarker: number;
  baseSpeedKmh: number;
  liveSpeedKmh: number;
  congestion: CongestionLevel;
  aadt: number;
  congestionIndex: number;
  rewardExp: number;
  fuelBonusPct?: number;
  subtitle: string;
}

export interface CorridorApiResponse {
  corridorName: string;
  updatedAt: string;
  sourceMode: 'ktdb-live-api' | 'ktdb-corridor-model';
  sourceLabel: string;
  ktdbPortalUrl: string;
  avgSpeedKmh: number;
  avgAadt: number;
  nodes: CorridorNode[];
}

export type WeatherCondition = 'clear' | 'rain' | 'snow' | 'fog';
export type WeatherSeverity = 'normal' | 'caution' | 'warning';

export interface WeatherApiResponse {
  condition: WeatherCondition;
  label: string;
  regionName: string;
  temperatureC: number;
  windSpeedKmh: number;
  precipitationMm: number;
  visibilityKm: number;
  severity: WeatherSeverity;
  advisoryTitle: string;
  advisoryMessage: string;
  safeSpeedLimitKmh: number;
  expBonusPct: number;
  fuelMultiplier: number;
  sourceMode: 'open-meteo-live' | 'simulation';
  updatedAt: string;
}

export interface CrewMember {
  id: string;
  callsign: string;
  vehicleName: string;
  level: number;
  kmMarker: number;
  fuelPercent: number;
  needsHelp: boolean;
}

export interface FuelTransferLog {
  id: string;
  fromName: string;
  toName: string;
  amountPct: number;
  expBonus: number;
  timestamp: string;
  direction: 'sent' | 'received';
}

export interface DailySafetyMetric {
  day: string;
  dateLabel: string;
  safetyScore: number;
  prevWeekScore: number;
  harshAccel: number;
  harshBrake: number;
  distanceKm: number;
  restCompliant: boolean;
  isToday?: boolean;
}
