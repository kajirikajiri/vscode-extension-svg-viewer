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
		const panel = vscode.window.createWebviewPanel(
			'catCodint',
			'Cat Coding',
			vscode.ViewColumn.One,
			{}
		)
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
				x: number,
				y: number,
				width: number,
				height: number,
				path: string,
			}} = JSON.parse(readStr);
			return json
		}
		
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
		}, undefined, context.subscriptions)
		
		const json = await getJson()
		const c = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**')
		const f = c.map(d => {
			if (!d.path.endsWith(".svg")) return

			const e =  vscode.Uri.file(d.path)
			const f = panel.webview.asWebviewUri(e)
			console.log(f)
			const top = `${json[f.path].y}`
			const left = `${json[f.path].x}`
			console.log(top, left)
			return `<div data-path="${f.path}" class="resize-drag" style="top: ${top}px;left: ${left}px;"><img src="${f}"/></div>`
		}).filter(a => a !== undefined)
		// const a = vscode.Uri.file(
		// 	path.join(context.extensionPath, 'example.png')
		// 	// path.join("/Users/kajiri/Downloads/sika.jpg")
		//   );
		// const b = panel.webview.asWebviewUri(a)
		// vscode.window.showInformationMessage(JSON.stringify({...b, ...{hey: context.extensionPath}}));
		panel.webview.options = {
			enableScripts: true,
		};
		panel.webview.html = f.join('') + `
		<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>
		<script>
		window.onload = function () {
			console.log("loaded")
			// 毎回ロード時にファイルからサイズと位置を読み込む

			const vscode = acquireVsCodeApi();
			function dragMoveListener (event) {
				var target = event.target
				// keep the dragged position in the data-x/data-y attributes
				var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
				var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy
			  
				// translate the element
				target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
			  
				// update the posiion attributes
				target.setAttribute('data-x', x)
				target.setAttribute('data-y', y)
			  }
			  
			  // this function is used later in the resizing and gesture demos
			  window.dragMoveListener = dragMoveListener
			
			interact('.resize-drag')
			.draggable({
				listeners: {
					move: window.dragMoveListener,
					end (event) {
						var x = (parseFloat(event.target.getAttribute('data-x')) || 0)
						var y = (parseFloat(event.target.getAttribute('data-y')) || 0)
						vscode.postMessage({
							type: 'drag.end',
							x,
							y,
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
				end (event) {
					var x = (parseFloat(event.target.getAttribute('data-x')) || 0)
					var y = (parseFloat(event.target.getAttribute('data-y')) || 0)
					vscode.postMessage({
						type: 'drag.end',
						x,
						y,
						width: event.rect.width,
						height: event.rect.height,
						path: event.target.getAttribute('data-path'),
					})
				},
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
				//   target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
				}
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
			border: 1px dashed red;
				
			/* This makes things *much* easier */
			box-sizing: border-box;
		  }
		</style>
		`
	}))
}

// this method is called when your extension is deactivated
export function deactivate() {}
