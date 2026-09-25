import {
  MarkdownView,
  normalizePath,
  Plugin,
  TFile,
  WorkspaceLeaf,
} from "obsidian";

export const TABLE_READING_OPEN_STATE = { mode: "preview" as const };

const leafLastNonTableViewState = new WeakMap<
  WorkspaceLeaf,
  Record<string, unknown>
>();

export function isTablePath(
  filePath: string | null | undefined,
  tablePath: string
): boolean {
  if (!filePath) {
    return false;
  }
  return normalizePath(filePath) === normalizePath(tablePath);
}

function viewStatesDiffer(
  current: Record<string, unknown>,
  saved: Record<string, unknown>
): boolean {
  if (current.mode !== saved.mode) {
    return true;
  }
  if (current.mode === "source" && current.source !== saved.source) {
    return true;
  }
  return false;
}

function rememberNonTableViewState(
  leaf: WorkspaceLeaf,
  view: MarkdownView,
  tablePath: string
): void {
  if (!view.file || isTablePath(view.file.path, tablePath)) {
    return;
  }
  leafLastNonTableViewState.set(leaf, {
    ...(view.getState() as Record<string, unknown>),
  });
}

function restoreNonTableViewStateIfNeeded(
  leaf: WorkspaceLeaf,
  view: MarkdownView,
  tablePath: string
): void {
  if (!view.file || isTablePath(view.file.path, tablePath)) {
    return;
  }

  const saved = leafLastNonTableViewState.get(leaf);
  if (!saved) {
    return;
  }

  const current = view.getState() as Record<string, unknown>;
  if (!viewStatesDiffer(current, saved)) {
    return;
  }

  if (current.mode === "preview" && saved.mode !== "preview") {
    void view.setState({ ...saved }, { history: false });
    return;
  }

  if (
    current.mode === "source" &&
    saved.mode === "source" &&
    current.source !== saved.source
  ) {
    void view.setState({ ...saved }, { history: false });
  }
}

export function ensureTableReadingView(
  view: MarkdownView,
  tablePath: string
): void {
  if (!isTablePath(view.file?.path, tablePath)) {
    return;
  }

  const state = view.getState() as Record<string, unknown>;
  if (state.mode === "preview") {
    return;
  }

  void view.setState({ ...state, mode: "preview" }, { history: false });
}

function handleMarkdownLeaf(
  leaf: WorkspaceLeaf,
  tablePath: string
): void {
  const view = leaf.view;
  if (!(view instanceof MarkdownView)) {
    return;
  }

  if (isTablePath(view.file?.path, tablePath)) {
    ensureTableReadingView(view, tablePath);
    return;
  }

  restoreNonTableViewStateIfNeeded(leaf, view, tablePath);
  rememberNonTableViewState(leaf, view, tablePath);
}

function scheduleHandleMarkdownLeaf(
  leaf: WorkspaceLeaf,
  tablePath: string
): void {
  window.requestAnimationFrame(() => {
    handleMarkdownLeaf(leaf, tablePath);
  });
}

function ensureReadingViewOnLeaf(
  leaf: WorkspaceLeaf | null,
  tablePath: string
): void {
  if (!leaf) {
    return;
  }
  scheduleHandleMarkdownLeaf(leaf, tablePath);
}

export function registerTableReadingView(
  plugin: Plugin,
  getTablePath: () => string
): void {
  plugin.registerEvent(
    plugin.app.workspace.on("active-leaf-change", (leaf) => {
      ensureReadingViewOnLeaf(leaf, getTablePath());
    })
  );

  plugin.registerEvent(
    plugin.app.workspace.on("file-open", (file) => {
      if (!file) {
        return;
      }
      const tablePath = getTablePath();
      if (isTablePath(file.path, tablePath)) {
        for (const leaf of plugin.app.workspace.getLeavesOfType("markdown")) {
          ensureReadingViewOnLeaf(leaf, tablePath);
        }
        return;
      }

      ensureReadingViewOnLeaf(plugin.app.workspace.activeLeaf, tablePath);
    })
  );
}

export async function openTableFileInReadingView(
  leaf: WorkspaceLeaf,
  file: TFile,
  tablePath: string
): Promise<void> {
  const view = leaf.view;
  if (view instanceof MarkdownView) {
    rememberNonTableViewState(leaf, view, tablePath);
  }

  await leaf.openFile(file, { state: TABLE_READING_OPEN_STATE });
  const openedView = leaf.view;
  if (openedView instanceof MarkdownView) {
    scheduleHandleMarkdownLeaf(leaf, tablePath);
  }
}
