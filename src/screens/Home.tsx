import { Mascot } from '../components/Mascot.tsx';
import { Button, Card, Notice, ProgressBar, SpeechBubble } from '../components/ui.tsx';
import { gameConfig } from '../config/gameConfig.ts';
import { getLastDay, getWordsOfDay } from '../data/words.ts';
import { bossKindOf } from '../logic/boss.ts';
import { localDateString } from '../logic/date.ts';
import { getActiveMission, startMission, STEP_LABELS } from '../logic/mission.ts';
import { needsBackupReminder, weakWords, type PracticeKind } from '../logic/practice.ts';
import { getDayStatus } from '../logic/progress.ts';
import { levelProgress } from '../logic/xp.ts';
import { useSave } from '../state/GameContext.tsx';
import { useWords } from '../state/useWords.ts';
import h from './Home.module.css';
import s from './screens.module.css';

/** 🏠 홈 (오늘의 모험) */
export function Home({
  onOpenMission,
  onOpenSettings,
  onOpenPractice,
}: {
  onOpenMission: () => void;
  onOpenSettings: () => void;
  onOpenPractice: (kind: PracticeKind) => void;
}) {
  const { save, update, persistent, saveFailed } = useSave();
  const course = save.settings.course;
  const words = useWords(course);
  const today = localDateString();
  const progress = save.progress[course];
  const lp = levelProgress(save.player.xp);
  const active = getActiveMission(save, course, today);

  const lastDay = words ? getLastDay(words) : 0;
  const status = words ? getDayStatus(progress, today, lastDay) : null;
  const weakCount = words ? weakWords(words, progress).length : 0;

  const start = (day: number) => {
    if (!words) return;
    update((sv) => startMission(sv, { course, day, dayWords: getWordsOfDay(words, day), today, rng: Math.random }));
    onOpenMission();
  };

  return (
    <div className={s.page}>
      <header className={h.header}>
        <div>
          <div className={h.nickname}>{save.profile.nickname}</div>
          <div className={s.muted}>{course === 'middle' ? '🏫 중학교 과정' : '🎓 고등학교 과정'}</div>
        </div>
        <button type="button" className={h.gear} onClick={onOpenSettings} aria-label="설정">
          ⚙️
        </button>
      </header>

      {!persistent && <Notice>이 브라우저에서는 기록이 저장되지 않아요. 시크릿 모드라면 일반 창으로 열어 주세요.</Notice>}
      {saveFailed && <Notice>저장 공간이 부족해서 기록을 저장하지 못했어요.</Notice>}
      {needsBackupReminder(save, today) && (
        <Notice icon="💾">
          기록을 지키려면 가끔 백업 코드를 만들어 두자!{' '}
          <button type="button" className={h.linkButton} onClick={onOpenSettings}>
            설정에서 백업하기
          </button>
        </Notice>
      )}

      <div className={s.mascotRow}>
        <Mascot size={110} bounce mood={status?.kind === 'clearedToday' ? 'cheer' : 'happy'} />
        <SpeechBubble tail="left">{greeting(status?.kind, !!active)}</SpeechBubble>
      </div>

      <Card className={h.quest}>
        {!status ? (
          <p className={s.muted}>모험 지도를 펼치는 중…</p>
        ) : active ? (
          <>
            <div className={h.questTitle}>Day {active.day} 모험 중!</div>
            <p className={s.muted}>지금 단계: {STEP_LABELS[active.step]}</p>
            <Button block onClick={onOpenMission}>
              ▶ 이어하기
            </Button>
          </>
        ) : status.kind === 'ready' ? (
          <>
            <div className={h.questTitle}>오늘의 모험: Day {status.day}</div>
            <p className={s.muted}>⏱ 약 7분 · 단어 {gameConfig.wordsPerDay}개</p>
            {bossKindOf(status.day) && (
              <p className={h.bossTag}>⚔️ 오늘은 {bossKindOf(status.day) === 'final' ? '최종' : '중간'} 보스가 나타나는 날!</p>
            )}
            <Button block onClick={() => start(status.day)}>
              🚀 모험 시작
            </Button>
          </>
        ) : status.kind === 'clearedToday' ? (
          <>
            <div className={h.questTitle}>오늘은 클리어 완료! 🎉</div>
            <p className={s.muted}>
              {status.nextDay > lastDay
                ? `준비된 Day ${lastDay}까지 모두 끝냈어! 새 단어가 곧 도착해요.`
                : `내일 Day ${status.nextDay}에서 만나!`}
            </p>
          </>
        ) : (
          <>
            <div className={h.questTitle}>다음 모험 준비 중! 🛠️</div>
            <p className={s.muted}>Day {status.lastDay}까지 모두 끝냈어. 새 단어가 곧 도착해요!</p>
          </>
        )}
      </Card>

      {status && !active && status.kind !== 'ready' && (
        <Card className={h.practice}>
          <div className={h.practiceTitle}>🎮 복습 게임</div>
          <p className={s.muted} style={{ margin: 0 }}>
            경험치는 없지만, 할수록 단어 숙련도가 올라가요!
          </p>
          <Button block variant="mint" onClick={() => onOpenPractice('review')}>
            🔁 배운 단어 복습하기
          </Button>
          {weakCount > 0 && (
            <Button block variant="secondary" onClick={() => onOpenPractice('weak')}>
              ⚔️ 약점 단어 정복하기 ({weakCount}개)
            </Button>
          )}
        </Card>
      )}

      <div className={h.stats}>
        <Stat label="레벨" value={`Lv ${lp.level}`} />
        <Stat label="총 출석" value={`${save.player.totalAttendanceDays}일`} />
        <Stat label="진도" value={`Day ${progress.completedDays.length}${lastDay ? `/${lastDay}` : ''}`} />
        <Stat label="골드" value={`${save.player.gold}`} />
      </div>

      <div className={s.stack}>
        <div className={h.xpLabel}>
          <span>경험치</span>
          <span>{lp.isMax ? 'MAX' : `${lp.current} / ${lp.needed}`}</span>
        </div>
        <ProgressBar value={lp.isMax ? 1 : lp.current} max={lp.isMax ? 1 : lp.needed} label="경험치" />
      </div>
    </div>
  );
}

function greeting(kind: string | undefined, active: boolean): string {
  if (active) return '하던 모험이 기다리고 있어! 이어서 해 볼까?';
  if (kind === 'clearedToday') return '오늘 정말 잘했어! 내일도 같이 모험하자 ✨';
  if (kind === 'allDone') return '준비된 모험을 모두 끝냈어. 정말 대단해!';
  return 'Good morning! 오늘도 단어 10개 정복하러 가자!';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={h.stat}>
      <div className={h.statValue}>{value}</div>
      <div className={h.statLabel}>{label}</div>
    </div>
  );
}
