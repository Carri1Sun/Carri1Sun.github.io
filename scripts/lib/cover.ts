/** 书封配置：枚举或可部署的图片地址。 */
export const coverPresets = ['orbit', 'frames', 'steps', 'rays'] as const;
export type CoverPreset = typeof coverPresets[number];
export type PostCover = { preset: CoverPreset; image?: string };

export function parseCover(value: unknown): PostCover {
  if (value == null || value === '') return { preset: 'orbit' };
  // 数字是枚举的简写：0 轨道、1 矩形、2 阶梯、3 放射线。
  const raw = String(value).trim();
  const preset = coverPresets.find((name, index) => raw === name || raw === String(index));
  if (preset) return { preset };
  if (typeof value !== 'string') throw new Error('cover 必须是封面枚举或图片路径');
  if (raw === '') return { preset: 'orbit' };
  if (/^https:\/\//i.test(raw)) {
    const url = new URL(raw);
    if (url.username || url.password) throw new Error('cover 图片地址不能包含登录凭据');
    return { preset: 'orbit', image: url.href };
  }
  // 相对 assets 路径转为站点根路径，避免在 /archives/ 下请求错误地址。
  const local = raw.startsWith('assets/') ? `/${raw}` : raw;
  if (local.startsWith('/assets/') && !/[\\?#]/.test(local)) {
    const decoded = decodeURIComponent(local);
    if (decoded.split('/').some(part => part === '.' || part === '..') || /[\\?#]/.test(decoded)) {
      throw new Error('cover 本地图片必须位于 assets 目录内');
    }
    return { preset: 'orbit', image: encodeURI(decoded) };
  }
  throw new Error('cover 请使用 orbit / frames / steps / rays（或 0–3）、/assets/covers/图片名或 HTTPS 图片地址');
}
