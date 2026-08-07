const PREFIX = 'simplest-fuckn-todo:collapsed:';

export function loadCollapsed(boardId: string): Set<string> {
  const raw = localStorage.getItem(PREFIX + boardId);
  if (raw === null) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function saveCollapsed(boardId: string, listIds: Set<string>): void {
  const key = PREFIX + boardId;
  if (listIds.size === 0) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify([...listIds]));
}
