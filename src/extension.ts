import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  createDefaultProfile,
  exportCss,
  GradientProfile,
  normalizeProfile
} from './model';
import { installSimpleRagExtension, SimpleRagExtensionInstallResult } from './simplerag';

type StudioView = 'studio' | 'assignments' | 'preview';

const PROFILE_KEY = 'simpleGradient.profile.v1';
const viewTitles: Record<StudioView, string> = {
  studio: 'SimpleGradient Studio',
  assignments: 'Gradient Assignments',
  preview: 'Gradient Preview'
};

class GradientStudioController implements vscode.Disposable {
  private readonly panels = new Map<StudioView, vscode.WebviewPanel>();
  private readonly disposables: vscode.Disposable[] = [];
  private profile: GradientProfile;
  private statusBar: vscode.StatusBarItem;
  private simpleRagInstall: Promise<SimpleRagExtensionInstallResult> | undefined;
  private viewWebview: vscode.Webview | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.profile = normalizeProfile(context.globalState.get(PROFILE_KEY) ?? createDefaultProfile());
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 48);
    this.statusBar.text = '$(symbol-color) Gradient Studio';
    this.statusBar.tooltip = 'Open SimpleGradient Studio';
    this.statusBar.command = 'simpleGradient.openStudio';
    this.statusBar.show();
    this.disposables.push(this.statusBar);
  }

  open(view: StudioView, column?: vscode.ViewColumn): void {
    const existing = this.panels.get(view);
    if (existing) {
      existing.reveal(column ?? existing.viewColumn, true);
      this.sendState(existing.webview);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      `simpleGradient.${view}`,
      viewTitles[view],
      { viewColumn: column ?? vscode.ViewColumn.One, preserveFocus: false },
      { ...this.webviewOptions(), retainContextWhenHidden: true }
    );
    this.panels.set(view, panel);
    panel.iconPath = undefined;
    panel.webview.html = this.renderHtml(panel.webview, view);
    panel.onDidDispose(() => this.panels.delete(view), undefined, this.disposables);
    panel.webview.onDidReceiveMessage((message) => void this.handleMessage(panel.webview, message), undefined, this.disposables);
  }

  registerView(view: vscode.WebviewView): void {
    view.webview.options = this.webviewOptions();
    view.webview.html = this.renderHtml(view.webview, 'studio');
    this.viewWebview = view.webview;
    view.webview.onDidReceiveMessage((message) => void this.handleMessage(view.webview, message), undefined, this.disposables);
    view.onDidDispose(() => {
      if (this.viewWebview === view.webview) {
        this.viewWebview = undefined;
      }
    }, undefined, this.disposables);
    this.sendState(view.webview);
  }

  private webviewOptions(): vscode.WebviewOptions {
    return {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist')
      ]
    };
  }

  async importProfile(): Promise<void> {
    const [uri] = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { 'Gradient profile': ['json'] },
      openLabel: 'Import profile'
    }) ?? [];
    if (!uri) {
      return;
    }
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      this.profile = normalizeProfile(JSON.parse(Buffer.from(bytes).toString('utf8')));
      await this.persistAndBroadcast();
      void vscode.window.showInformationMessage(`Imported gradient profile “${this.profile.name}”.`);
    } catch (error) {
      void vscode.window.showErrorMessage(`Could not import gradient profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exportProfile(format: 'json' | 'css' = 'json'): Promise<void> {
    const extension = format === 'css' ? 'css' : 'json';
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(this.context.globalStorageUri.fsPath, `simple-gradient-profile.${extension}`)),
      filters: format === 'css' ? { CSS: ['css'] } : { 'Gradient profile': ['json'] },
      saveLabel: `Export ${format.toUpperCase()}`
    });
    if (!uri) {
      return;
    }
    const content = format === 'css' ? exportCss(this.profile) : `${JSON.stringify(this.profile, null, 2)}\n`;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    void vscode.window.showInformationMessage(`Exported ${format.toUpperCase()} to ${path.basename(uri.fsPath)}.`);
  }

  async installSimpleRag(): Promise<void> {
    if (this.simpleRagInstall) {
      void vscode.window.showInformationMessage('SimpleGradient is already updating the SimpleRAG extension.');
      return;
    }
    await this.persistAndBroadcast();
    const version = String(this.context.extension.packageJSON.version || '').trim();
    const packageRoot = vscode.Uri.joinPath(this.context.extensionUri, 'simplerag-extension').fsPath;
    const install = Promise.resolve(vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Installing SimpleGradient into SimpleRAG',
        cancellable: false
      },
      () => installSimpleRagExtension({
        packageRoot,
        expectedVersion: version,
        profile: this.profile
      })
    ));
    this.simpleRagInstall = install;
    try {
      const result = await install;
      const action = result.packageCopied || result.registryUpdated ? 'installed' : 'verified';
      const message = `SimpleGradient ${result.version} was ${action} for SimpleRAG. Reload an open SimpleRAG window to apply this profile.`;
      this.statusBar.text = '$(pass-filled) Gradient → SimpleRAG';
      this.statusBar.tooltip = `SimpleGradient ${result.version} is installed in SimpleRAG`;
      this.broadcastSimpleRagIntegration(true, message);
      void vscode.window.showInformationMessage(message);
    } catch (error) {
      const message = `Could not install SimpleGradient into SimpleRAG: ${error instanceof Error ? error.message : String(error)}`;
      this.broadcastSimpleRagIntegration(false, message);
      void vscode.window.showErrorMessage(message);
    } finally {
      this.simpleRagInstall = undefined;
    }
  }

  private async handleMessage(webview: vscode.Webview, message: unknown): Promise<void> {
    if (!message || typeof message !== 'object') {
      return;
    }
    const payload = message as Record<string, unknown>;
    switch (payload.type) {
      case 'ready':
        this.sendState(webview);
        break;
      case 'updateProfile':
        this.profile = normalizeProfile(payload.profile);
        await this.persistAndBroadcast();
        break;
      case 'openView':
        if (payload.view === 'assignments' || payload.view === 'preview' || payload.view === 'studio') {
          this.open(payload.view, vscode.ViewColumn.Beside);
        }
        break;
      case 'save':
        await this.persistAndBroadcast();
        void vscode.window.showInformationMessage('Gradient profile saved.');
        break;
      case 'installSimpleRag':
        this.profile = normalizeProfile(payload.profile ?? this.profile);
        await this.installSimpleRag();
        break;
      case 'reset':
        this.profile = createDefaultProfile();
        await this.persistAndBroadcast();
        break;
      case 'import':
        await this.importProfile();
        break;
      case 'export':
        await this.exportProfile(payload.format === 'css' ? 'css' : 'json');
        break;
      case 'copy':
        if (typeof payload.text === 'string') {
          await vscode.env.clipboard.writeText(payload.text);
          void vscode.window.showInformationMessage('Copied gradient output to the clipboard.');
        }
        break;
    }
  }

  private async persistAndBroadcast(): Promise<void> {
    await this.context.globalState.update(PROFILE_KEY, this.profile);
    for (const panel of this.panels.values()) {
      this.sendState(panel.webview);
    }
    if (this.viewWebview) {
      this.sendState(this.viewWebview);
    }
  }

  private sendState(webview: vscode.Webview): void {
    void webview.postMessage({ type: 'state', profile: this.profile });
  }

  private broadcastSimpleRagIntegration(installed: boolean, message: string): void {
    for (const panel of this.panels.values()) {
      void panel.webview.postMessage({ type: 'simpleRagIntegration', installed, message });
    }
    if (this.viewWebview) {
      void this.viewWebview.postMessage({ type: 'simpleRagIntegration', installed, message });
    }
  }

  private renderHtml(webview: vscode.Webview, view: StudioView): string {
    const templatePath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'studio.html').fsPath;
    const template = fs.readFileSync(templatePath, 'utf8');
    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'studio.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'studio.js'));
    const codiconUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));
    return template
      .replaceAll('{{view}}', view)
      .replaceAll('{{cspSource}}', webview.cspSource)
      .replaceAll('{{nonce}}', nonce)
      .replaceAll('{{cssUri}}', cssUri.toString())
      .replaceAll('{{scriptUri}}', scriptUri.toString())
      .replaceAll('{{codiconUri}}', codiconUri.toString());
  }

  dispose(): void {
    for (const panel of this.panels.values()) {
      panel.dispose();
    }
    this.panels.clear();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}

function getNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let index = 0; index < 32; index += 1) {
    value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return value;
}

export function activate(context: vscode.ExtensionContext): void {
  const controller = new GradientStudioController(context);
  context.subscriptions.push(
    controller,
    vscode.window.registerWebviewViewProvider('simpleGradient.studioView', {
      resolveWebviewView: (view) => controller.registerView(view)
    }, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand('simpleGradient.openStudio', () => controller.open('studio')),
    vscode.commands.registerCommand('simpleGradient.openAssignments', () => controller.open('assignments')),
    vscode.commands.registerCommand('simpleGradient.openPreview', () => controller.open('preview')),
    vscode.commands.registerCommand('simpleGradient.importProfile', () => controller.importProfile()),
    vscode.commands.registerCommand('simpleGradient.exportProfile', () => controller.exportProfile('json')),
    vscode.commands.registerCommand('simpleGradient.installSimpleRag', () => controller.installSimpleRag()),
    vscode.window.registerUriHandler({
      handleUri: (uri) => {
        const requested = uri.path.replace(/^\//, '');
        controller.open(requested === 'assignments' || requested === 'preview' ? requested : 'studio');
      }
    })
  );
}

export function deactivate(): void { }
