import m from './mission.module.css';

/**
 * 🔇 소리 없이 하기 켜기/끄기 (PRD 4.2). 이어폰이 없을 때 글자 힌트로 같은 미션을 끝낼 수 있다.
 * 영어 음성이 없는 기기에서는 항상 소리 없이 진행되므로 끌 수 없다.
 */
export function SilentToggle({
  silent,
  disabled,
  onChange,
}: {
  silent: boolean;
  disabled?: boolean;
  onChange: (silent: boolean) => void;
}) {
  const on = silent || !!disabled;
  return (
    <button
      type="button"
      className={m.toggle}
      aria-pressed={on}
      disabled={disabled}
      onClick={() => onChange(!silent)}
    >
      <span aria-hidden>{on ? '🔇' : '🔈'}</span>
      소리 없이 하기 <b>{on ? '켜짐' : '꺼짐'}</b>
      {disabled && <span className={m.toggleNote}>(이 기기는 영어 음성이 없어요)</span>}
    </button>
  );
}
