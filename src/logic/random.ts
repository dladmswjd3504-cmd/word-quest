/** 0 이상 1 미만의 난수를 돌려주는 함수. 테스트에서는 시드 고정 난수를 넣는다. */
export type Rng = () => number;

/** 시드 고정 난수 (mulberry32). 같은 시드면 항상 같은 결과 → 테스트·재현용 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** 가중치에 비례해 중복 없이 count개를 뽑는다. 가중치가 0 이하인 항목은 뽑지 않는다. */
export function sampleWeighted<T>(items: readonly T[], count: number, weight: (item: T) => number, rng: Rng): T[] {
  const pool = items.map((item) => ({ item, w: Math.max(0, weight(item)) })).filter((x) => x.w > 0);
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = rng() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r < 0) {
        idx = i;
        break;
      }
    }
    picked.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return picked;
}
