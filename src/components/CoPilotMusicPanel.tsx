import React, { useMemo, useState } from 'react';
import {
  Music,
  Pause,
  Play,
  Plus,
  Search,
  SkipForward,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { GENRE_MIXES } from '../data/initialData';
import type { ParticipantRole, SongTrack } from '../types/driving';

interface CoPilotMusicPanelProps {
  passengerConnected: boolean;
  onTogglePassenger: () => void;
  currentGenre: string;
  onSelectGenre: (genre: string) => void;
  playlist: SongTrack[];
  activeTrackId: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectTrack: (trackId: number) => void;
  onNextTrack: () => void;
  onVoteTrack: (trackId: number) => void;
  onAddTrack: (title: string, artist: string, pickedBy: ParticipantRole) => void;
}

export const CoPilotMusicPanel: React.FC<CoPilotMusicPanelProps> = ({
  passengerConnected,
  onTogglePassenger,
  currentGenre,
  onSelectGenre,
  playlist,
  activeTrackId,
  isPlaying,
  onTogglePlay,
  onSelectTrack,
  onNextTrack,
  onVoteTrack,
  onAddTrack,
}) => {
  const [roleFilter, setRoleFilter] = useState<'전체' | ParticipantRole>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newRole, setNewRole] = useState<ParticipantRole>('동승자');

  const activeTrack =
    playlist.find((track) => track.id === activeTrackId) ?? playlist[0];

  const sortedAndFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...playlist]
      .filter((song) => {
        const matchesRole = roleFilter === '전체' || song.pickedBy === roleFilter;
        const matchesQuery =
          !q ||
          song.title.toLowerCase().includes(q) ||
          song.artist.toLowerCase().includes(q);
        return matchesRole && matchesQuery;
      })
      .sort((a, b) => b.votes - a.votes);
  }, [playlist, roleFilter, searchQuery]);

  const handleCycleGenre = () => {
    const currentIndex = GENRE_MIXES.indexOf(currentGenre as (typeof GENRE_MIXES)[number]);
    const nextIndex = (currentIndex + 1) % GENRE_MIXES.length;
    onSelectGenre(GENRE_MIXES[nextIndex]);
  };

  const handleCreateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArtist.trim()) return;
    onAddTrack(newTitle.trim(), newArtist.trim(), passengerConnected ? newRole : '운전자');
    setNewTitle('');
    setNewArtist('');
    setShowAddForm(false);
  };

  return (
    <section
      aria-label="동승자 공동 뮤직 플레이리스트"
      className="bg-[#111826] border border-slate-800 rounded-xl p-6 space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users size={14} className="text-blue-400" aria-hidden="true" />
            <span>동승자 공동 선곡 (Co-Pilot Audio)</span>
            <span aria-hidden="true">·</span>
            <span>{passengerConnected ? '동승자 기기 연동됨' : '운전자 단독 재생 중'}</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            운전자 + 동승자 실시간 추천 플레이리스트
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePassenger}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors min-h-[40px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              passengerConnected
                ? 'bg-blue-600/15 border-blue-500/50 text-blue-300 hover:bg-blue-600/25'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {passengerConnected ? '동승자 연동 해제' : '+ 동승자 기기 연결'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 min-h-[40px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus size={14} aria-hidden="true" />
            <span>곡 신청</span>
          </button>
        </div>
      </div>

      {/* Active Now-Playing Bar (Separated by hairline, not nested card) */}
      <div className="border-y border-slate-800/80 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
            <Music size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 truncate">
              현재 믹스: <span className="text-blue-400 font-medium">{currentGenre}</span>
            </div>
            {activeTrack ? (
              <div className="text-sm font-semibold text-slate-100 truncate mt-0.5">
                {activeTrack.title} — {activeTrack.artist}
                <span className="text-xs font-normal text-slate-400 ml-2 font-mono tabular-nums">
                  {activeTrack.duration}
                </span>
              </div>
            ) : (
              <div className="text-sm text-slate-400">재생 중인 곡 없음</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCycleGenre}
            className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors min-h-[40px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            분위기 믹스 변경
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? '재생 일시정지' : '재생 시작'}
            className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            onClick={onNextTrack}
            aria-label="다음 곡 재생"
            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>

      {/* Optional Add Track Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateTrack}
          className="border-b border-slate-800/80 pb-4 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
        >
          <div className="sm:col-span-4">
            <label htmlFor="song-title-input" className="block text-xs text-slate-400 mb-1">
              곡 제목
            </label>
            <input
              id="song-title-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="예: Hype Boy"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 min-h-[40px]"
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="song-artist-input" className="block text-xs text-slate-400 mb-1">
              아티스트
            </label>
            <input
              id="song-artist-input"
              type="text"
              value={newArtist}
              onChange={(e) => setNewArtist(e.target.value)}
              placeholder="예: NewJeans"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 min-h-[40px]"
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="song-role-select" className="block text-xs text-slate-400 mb-1">
              신청자
            </label>
            <select
              id="song-role-select"
              value={passengerConnected ? newRole : '운전자'}
              disabled={!passengerConnected}
              onChange={(e) => setNewRole(e.target.value as ParticipantRole)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 min-h-[40px] disabled:opacity-60"
            >
              <option value="동승자">동승자 신청</option>
              <option value="운전자">운전자 신청</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg min-h-[40px] whitespace-nowrap transition-colors"
            >
              목록에 추가
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="선곡자 필터"
          className="inline-flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800"
        >
          {(['전체', '동승자', '운전자'] as const).map((tab) => {
            const active = roleFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRoleFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === '전체' ? '전체 목록' : `${tab} 신청`}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="곡명 또는 아티스트 검색"
            aria-label="플레이리스트 검색"
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 min-h-[36px]"
          />
        </div>
      </div>

      {/* Ranked Playlist Table / List */}
      {sortedAndFiltered.length === 0 ? (
        <div className="py-8 text-center space-y-2 border-t border-slate-800/80">
          <p className="text-sm text-slate-300 font-medium">조건에 맞는 곡이 없습니다.</p>
          <p className="text-xs text-slate-500">
            검색어를 지우거나 새로운 곡을 신청해 플레이리스트를 채워보세요.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/70">
          {sortedAndFiltered.map((song, idx) => {
            const isCurrent = activeTrack?.id === song.id;
            return (
              <div
                key={song.id}
                className={`flex items-center justify-between gap-3 py-2.5 px-2 rounded-lg transition-colors ${
                  isCurrent ? 'bg-blue-600/10' : 'hover:bg-slate-900/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTrack(song.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  <span
                    className={`w-6 text-center text-xs font-mono tabular-nums font-semibold shrink-0 ${
                      isCurrent ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        isCurrent ? 'text-blue-300' : 'text-slate-100'
                      }`}
                    >
                      {song.title}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {song.artist} · {song.pickedBy} 신청 ·{' '}
                      <span className="font-mono tabular-nums">{song.duration}</span>
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono tabular-nums text-slate-300">
                    {song.votes}표
                  </span>
                  <button
                    type="button"
                    onClick={() => onVoteTrack(song.id)}
                    aria-pressed={Boolean(song.userVoted)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 min-h-[36px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      song.userVoted
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <ThumbsUp size={13} aria-hidden="true" />
                    <span>{song.userVoted ? '추천됨' : '추천'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
