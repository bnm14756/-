import React from 'react';
import {
  AlertTriangle,
  CloudFog,
  CloudRain,
  CloudSnow,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';
import type { WeatherApiResponse, WeatherCondition } from '../types/driving';

interface WeatherAlertBannerProps {
  weather: WeatherApiResponse | null;
  weatherOverride: WeatherCondition | 'live';
  loadingWeather: boolean;
  onSelectWeatherMode: (mode: WeatherCondition | 'live') => void;
  onRefreshWeather: () => void;
}

const WEATHER_MODE_OPTIONS: { id: WeatherCondition | 'live'; label: string }[] = [
  { id: 'live', label: '실시간 기상' },
  { id: 'clear', label: '맑음' },
  { id: 'rain', label: '비 주의보' },
  { id: 'snow', label: '눈·결빙 경보' },
  { id: 'fog', label: '안개 주의' },
];

export const WeatherAlertBanner: React.FC<WeatherAlertBannerProps> = ({
  weather,
  weatherOverride,
  loadingWeather,
  onSelectWeatherMode,
  onRefreshWeather,
}) => {
  const condition = weather?.condition ?? 'clear';
  const severity = weather?.severity ?? 'normal';

  const WeatherIcon =
    condition === 'snow'
      ? CloudSnow
      : condition === 'rain'
        ? CloudRain
        : condition === 'fog'
          ? CloudFog
          : Sun;

  const containerTone =
    severity === 'warning'
      ? 'bg-[#2A1016] border-red-500/50 text-red-50'
      : severity === 'caution'
        ? 'bg-[#261D0D] border-amber-400/50 text-amber-50'
        : 'bg-[#121822] border-white/10 text-slate-100';

  const iconWrapTone =
    severity === 'warning'
      ? 'bg-red-500/20 text-red-300 border border-red-400/30'
      : severity === 'caution'
        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
        : 'bg-sky-500/15 text-sky-300 border border-sky-400/25';

  const badgeTone =
    severity === 'warning'
      ? 'text-red-300'
      : severity === 'caution'
        ? 'text-amber-300'
        : 'text-[#3EE84B]';

  return (
    <section
      role={severity === 'normal' ? 'region' : 'alert'}
      aria-label="고속도로 실시간 기상 연동 및 안전 주의보"
      className={`rounded-2xl border p-4 sm:p-5 transition-colors space-y-3 ${containerTone}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconWrapTone}`}>
            <WeatherIcon size={22} aria-hidden="true" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`font-extrabold inline-flex items-center gap-1 ${badgeTone}`}>
                {severity !== 'normal' && <AlertTriangle size={13} aria-hidden="true" />}
                <span>{weather?.advisoryTitle ?? '고속도로 기상 정보 수신 중'}</span>
              </span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span className="text-slate-300">{weather?.regionName ?? '경부고속도로'}</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {weather?.advisoryMessage ??
                '실시간 노면 기상 데이터를 불러오고 있습니다.'}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs font-mono tabular-nums text-slate-300">
              <span>기온 {(weather?.temperatureC ?? 12.8).toFixed(1)}°C</span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span>강수 {(weather?.precipitationMm ?? 0).toFixed(1)} mm</span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span className="inline-flex items-center gap-1">
                <Wind size={12} aria-hidden="true" />
                풍속 {(weather?.windSpeedKmh ?? 10.5).toFixed(1)} km/h
              </span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span>가시거리 {(weather?.visibilityKm ?? 15).toFixed(1)} km</span>
              <span aria-hidden="true" className="text-slate-500">
                ·
              </span>
              <span className={`font-bold ${badgeTone}`}>
                권장 안전속도 {weather?.safeSpeedLimitKmh ?? 100} km/h 이하
              </span>
              {(weather?.expBonusPct ?? 0) > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span className="text-[#3EE84B] font-bold">
                    악천후 안전주행 EXP +{weather?.expBonusPct}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshWeather}
          disabled={loadingWeather}
          className="px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 border border-white/15 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shrink-0 min-h-[36px]"
        >
          <RefreshCw size={13} className={loadingWeather ? 'animate-spin' : ''} aria-hidden="true" />
          <span>기상 갱신</span>
        </button>
      </div>

      {/* Weather Simulation Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
        <span className="text-[11px] text-slate-400">
          연동 소스: {weather?.sourceMode === 'open-meteo-live' ? 'Open-Meteo 실시간 위성 기상' : '기상 경보 시뮬레이션'}
        </span>

        <div
          role="group"
          aria-label="기상 조건 테스트 선택"
          className="flex flex-wrap items-center gap-1.5"
        >
          {WEATHER_MODE_OPTIONS.map((opt) => {
            const active = weatherOverride === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectWeatherMode(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                  active
                    ? opt.id === 'snow'
                      ? 'bg-red-500 text-white border-red-400'
                      : opt.id === 'rain' || opt.id === 'fog'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-[#3EE84B] text-[#071809] border-[#3EE84B]'
                    : 'bg-black/25 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
