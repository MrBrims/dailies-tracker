import { App, TFile } from "obsidian";

export class VaultWriter {
  private internalWritePaths = new Set<string>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  isInternalWrite(path: string): boolean {
    return this.internalWritePaths.has(path);
  }

  clearInternalWrite(path: string): void {
    this.internalWritePaths.delete(path);
  }

  async read(app: App, path: string): Promise<string | null> {
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return null;
    }
    return app.vault.read(file);
  }

  async write(app: App, path: string, content: string): Promise<void> {
    this.internalWritePaths.add(path);
    try {
      const existing = app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFile) {
        await app.vault.modify(existing, content);
      } else {
        const parts = path.split("/");
        if (parts.length > 1) {
          await app.vault.createFolder(parts.slice(0, -1).join("/")).catch(() => undefined);
        }
        await app.vault.create(path, content);
      }
    } finally {
      setTimeout(() => this.clearInternalWrite(path), 500);
    }
  }

  debounce(key: string, fn: () => Promise<void>, delayMs = 300): void {
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        void fn();
      }, delayMs)
    );
  }
}
