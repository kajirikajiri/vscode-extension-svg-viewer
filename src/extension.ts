// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import { TextEncoder } from 'util';
import * as vscode from 'vscode';

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
	context.subscriptions.push(vscode.commands.registerCommand('svg-viewer.helloWorld2', async() => {
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
			const json: {[x:string]: {
				left: number,
				top: number,
				width: number,
				height: number,
				path: string,
			}} = JSON.parse(readStr);
			return json
		}
		
		const panel = vscode.window.createWebviewPanel(
			'catCodint',
			'Cat Coding',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		)
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
				const json = await getJson()
				panel.webview.postMessage({
					type: "window.onload.response",
					json,
				})
				return 
			}
		}, undefined, context.subscriptions)
		
		const fileUris = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**')
		const svgList = fileUris.map(fileUri => {
			if (!fileUri.path.endsWith(".svg")) return

			const webViewUri = panel.webview.asWebviewUri(vscode.Uri.file(fileUri.path))
			return `<div data-path="${webViewUri.path}" class="resize-drag"><img src="${webViewUri}"/></div>`
		}).filter((a): a is string => a !== undefined)

		panel.webview.html = svgList.join('') + `
		<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>
		<script>
		window.addEventListener('message', (event) => {
            const message = event.data; // The JSON data our extension sent

            switch (message.type) {
                case 'window.onload.response':
					const json = message.json;
					document.querySelectorAll('.resize-drag').forEach(function (e) {
						const rect = json[e.dataset.path]
						e.style.width = (rect?.width ?? 150) + 'px'
						e.style.height = (rect?.height ?? 150) + 'px'
						e.style.top = (rect?.top ?? 0) + 'px'
						e.style.left = (rect?.left ?? 0) + 'px'
						e.style.border = '1px dashed red'
						e.style.display = 'block'
					})
                    break;
            }
        });	

		window.onload = function () {
			const vscode = acquireVsCodeApi();
			vscode.postMessage({
				type: 'window.onload'
			})

			interact('.resize-drag')
			.draggable({
				listeners: {
					move(event) {
						var target = event.target
						// keep the dragged position in the data-x/data-y attributes
						var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
						var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy
					  
						// translate the element
						target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
					  
						// update the posiion attributes
						target.setAttribute('data-x', x)
						target.setAttribute('data-y', y)
					},
					end (event) {
						vscode.postMessage({
							type: 'drag.end',
							left: event.rect.left,
							top: event.rect.top,
							width: event.rect.width,
							height: event.rect.height,
							path: event.target.getAttribute('data-path'),
						})
					},
				},
				inertia: true,
				modifiers: [
				  interact.modifiers.restrictRect({
					// restriction: 'parent',
					endOnly: true
				  })
				]
			  })
			.resizable({
			  // resize from all edges and corners
			  edges: { left: true, right: true, bottom: true, top: true },
		  
			  listeners: {
				move (event) {
				  var target = event.target
				  var x = (parseFloat(target.getAttribute('data-x')) || 0)
				  var y = (parseFloat(target.getAttribute('data-y')) || 0)
		  
				  // update the element's style
				  target.style.width = event.rect.width + 'px'
				  target.style.height = event.rect.height + 'px'
		  
				  // translate when resizing from top or left edges
				  x += event.deltaRect.left
				  y += event.deltaRect.top
		  
				  target.style.transform = 'translate(' + x + 'px,' + y + 'px)'
		  
				  target.setAttribute('data-x', x)
				  target.setAttribute('data-y', y)
				},
				end (event) {
					vscode.postMessage({
						type: 'drag.end',
						left: event.rect.left,
						top: event.rect.top,
						width: event.rect.width,
						height: event.rect.height,
						path: event.target.getAttribute('data-path'),
					})
				},
			  },
			  modifiers: [
				// keep the edges inside the parent
				interact.modifiers.restrictEdges({
				  outer: 'parent'
				}),
		  
				// minimum size
				interact.modifiers.restrictSize({
				  min: { width: 50, height: 50 }
				})
			  ],
		  
			  inertia: true
			})
		}
		</script>
		<style>
		html {
			min-height: 100vh;
			min-width: 100vw;
			width: auto;
			height: auto;
		}
		body {
			position: relative;
			min-height: 100vh;
			min-width: 100vw;
			width: auto;
			height: auto;
		}
		div {
			margin: 0;
		}
		.resize-drag {
			position: absolute;
			width: 120px;
			border-radius: 8px;
			// background-color: #29e;
			// color: white;
			font-size: 20px;
			font-family: sans-serif;
			
			touch-action: none;
			display: none;
				
			/* This makes things *much* easier */
			box-sizing: border-box;
		  }
		</style>
		`
	}))
}

// this method is called when your extension is deactivated
export function deactivate() {}
