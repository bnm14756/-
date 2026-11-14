import React from 'react';
import { CloudRain, Coffee, Flag, Fuel, Minimize2, Pause, Play, Zap } from 'lucide-react';
import type {
  CorridorNode,
  SongTrack,
  VehicleTierSpec,
  WeatherApiResponse,
} from '../types/driving';
import { formatDrivingDuration } from './RestCarePanel';

interface FloatingNavWidgetProps {
  equippedVehicle: VehicleTierSpec;
  totalExp: number;
  fuelPercent: number;
  weather: WeatherApiResponse | null;
  continuousTime: number;
  isResting: boolean;
  restTimer: number;
  nextNode: CorridorNode | undefined;
  distToNextKm: number;
  activeTrack: SongTrack | undefined;
  isPlaying: boolean;
  onStartRest: () => void;
  onPassNextTollgate: () => void;
  onTogglePlay: () => void;
  onClose: () => void;
}

export const FloatingNavWidget: React.FC<FloatingNavWidgetProps> = ({
  equippedVehicle,
  totalExp,
  fuelPercent,
  weather,
  continuousTime,
  isResting,
  restTimer,
  nextNode,
  distToNextKm,
  activeTrack,
  isPlaying,
  onStartRest,
  onPassNextTollgate,
  onTogglePlay,
  onClose,
}) => {
  const needsRestSoon = continuousTime >= 6600;
  const isFuelEmpty = fuelPercent <= 0.5;

  return (
    <aside
      aria-label="내비게이션 사이드 미니 창"
      className="fixed bottom-20 lg:bottom-5 left-4 z-40 w-[310px] rounded-2xl bg-[#131820]/95 backdrop-blur-md border border-white/20 shadow-2xl p-3.5 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-mono tabular-nums font-bold text-[#3EE84B]">
            CarPlay 사이드 미니 창 · LV.{equippedVehicle.level} ({totalExp.toLocaleString()} EXP)
          </div>
          <div className="text-xs font-bold text-white truncate">{equippedVehicle.name}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="미니 창 닫기"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
        >
          <Minimize2 size={14} />
        </button>
      </div>

      {/* Weather + Fuel Alert Row */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/10 text-[11px] font-mono tabular-nums">
        <span
          className={`inline-flex items-center gap-1 font-bold ${
            isFuelEmpty
              ? 'text-red-400'
              : fuelPercent <= 20
                ? 'text-amber-400'
                : 'text-[#3EE84B]'
          }`}
        >
          <Fuel size={11} aria-hidden="true" />
          <span>연료 {Math.round(fuelPercent)}%</span>
        </span>
        <span
          className={`inline-flex items-center gap-1 truncate ${
            weather?.severity === 'warning'
              ? 'text-red-300 font-bold'
              : weather?.severity === 'caution'
                ? 'text-amber-300 font-bold'
                : 'text-slate-300'
          }`}
        >
          <CloudRain size={11} aria-hidden="true" />
          <span>{weather?.label ?? '맑음'}</span>
        </span>
      </div>

      {/* Rest + Next Tollgate Compact Row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
          <div className="text-[10px] text-slate-400">연속 주행 / 휴식</div>
          <div
            className={`font-mono tabular-nums font-bold text-xs mt-0.5 ${
              isResting ? 'text-blue-400' : needsRestSoon ? 'text-amber-400' : 'text-[#3EE84B]'
            }`}
          >
            {isResting
              ? `휴식 ${Math.floor(restTimer / 60)}:${String(restTimer % 60).padStart(2, '0')}`
              : formatDrivingDuration(continuousTime)}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-black/40 border border-white/10">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Flag size={10} className="text-[#3EE84B]" aria-hidden="true" />
            <span className="truncate">{nextNode?.name.split(' ')[0] ?? '톨게이트'}</span>
          </div>
          <div className="font-mono tabular-nums font-bold text-xs text-white mt-0.5">
            {distToNextKm.toFixed(1)} km · +{nextNode?.rewardExp ?? 200}
          </div>
        </div>
      </div>

      {/* Quick Actions + Mini Music */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onStartRest}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809] text-[11px] font-extrabold flex items-center justify-center gap-1 min-h-[34px]"
        >
          <Coffee size={12} aria-hidden="true" />
          <span>15분 휴식</span>
        </button>
        <button
          type="button"
          onClick={onPassNextTollgate}
          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-white/10 flex items-center gap-1 min-h-[34px]"
        >
          <Zap size={12} className="text-[#3EE84B]" aria-hidden="true" />
          <span>TG 돌파</span>
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? '음악 일시정지' : '음악 재생'}
          title={activeTrack ? `${activeTrack.title} - ${activeTrack.artist}` : '음악'}
          className="w-8 h-[34px] rounded-lg bg-white text-slate-900 flex items-center justify-center shrink-0"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>
    </aside>
  );
};
