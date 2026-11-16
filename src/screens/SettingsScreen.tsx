import { useState } from 'react';
import { Button, Card, Notice } from '../components/ui.tsx';
import { playSfx } from '../lib/sfx.ts';
import { speak, useTtsStatus } from '../lib/tts.ts';
import { localDateString } from '../logic/date.ts';
import { switchCourse } from '../logic/practice.ts';
import { useSave } from '../state/GameContext.tsx';
import { decodeBackup, DECODE_ERROR_MESSAGES, encodeBackup } from '../storage/backup.ts';
import type { Course, SaveData, Settings } from '../types.ts';
import s from './screens.module.css';
import t from './tabs.module.css';

const COURSE_NAME: Record<Course, string> = { middle: '중학교', high: '고등학교' };

/** ⚙️ 설정 (PRD 4.7): 소리·글자 크기·과정 변경·백업 코드·기록 초기화 */
export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { save, update } = useSave();
  const tts = useTtsStatus();
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    update((sv) => ({ ...sv, settings: { ...sv.settings, [key]: value } }));
  const { settings } = save;

  return (
    <div className={s.page}>
      <div className={t.header}>
        <button type="button" className={t.back} onClick={onBack} aria-label="홈으로 돌아가기">
          ◀
        </button>
        <h1 className={s.title}>⚙️ 설정</h1>
      </div>

      <Card>
        <div className={t.section}>
          <h2 className={t.sectionTitle}>🔊 소리</h2>
          <SwitchRow
            label="효과음"
            checked={settings.sfx}
            onChange={(v) => {
              set('sfx', v);
              if (v) playSfx('correct');
            }}
          />
          <div className={t.settingRow}>
            <span className={t.settingLabel}>발음 속도</span>
            <Segmented
              label="발음 속도"
              value={settings.ttsRate}
              options={[
                ['normal', '보통'],
                ['slow', '천천히'],
              ]}
              onChange={(v) => {
                set('ttsRate', v);
                if (!settings.silentMode) speak('Hello, word quest!', v);
              }}
            />
          </div>
          <SwitchRow
            label="소리 없이 하기"
            hint="이어폰이 없을 때 발음 대신 글자 힌트로 풀어요"
            checked={settings.silentMode || tts === 'unavailable'}
            disabled={tts === 'unavailable'}
            onChange={(v) => set('silentMode', v)}
          />
          {tts === 'unavailable' && <p className={s.muted}>이 기기에서는 영어 발음을 들을 수 없어서 항상 글자 힌트로 진행해요.</p>}
        </div>
      </Card>

      <Card>
        <div className={t.section}>
          <h2 className={t.sectionTitle}>🔤 화면</h2>
          <div className={t.settingRow}>
            <span className={t.settingLabel}>글자 크기</span>
            <Segmented
              label="글자 크기"
              value={settings.fontSize}
              options={[
                ['normal', '보통'],
                ['large', '크게'],
              ]}
              onChange={(v) => set('fontSize', v)}
            />
          </div>
        </div>
      </Card>

      <CourseSection />
      <BackupSection />
      <ResetSection />

      <p className={s.muted} style={{ textAlign: 'center' }}>
        내 이름: {save.profile.nickname}
      </p>
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={t.settingRow}>
      <span>
        <span className={t.settingLabel}>{label}</span>
        {hint && (
          <>
            <br />
            <span className={s.muted}>{hint}</span>
          </>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label} ${checked ? '켜짐' : '꺼짐'}`}
        className={t.switch}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

function Segmented<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: [V, string][];
  onChange: (v: V) => void;
}) {
  return (
    <div className={t.seg} role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** 과정 변경 (PRD 4.9): 진도·약점·도감은 과정별로 따로, 레벨·캐릭터는 그대로 */
function CourseSection() {
  const { save, update } = useSave();
  const [asking, setAsking] = useState(false);
  const current = save.settings.course;
  const other: Course = current === 'middle' ? 'high' : 'middle';
  const today = localDateString();
  const missionInProgress = save.currentMission?.course === current && save.currentMission.date === today;

  return (
    <Card>
      <div className={t.section}>
        <h2 className={t.sectionTitle}>🎒 과정</h2>
        <p className={s.lead} style={{ margin: 0 }}>
          지금: <b>{current === 'middle' ? '🏫' : '🎓'} {COURSE_NAME[current]} 과정</b> · Day {save.progress[current].completedDays.length} 완료
        </p>
        {asking ? (
          <div className={t.confirm} role="alertdialog" aria-label="과정 변경 확인">
            <b>{COURSE_NAME[other]} 과정으로 바꿀까요? 기록은 따로 저장돼요.</b>
            <span className={s.muted}>레벨·경험치·골드·칭호는 그대로예요. 언제든 다시 바꿀 수 있어요.</span>
            {missionInProgress && (
              <span className={t.danger}>지금 하던 오늘의 모험은 처음부터 다시 해야 할 수 있어요.</span>
            )}
            <div className={t.buttonRow}>
              <Button
                onClick={() => {
                  update((sv) => switchCourse(sv, other));
                  setAsking(false);
                }}
              >
                바꾸기
              </Button>
              <Button variant="secondary" onClick={() => setAsking(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAsking(true)}>
            {other === 'middle' ? '🏫' : '🎓'} {COURSE_NAME[other]}로 바꾸기
          </Button>
        )}
      </div>
    </Card>
  );
}

/** 기록 백업 코드 만들기(복사) / 불러오기(붙여넣기) (PRD 7.4) */
function BackupSection() {
  const { save, update, replace } = useSave();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const today = localDateString();
    const next = { ...save, lastBackupDate: today };
    setCode(await encodeBackup(next));
    update((sv) => ({ ...sv, lastBackupDate: today }));
    setCopied(false);
    setBusy(false);
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // 복사가 막힌 브라우저: 직접 길게 눌러 복사하도록 안내
      setCopied(false);
      setError(null);
    }
  };

  const check = async () => {
    setBusy(true);
    setRestored(false);
    const r = await decodeBackup(input);
    setBusy(false);
    if (!r.ok) {
      setError(DECODE_ERROR_MESSAGES[r.reason]);
      setPending(null);
      return;
    }
    setError(null);
    setPending(r.save);
  };

  return (
    <Card>
      <div className={t.section}>
        <h2 className={t.sectionTitle}>💾 기록 지키기 (백업)</h2>
        <Notice>
          브라우저 기록을 지우거나 휴대폰을 바꾸면 기록이 사라질 수 있어요. 가끔 <b>백업 코드</b>를 만들어 메모장 등에 보관해 주세요.
        </Notice>
        <p className={s.muted} style={{ margin: 0 }}>
          마지막 백업: {save.lastBackupDate ?? '아직 없어요'}
        </p>

        <Button variant="mint" onClick={() => void create()} disabled={busy}>
          📦 백업 코드 만들기
        </Button>
        {code && (
          <>
            <textarea
              className={t.code}
              readOnly
              value={code}
              aria-label="내 백업 코드"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? '✔ 복사했어요!' : '📋 복사하기'}
            </Button>
            <p className={`${s.muted} ${t.danger}`} style={{ margin: 0 }}>
              🔒 백업 코드에는 내 이름과 출석번호가 들어 있어요. 친구에게 보여 주거나 공유하지 마세요!
            </p>
            {!copied && <p className={s.muted} style={{ margin: 0 }}>복사가 안 되면 코드 칸을 길게 눌러 전체 선택 후 복사해 주세요.</p>}
          </>
        )}

        <h3 className={t.sectionTitle} style={{ fontSize: '0.95rem' }}>
          📥 백업 코드로 불러오기
        </h3>
        <textarea
          className={t.code}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
            setPending(null);
          }}
          placeholder="WQ1- 로 시작하는 백업 코드를 붙여넣어 주세요"
          aria-label="불러올 백업 코드"
          autoComplete="off"
          spellCheck={false}
        />
        {error && (
          <p className={t.danger} role="alert" style={{ margin: 0 }}>
            ✖ {error}
          </p>
        )}
        {restored && (
          <p className={t.ok} role="status" style={{ margin: 0 }}>
            ✔ 기록을 불러왔어요!
          </p>
        )}
        {pending ? (
          <div className={t.confirm} role="alertdialog" aria-label="기록 불러오기 확인">
            <b>지금 기록이 백업 코드의 기록으로 바뀌어요. 계속할까요?</b>
            <span className={s.muted}>
              백업 속 기록: {pending.profile.nickname} · Lv {pending.player.level} · 중 Day {pending.progress.middle.completedDays.length} / 고 Day{' '}
              {pending.progress.high.completedDays.length}
            </span>
            <div className={t.buttonRow}>
              <Button
                onClick={() => {
                  replace(pending);
                  setPending(null);
                  setInput('');
                  setRestored(true);
                }}
              >
                불러오기
              </Button>
              <Button variant="secondary" onClick={() => setPending(null)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => void check()} disabled={busy || !input.trim()}>
            불러오기
          </Button>
        )}
      </div>
    </Card>
  );
}

/** 기록 초기화 (이중 확인) */
function ResetSection() {
  const { reset } = useSave();
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  return (
    <Card>
      <div className={t.section}>
        <h2 className={t.sectionTitle}>🧹 기록 초기화</h2>
        {stage === 0 && (
          <Button variant="ghost" className={t.danger} onClick={() => setStage(1)}>
            모든 기록 지우기
          </Button>
        )}
        {stage === 1 && (
          <div className={t.confirm} role="alertdialog" aria-label="기록 초기화 확인">
            <b>정말 지울까요?</b>
            <span>레벨, 경험치, 단어 기록, 칭호가 <b>모두</b> 사라져요. 백업 코드가 없으면 되돌릴 수 없어요.</span>
            <div className={t.buttonRow}>
              <Button variant="secondary" onClick={() => setStage(2)}>
                네, 지울래요
              </Button>
              <Button onClick={() => setStage(0)}>아니요</Button>
            </div>
          </div>
        )}
        {stage === 2 && (
          <div className={t.confirm} role="alertdialog" aria-label="기록 초기화 마지막 확인">
            <b className={t.danger}>마지막 확인! 정말로 모든 기록을 지울까요?</b>
            <div className={t.buttonRow}>
              <Button variant="secondary" onClick={reset}>
                모두 지우기
              </Button>
              <Button onClick={() => setStage(0)}>취소</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
