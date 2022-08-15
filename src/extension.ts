// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Client, File, Json, Vscode } from './type';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "svg-viewer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('svg-viewer.helloWorld', async() => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const a = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**')
		// vscode.window.showInformationMessage(a.join('\n'));
		vscode.window.showInformationMessage(JSON.stringify(a));
	}));
	const panel = vscode.window.createWebviewPanel(
		'catCodint',
		'Cat Coding',
		vscode.ViewColumn.One,
		{
			enableScripts: true
		}
	)
	const client: Client = {
		handleWindowOnload: function(data) {
			panel.webview.postMessage(data)
		}
	}
	context.subscriptions.push(vscode.commands.registerCommand('svg-viewer.helloWorld2', async() => {
		panel.webview.onDidReceiveMessage(async(message) => {
			if (message.type === 'drag.end' || message.type === 'resize.end') {
				const json = await getJson()
				const folders = vscode.workspace.workspaceFolders;
				if (!folders) {
					return
				}
				const folderUri = folders[0].uri
				const fileUri = folderUri.with({ path: path.posix.join(folderUri.path, 'svg-viewer.json') });
				json[message.path] = message
				const writeData = Buffer.from(JSON.stringify(json), 'utf8');
				await vscode.workspace.fs.writeFile(fileUri, writeData);
				return
			}
			if (message.type === 'window.onload') {
				client.handleWindowOnload({
					json: await getJson(),
					type: 'window.onload.response'
				})
				return 
			}
		}, undefined, context.subscriptions)
		
		const fileUris = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**')
		const files = fileUris.map(fileUri => {
			if (!fileUri.path.endsWith(".svg")) return

			const webViewUri = panel.webview.asWebviewUri(vscode.Uri.file(fileUri.path))
			return {
				webViewUriString: webViewUri.toString(),
				webViewUri,
			}
		}).filter((a): a is File => a !== undefined)
		// https://file%2B.vscode-resource.vscode-cdn.net/Users/kajiri/Documents/logo.svg

		console.log(panel.webview.asWebviewUri(vscode.Uri.file(process.env.WORKSPACE_FOLDER || "")).toString())
		panel.webview.html = `
		<div id="app" />
		<script>
		const files = ${JSON.stringify(files)};
		</script>
		<script src="https://file%2B.vscode-resource.vscode-cdn.net/Users/kajiri/ghq/github.com/kajirikajiri/vscode-extension-svg-viewer/out/hoge.js"></script>
		`
		// 		<script src="${panel.webview.asWebviewUri(vscode.Uri.file(process.env.WORKSPACE_FOLDER || ""))}/out/hoge.js"></script>

		
	}))
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('hello')
}

const getJson = async() => {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders) {
		return {}
	}
	const folderUri = folders[0].uri
	const fileUri = folderUri.with({ path: path.posix.join(folderUri.path, 'svg-viewer.json') });
	let readData: Uint8Array;
	try {
		readData = await vscode.workspace.fs.readFile(fileUri);
	} catch (e) {
		readData = new TextEncoder().encode('{}');
	}
	const readStr = Buffer.from(readData).toString('utf8');
	const json: Json = JSON.parse(readStr);
	return json
}
