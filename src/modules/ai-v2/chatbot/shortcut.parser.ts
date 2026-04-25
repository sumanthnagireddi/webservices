import { Injectable } from '@nestjs/common';
import { SHORTCUTS, ShortcutValue } from './shortcut.constants';

export interface ShortcutPayload {
  isShortcut: boolean;
  command: ShortcutValue | null;
  args: string;
  raw: string;
}

@Injectable()
export class ShortcutParser {
  parse(message: string): ShortcutPayload {
    const trimmed = message.trim();

    const matched = (Object.values(SHORTCUTS) as ShortcutValue[]).find((cmd) =>
      trimmed.toLowerCase().startsWith(cmd),
    );

    if (!matched) {
      return { isShortcut: false, command: null, args: trimmed, raw: message };
    }

    const args = trimmed.slice(matched.length).trim();
    return { isShortcut: true, command: matched, args, raw: message };
  }
}
