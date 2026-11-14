import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Check,
  Copy,
  Fuel,
  HandHeart,
  Radio,
  Send,
  Sparkles,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { CorridorNode, CrewMember, FuelTransferLog } from '../types/driving';

interface SocialFuelCrewPanelProps {
  fuelPercent: number;
  crewMembers: CrewMember[];
  transferLogs: FuelTransferLog[];
  nextFuelNode: CorridorNode | undefined;
  distToFuelNodeKm: number;
  sendingToId: string | null;
  requestingFuel: boolean;
  onSendFuel: (member: CrewMember) => void;
  onRequestFuelFromCrew: () => void;
  onAddFriendByInput: (callsignOrCode: string) => Promise<void>;
  onAddFriendById: (member: CrewMember) => Promise<void>;
  onRemoveFriend: (member: CrewMember) => Promise<void>;
  onSimulateLowFuel: (level: number) => void;
  onRefuelAtNearestStation: () => void;
}

const MY_FRIEND_CODE = 'HYN-2026';

export const SocialFuelCrewPanel: React.FC<SocialFuelCrewPanelProps> = ({
  fuelPercent,
  crewMembers,
  transferLogs,
  nextFuelNode,
  distToFuelNodeKm,
  sendingToId,
  requestingFuel,
  onSendFuel,
  onRequestFuelFromCrew,
  onAddFriendByInput,
  onAddFriendById,
  onRemoveFriend,
  onSimulateLowFuel,
  onRefuelAtNearestStation,
}) => {
  const [crewTab, setCrewTab] = useState<'friends' | 'discover'>('friends');
  const [friendInput, setFriendInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const friends = useMemo(() => crewMembers.filter((m) => m.isFriend), [crewMembers]);
  const discoverDrivers = useMemo(() => crewMembers.filter((m) => !m.isFriend), [crewMembers]);

  const isFuelEmpty = fuelPercent <= 0.5;
  const isFuelLow = fuelPercent > 0.5 && fuelPercent <= 20;

  const handleSubmitFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = friendInput.trim();
    if (!trimmed || addingFriend) return;
    setAddingFriend(true);
    try {
      await onAddFriendByInput(trimmed);
      setFriendInput('');
      setCrewTab('friends');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleCopyMyCode = async () => {
    try {
      await navigator.clipboard.writeText(MY_FRIEND_CODE);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    }
  };

  const visibleList = crewTab === 'friends' ? friends : discoverDrivers;

  return (
    <section
      aria-label="연료 게이지 및 친구 추가 기름 보내기"
      className="bg-[#12161C] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Top Fuel Gauge & Zero-Fuel EXP Lock Rule */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Fuel
              size={14}
              className={
                isFuelEmpty ? 'text-red-400' : isFuelLow ? 'text-amber-400' : 'text-[#3EE84B]'
              }
              aria-hidden="true"
            />
            <span>실시간 연료 · 친구 협동 게임 시스템</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-bold ${
                isFuelEmpty
                  ? 'text-red-400'
                  : isFuelLow
                    ? 'text-amber-400'
                    : 'text-[#3EE84B]'
              }`}
            >
              {isFuelEmpty
                ? '연료 고갈 (EXP 획득 중단)'
                : isFuelLow
                  ? '연료 부족 주의'
                  : '주행 에너지 정상 (EXP 획득 가능)'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">
            주유소 자동 충전 &amp; 친구 추가 후 기름 주고받기
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSimulateLowFuel(0)}
            className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-200 text-xs font-semibold min-h-[36px] whitespace-nowrap"
          >
            연료 고갈 테스트 (0%)
          </button>
          <button
            type="button"
            onClick={onRefuelAtNearestStation}
            className="px-3 py-1.5 rounded-lg bg-[#3EE84B]/15 hover:bg-[#3EE84B]/25 border border-[#3EE84B]/40 text-[#3EE84B] text-xs font-bold min-h-[36px] whitespace-nowrap"
          >
            가까운 주유소 급유 ({nextFuelNode?.name.split(' ')[0] ?? '주유소'})
          </button>
        </div>
      </div>

      {/* Fuel Progress Meter & Alert */}
      <div
        className={`p-4 rounded-xl border space-y-3 ${
          isFuelEmpty
            ? 'bg-red-950/35 border-red-500/50'
            : isFuelLow
              ? 'bg-amber-950/30 border-amber-500/40'
              : 'bg-[#0E131A] border-white/10'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-2xl font-extrabold font-mono tabular-nums ${
                isFuelEmpty
                  ? 'text-red-400'
                  : isFuelLow
                    ? 'text-amber-300'
                    : 'text-[#3EE84B]'
              }`}
            >
              {Math.round(fuelPercent)}%
            </span>
            <span className="text-xs text-slate-300">
              {isFuelEmpty
                ? '연료가 0%여서 차량이 경험치(EXP)를 획득할 수 없습니다.'
                : `다음 주유·휴게소(${nextFuelNode?.name ?? '휴게소 주유소'})까지 ${distToFuelNodeKm.toFixed(1)} km`}
            </span>
          </div>

          <button
            type="button"
            onClick={onRequestFuelFromCrew}
            disabled={requestingFuel || friends.length === 0}
            className="px-4 py-2 rounded-full bg-[#0070F3] hover:bg-[#0060D0] text-white text-xs font-extrabold flex items-center gap-1.5 min-h-[38px] disabled:opacity-50 whitespace-nowrap"
          >
            <Radio size={14} aria-hidden="true" />
            <span>{requestingFuel ? '요청 전송 중...' : '친구에게 기름 요청 (+25% 받기)'}</span>
          </button>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
          <div
            className={`h-full transition-[width] duration-300 ${
              isFuelEmpty
                ? 'bg-red-500'
                : isFuelLow
                  ? 'bg-amber-400'
                  : 'bg-[#3EE84B]'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, fuelPercent))}%` }}
          />
        </div>

        {isFuelEmpty && (
          <div className="flex items-center gap-2 text-xs text-red-200 font-semibold pt-0.5">
            <AlertOctagon size={15} className="text-red-400 shrink-0" aria-hidden="true" />
            <span>
              경험치 잠금 상태: 주유소·휴게소를 통과하거나 상단 &apos;친구에게 기름 요청&apos;으로 연료를 채워야 다시 EXP가 누적됩니다.
            </span>
          </div>
        )}
      </div>

      {/* Add Friend Form & My Friend Code Bar */}
      <div className="p-3.5 rounded-xl bg-[#0D1117] border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">내 드라이버 친구 코드</span>
          <span className="font-mono tabular-nums font-bold text-white bg-slate-900 border border-white/10 px-2.5 py-1 rounded-md">
            {MY_FRIEND_CODE}
          </span>
          <button
            type="button"
            onClick={() => void handleCopyMyCode()}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap"
          >
            {copiedCode ? <Check size={12} className="text-[#3EE84B]" /> : <Copy size={12} />}
            <span>{copiedCode ? '복사됨' : '코드 복사'}</span>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmitFriend(e)} className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            value={friendInput}
            onChange={(e) => setFriendInput(e.target.value)}
            placeholder="친구 닉네임 또는 코드 입력 (예: 김현대 / HYN-1190)"
            aria-label="친구 닉네임 또는 친구 코드 입력"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3EE84B]"
          />
          <button
            type="submit"
            disabled={!friendInput.trim() || addingFriend}
            className="px-3.5 py-2 rounded-lg bg-[#3EE84B] hover:bg-[#32D43E] text-[#071809] text-xs font-extrabold inline-flex items-center gap-1.5 min-h-[36px] whitespace-nowrap shrink-0 disabled:opacity-45"
          >
            <UserPlus size={13} aria-hidden="true" />
            <span>{addingFriend ? '추가 중' : '친구 추가'}</span>
          </button>
        </form>
      </div>

      {/* Friends & Discover Drivers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="친구 및 주변 드라이버 목록"
              className="inline-flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-white/10"
            >
              <button
                type="button"
                role="tab"
                aria-selected={crewTab === 'friends'}
                onClick={() => setCrewTab('friends')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                  crewTab === 'friends'
                    ? 'bg-[#3EE84B] text-[#071809]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                내 친구 ({friends.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={crewTab === 'discover'}
                onClick={() => setCrewTab('discover')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                  crewTab === 'discover'
                    ? 'bg-white text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                친구 추가 · 주변 드라이버 ({discoverDrivers.length})
              </button>
            </div>

            <span className="text-xs text-slate-400">
              친구에게 기름 15% 전송 → <strong className="text-[#3EE84B]">+120 EXP</strong>
            </span>
          </div>

          {visibleList.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#0F131A] border border-white/10 text-center space-y-2">
              <Users size={20} className="mx-auto text-slate-400" aria-hidden="true" />
              <div className="text-xs font-semibold text-slate-200">
                {crewTab === 'friends'
                  ? '등록된 친구가 없습니다. 위 입력창이나 주변 드라이버 탭에서 친구를 추가해보세요.'
                  : '주변의 모든 드라이버와 이미 친구입니다.'}
              </div>
              {crewTab === 'friends' && discoverDrivers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCrewTab('discover')}
                  className="px-3 py-1.5 rounded-lg bg-[#3EE84B]/15 border border-[#3EE84B]/40 text-[#3EE84B] text-xs font-bold"
                >
                  주변 드라이버에서 친구 추가하기
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visibleList.map((member) => {
                const canSend =
                  member.isFriend &&
                  fuelPercent >= 20 &&
                  member.fuelPercent < 98 &&
                  sendingToId !== member.id;

                return (
                  <div
                    key={member.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                      member.needsHelp
                        ? 'bg-[#1A1612] border-amber-500/40'
                        : 'bg-[#0F131A] border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                          <span>{member.callsign}</span>
                          <span className="text-[11px] font-mono tabular-nums text-slate-400">
                            LV.{member.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {member.vehicleName} · {member.kmMarker.toFixed(1)} km · {member.friendCode}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-xs font-mono tabular-nums font-bold ${
                            member.fuelPercent <= 20 ? 'text-amber-400' : 'text-[#3EE84B]'
                          }`}
                        >
                          {member.fuelPercent}%
                        </span>
                        {member.isFriend && (
                          <button
                            type="button"
                            onClick={() => void onRemoveFriend(member)}
                            aria-label={`${member.callsign} 친구 삭제`}
                            title="친구 삭제"
                            className="p-1 rounded-md text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          >
                            <UserMinus size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={
                          member.fuelPercent <= 20 ? 'h-full bg-amber-400' : 'h-full bg-[#3EE84B]'
                        }
                        style={{ width: `${member.fuelPercent}%` }}
                      />
                    </div>

                    {member.isFriend ? (
                      <button
                        type="button"
                        onClick={() => onSendFuel(member)}
                        disabled={!canSend}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 min-h-[36px] transition-colors ${
                          canSend
                            ? member.needsHelp
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                            : 'bg-slate-900 text-slate-500 border border-white/5 cursor-not-allowed'
                        }`}
                      >
                        <Send size={12} aria-hidden="true" />
                        <span>
                          {member.fuelPercent >= 98
                            ? '만충 상태'
                            : fuelPercent < 20
                              ? '내 연료 부족 (20% 필요)'
                              : member.needsHelp
                                ? '친구에게 긴급 기름 보내기 (-15%)'
                                : '친구에게 기름 보내기 (-15%)'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          void onAddFriendById(member).then(() => setCrewTab('friends'));
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-[#3EE84B]/15 hover:bg-[#3EE84B]/25 border border-[#3EE84B]/45 text-[#3EE84B] text-xs font-bold flex items-center justify-center gap-1.5 min-h-[36px] transition-colors"
                      >
                        <UserPlus size={12} aria-hidden="true" />
                        <span>친구 추가하고 기름 보내기</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Fuel Exchange Feed */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200 inline-flex items-center gap-1.5">
              <HandHeart size={14} className="text-sky-400" aria-hidden="true" />
              <span>친구 간 실시간 연료 나눔 피드</span>
            </span>
            <span className="font-mono tabular-nums">{transferLogs.length}건</span>
          </div>

          <div className="rounded-xl bg-[#0D1117] border border-white/10 divide-y divide-white/10 max-h-[260px] overflow-y-auto">
            {transferLogs.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center">
                아직 연료 나눔 내역이 없습니다. 친구에게 기름을 보내보세요!
              </div>
            ) : (
              transferLogs.map((log) => (
                <div key={log.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">
                      {log.direction === 'sent'
                        ? `${log.toName}님에게 연료 +${log.amountPct}% 전송`
                        : `${log.fromName}님이 연료 +${log.amountPct}% 선물`}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                      {log.timestamp}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono tabular-nums">
                    {log.direction === 'sent' ? (
                      <span className="text-[#3EE84B] font-bold inline-flex items-center gap-0.5">
                        <Sparkles size={11} aria-hidden="true" />
                        +{log.expBonus} EXP
                      </span>
                    ) : (
                      <span className="text-sky-400 font-bold">+{log.amountPct}% 급유</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
