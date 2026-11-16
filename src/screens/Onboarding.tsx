import { useState } from 'react';
import { Mascot } from '../components/Mascot.tsx';
import { Button, Notice, SpeechBubble } from '../components/ui.tsx';
import { gameConfig } from '../config/gameConfig.ts';
import { isIOS, isStandalone } from '../lib/inAppBrowser.ts';
import { useInstallPrompt } from '../lib/installPrompt.ts';
import { speak, useTtsStatus } from '../lib/tts.ts';
import { ADJECTIVES, ANIMALS, formatNickname, normalizeNumberInput, randomNicknameIndexes } from '../logic/nickname.ts';
import { createInitialSave } from '../storage/save.ts';
import { requestPersistentStorage } from '../storage/storage.ts';
import type { Course, SaveData } from '../types.ts';
import s from './screens.module.css';

type Step = 'welcome' | 'nickname' | 'number' | 'course' | 'sound';
const STEPS: Step[] = ['welcome', 'nickname', 'number', 'course', 'sound'];

/** 최초 접속: 인사 → 닉네임 → 출석번호 → 과정 → 소리 확인 → 바로 Day 1 (PRD 3.1) */
export function Onboarding({ onDone }: { onDone: (save: SaveData) => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [nick, setNick] = useState(() => randomNicknameIndexes(Math.random));
  const [numberText, setNumberText] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [silent, setSilent] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const tts = useTtsStatus();
  const install = useInstallPrompt();

  const attendanceNo = Number(numberText);
  const numberValid = /^\d+$/.test(numberText) && attendanceNo >= 1 && attendanceNo <= gameConfig.attendanceNoMax;
  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1]);
  const back = () => setStep(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]);

  const finish = () => {
    if (!course || !numberValid) return;
    const save = createInitialSave({ nickname: formatNickname(nick.adj, nick.animal), attendanceNo, course });
    save.settings.silentMode = silent;
    void requestPersistentStorage();
    onDone(save);
  };

  return (
    <main className={`${s.page} ${s.full}`}>
      <div className={s.stepDots} aria-label={`${STEPS.indexOf(step) + 1} / ${STEPS.length} 단계`}>
        {STEPS.map((st) => (
          <span key={st} className={`${s.dot} ${st === step ? s.dotOn : ''}`} />
        ))}
      </div>

      {step === 'welcome' && (
        <>
          <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
            <Mascot size={170} mood="cheer" bounce />
            <h1 className={s.title}>Welcome to Word Quest!</h1>
            <SpeechBubble>
              안녕! 나는 <b>{gameConfig.mascotName}</b>야.
              <br />
              매일 단어 10개로 함께 모험을 떠나자! 🗺️
            </SpeechBubble>
          </div>
          <Button block onClick={next}>
            모험 시작하기
          </Button>
        </>
      )}

      {step === 'nickname' && (
        <>
          <h1 className={s.title}>내 모험가 이름을 골라 줘</h1>
          <div className={s.nicknamePreview} aria-live="polite">
            {formatNickname(nick.adj, nick.animal)}
          </div>
          <Button variant="secondary" block onClick={() => setNick(randomNicknameIndexes(Math.random))}>
            🎲 랜덤 뽑기
          </Button>
          <label className={s.selectLabel}>
            꾸미는 말
            <select className={s.select} value={nick.adj} onChange={(e) => setNick({ ...nick, adj: Number(e.target.value) })}>
              {ADJECTIVES.map((a, i) => (
                <option key={a.en} value={i}>
                  {a.en} {a.ko}
                </option>
              ))}
            </select>
          </label>
          <label className={s.selectLabel}>
            동물
            <select className={s.select} value={nick.animal} onChange={(e) => setNick({ ...nick, animal: Number(e.target.value) })}>
              {ANIMALS.map((a, i) => (
                <option key={a} value={i}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <div className={s.spacer} />
          <Button block onClick={next}>
            이 이름으로 할래!
          </Button>
          <Button variant="ghost" onClick={back}>
            뒤로
          </Button>
        </>
      )}

      {step === 'number' && (
        <>
          <h1 className={s.title}>출석번호를 알려 줘</h1>
          <p className={s.lead}>선생님만 볼 수 있어요. 친구들에게는 보이지 않아요.</p>
          <input
            className={s.input}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={`1 ~ ${gameConfig.attendanceNoMax}`}
            value={numberText}
            onChange={(e) => setNumberText(normalizeNumberInput(e.target.value))}
            aria-label="출석번호"
            autoFocus
          />
          {numberText !== '' && !numberValid && (
            <p className={s.error} role="alert">
              1부터 {gameConfig.attendanceNoMax} 사이 숫자를 입력해 줘!
            </p>
          )}
          <div className={s.spacer} />
          <Button block onClick={next} disabled={!numberValid}>
            다음
          </Button>
          <Button variant="ghost" onClick={back}>
            뒤로
          </Button>
        </>
      )}

      {step === 'course' && (
        <>
          <h1 className={s.title}>어떤 과정으로 모험할까?</h1>
          <div className={s.choiceGrid}>
            {(
              [
                ['middle', '🏫', '중학교'],
                ['high', '🎓', '고등학교'],
              ] as const
            ).map(([value, emoji, label]) => (
              <button
                key={value}
                type="button"
                className={`${s.choice} ${course === value ? s.choiceOn : ''}`}
                onClick={() => setCourse(value)}
                aria-pressed={course === value}
              >
                <span className={s.choiceEmoji} aria-hidden>
                  {emoji}
                </span>
                {label}
                {course === value && <span aria-hidden>✔</span>}
              </button>
            ))}
          </div>
          <p className={s.muted}>나중에 설정에서 바꿀 수 있어요. 기록은 과정별로 따로 저장돼요.</p>
          <div className={s.spacer} />
          <Button block onClick={next} disabled={!course}>
            다음
          </Button>
          <Button variant="ghost" onClick={back}>
            뒤로
          </Button>
        </>
      )}

      {step === 'sound' && (
        <>
          <div className={s.mascotRow}>
            <Mascot size={90} />
            <SpeechBubble tail="left">🎧 이어폰을 연결해 주세요! 발음을 들으면서 외우면 훨씬 잘 외워져.</SpeechBubble>
          </div>

          <Button
            variant="secondary"
            block
            disabled={silent}
            onClick={() => {
              speak('Welcome to Word Quest!');
              setPreviewed(true);
            }}
          >
            🔊 소리 미리듣기
          </Button>
          {tts === 'unavailable' && (
            <Notice>
              이 기기에서는 영어 발음을 들을 수 없어요. 아래 <b>소리 없이 하기</b>를 켜면 글자 힌트로 진행할 수 있어요.
            </Notice>
          )}
          {previewed && tts !== 'unavailable' && <p className={s.muted}>소리가 안 들리면 무음 모드와 볼륨을 확인해 줘.</p>}

          <label className={s.toggleRow}>
            소리 없이 하기 (이어폰이 없을 때)
            <input type="checkbox" checked={silent} onChange={(e) => setSilent(e.target.checked)} />
          </label>

          {!isStandalone() && (
            <Notice icon="📲">
              <b>홈 화면에 추가</b>하면 앱처럼 열리고, 인터넷이 끊겨도 할 수 있어요. 기록도 더 안전하게 지켜져요.
              {install ? (
                <div style={{ marginTop: 8 }}>
                  <Button variant="mint" onClick={() => void install()}>
                    홈 화면에 추가하기
                  </Button>
                </div>
              ) : isIOS() ? (
                <ol className={s.tipList}>
                  <li>
                    Safari 아래쪽 <b>공유 버튼(□↑)</b>을 누르고
                  </li>
                  <li>
                    <b>홈 화면에 추가</b>를 눌러 주세요.
                  </li>
                </ol>
              ) : (
                <ol className={s.tipList}>
                  <li>
                    Chrome 오른쪽 위 <b>⋮ 메뉴</b>를 누르고
                  </li>
                  <li>
                    <b>홈 화면에 추가</b>(또는 앱 설치)를 눌러 주세요.
                  </li>
                </ol>
              )}
            </Notice>
          )}

          <div className={s.spacer} />
          <Button block onClick={finish}>
            Day 1 시작! 🚀
          </Button>
          <Button variant="ghost" onClick={back}>
            뒤로
          </Button>
        </>
      )}
    </main>
  );
}
