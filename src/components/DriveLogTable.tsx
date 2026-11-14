import React, { useMemo, useState } from 'react';
import type { DriveLogEntry } from '../types/driving';

interface DriveLogTableProps {
  logs: DriveLogEntry[];
}

export const DriveLogTable: React.FC<DriveLogTableProps> = ({ logs }) => {
  const [typeFilter, setTypeFilter] = useState<'전체' | DriveLogEntry['type']>('전체');

  const filteredLogs = useMemo(() => {
    if (typeFilter === '전체') return logs;
    return logs.filter((entry) => entry.type === typeFilter);
  }, [logs, typeFilter]);

  return (
    <section
      aria-label="운행 및 법정 휴식 준수 이력"
      className="bg-[#111826] border border-slate-800 rounded-xl p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">운행 기록 · Vehicle SDK 로그</div>
          <h2 className="text-lg font-semibold text-slate-100 mt-0.5">
            구간별 주행 및 휴식 준수 내역
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="운행 로그 유형 필터"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800"
        >
          {(
            ['전체', '톨게이트 돌파', '주유 · 충전', '연료 나눔', '휴식 완료', '주행 구간', '안전 경고'] as const
          ).map((tab) => {
            const active = typeFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTypeFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="py-8 text-center border-t border-slate-800/80">
          <p className="text-sm text-slate-300 font-medium">선택한 유형의 운행 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                <th className="py-2.5 pr-4">시각</th>
                <th className="py-2.5 px-4">구간 / 위치</th>
                <th className="py-2.5 px-4">상태 구분</th>
                <th className="py-2.5 px-4 text-right">소요 시간</th>
                <th className="py-2.5 px-4 text-right">이동 거리</th>
                <th className="py-2.5 pl-4 text-right">안전 / EXP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredLogs.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-xs text-slate-400 whitespace-nowrap">
                    {row.timestamp}
                  </td>
                  <td className="py-2.5 px-4 text-slate-200 font-medium">{row.segment}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-xs font-semibold ${
                        row.type === '휴식 완료'
                          ? 'text-emerald-400'
                          : row.type === '톨게이트 돌파'
                            ? 'text-[#3EE84B]'
                            : row.type === '주유 · 충전'
                              ? 'text-sky-400'
                              : row.type === '연료 나눔'
                                ? 'text-cyan-300'
                                : row.type === '안전 경고'
                                  ? 'text-amber-400'
                                  : 'text-blue-400'
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-300 whitespace-nowrap">
                    {row.durationLabel}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-300 whitespace-nowrap">
                    {row.distanceKm > 0 ? `${row.distanceKm.toFixed(1)} km` : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                    <span className="text-slate-300">{row.safetyDelta}</span>
                    <span className="text-slate-600 mx-1">·</span>
                    <span className="text-blue-400 font-semibold">+{row.expEarned} EXP</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
