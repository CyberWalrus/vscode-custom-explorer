import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const provider = new CustomTreeDataProvider();
  vscode.window.registerTreeDataProvider('customExplorer', provider);

  vscode.commands.registerCommand('customExplorer.openFile', (resource) => openResource(resource));
  vscode.commands.registerCommand('customExplorer.refresh', () => provider.refresh());
}

export function deactivate() {}

function openResource(resource: vscode.Uri): void {
  vscode.window.showTextDocument(resource);
}

class CustomTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem | undefined): Thenable<TreeItem[]> {
    if (!element) {
      return Promise.resolve(this.getWorkspaceFiles());
    }
    return Promise.resolve(element.children);
  }

  private async getWorkspaceFiles(): Promise<TreeItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      const rootPath = workspaceFolders[0].uri.fsPath;
      const items = await this.getFilesInFolder(rootPath);
      return items;
    }
    return [];
  }

  private async getFilesInFolder(path: string): Promise<TreeItem[]> {
    const items: TreeItem[] = [];
    const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(path));
    for (const [entry, type] of entries) {
      const uri = vscode.Uri.joinPath(vscode.Uri.file(path), entry);
      if (type === vscode.FileType.Directory) {
        const children = await this.getFilesInFolder(uri.fsPath);
        items.push(new TreeItem(uri, vscode.TreeItemCollapsibleState.Collapsed, children, type));
      } else if (type === vscode.FileType.File) {
        items.push(new TreeItem(uri, vscode.TreeItemCollapsibleState.None, [], type));
      }
    }
    return items.sort((a, b) => this.customSort(a.uri.fsPath, b.uri.fsPath));
  }

  private customSort(a: string, b: string): number {
    const indexRegEx = /index\.ts$/;
    const aIndex = indexRegEx.test(a) ? -1 : 0;
    const bIndex = indexRegEx.test(b) ? -1 : 0;
    if (aIndex !== bIndex) {return aIndex - bIndex;}
    return a.localeCompare(b);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children: TreeItem[] = [],
    type: vscode.FileType
  ) {
    super(uri, collapsibleState);

    this.label = uri.path.split('/').pop();
    this.command = type === vscode.FileType.File ? {
      command: 'customExplorer.openFile',
      title: 'Open File',
      arguments: [uri],
    } : undefined;
    this.contextValue = type === vscode.FileType.Directory ? 'folder' : 'file';
  }
}