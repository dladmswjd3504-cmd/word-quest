import type { SaveData } from '../types.ts';
import { migrateSave } from './migrate.ts';

/**
 * 백업 코드 (PRD 7.4): SaveData → JSON → 압축 → Base64(URL-safe) 문자열.
 * - `WQ1-` : deflate 압축 (CompressionStream 지원 브라우저)
 * - `WQ0-` : 압축 없음 (구형 브라우저 대비)
 * 불러올 때는 구조를 검증하고, 잘못된 코드는 이유와 함께 거절한다.
 */
const PREFIX_DEFLATE = 'WQ1-';
const PREFIX_PLAIN = 'WQ0-';
const MAX_CODE_LENGTH = 2_000_000;

export type DecodeResult =
  | { ok: true; save: SaveData }
  | { ok: false; reason: 'empty' | 'format' | 'unsupported' | 'corrupt' | 'invalid' };

/** 거절 이유별 안내 문구 */
export const DECODE_ERROR_MESSAGES: Record<Exclude<DecodeResult, { ok: true }>['reason'], string> = {
  empty: '백업 코드를 붙여넣어 주세요.',
  format: '워드 퀘스트 백업 코드가 아니에요. 처음부터 끝까지 빠짐없이 복사했는지 확인해 주세요.',
  unsupported: '이 브라우저에서는 이 백업 코드를 열 수 없어요. 최신 Chrome이나 Safari에서 시도해 주세요.',
  corrupt: '백업 코드가 손상되었어요. 다시 복사해서 붙여넣어 주세요.',
  invalid: '백업 코드 안의 기록이 올바르지 않아요.',
};

export async function encodeBackup(save: SaveData): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(save));
  if (typeof CompressionStream !== 'undefined') {
    try {
      const compressed = await transform(bytes, new CompressionStream('deflate'));
      return PREFIX_DEFLATE + toBase64Url(compressed);
    } catch {
      /* 압축 실패 시 압축 없이 */
    }
  }
  return PREFIX_PLAIN + toBase64Url(bytes);
}

export async function decodeBackup(code: string): Promise<DecodeResult> {
  // 메신저·메모장을 거치며 들어간 공백/줄바꿈은 무시한다.
  const cleaned = code.replace(/\s+/g, '');
  if (!cleaned) return { ok: false, reason: 'empty' };
  if (cleaned.length > MAX_CODE_LENGTH) return { ok: false, reason: 'format' };

  const compressed = cleaned.startsWith(PREFIX_DEFLATE);
  if (!compressed && !cleaned.startsWith(PREFIX_PLAIN)) return { ok: false, reason: 'format' };

  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(cleaned.slice(PREFIX_DEFLATE.length));
  } catch {
    return { ok: false, reason: 'format' };
  }

  if (compressed) {
    if (typeof DecompressionStream === 'undefined') return { ok: false, reason: 'unsupported' };
    try {
      bytes = await transform(bytes, new DecompressionStream('deflate'));
    } catch {
      return { ok: false, reason: 'corrupt' };
    }
  }

  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, reason: 'corrupt' };
  }

  const save = migrateSave(data);
  return save ? { ok: true, save } : { ok: false, reason: 'invalid' };
}

async function transform(input: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const body = new Blob([input as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('invalid base64');
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
