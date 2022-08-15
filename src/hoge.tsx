import React from 'react'
import * as ReactDOM from 'react-dom/client';
import './app.css'
import { Client, File, Json } from './type'
import interact from 'interactjs'

declare var files: File[];
declare var acquireVsCodeApi: any;
declare var isWeb: boolean;

const getJson = (): Json => {
	return {
		'dummy1': {
			height: 200,
			width: 200,
			left: 200,
			top: 200,
			path: 'dummy1'
		},
		'dummy2': {
			height: 200,
			width: 200,
			left: 200,
			top: 200,
			path: 'dummy2'
		}
	}
}

const useInterval = (callback: Function, delay?: number | null) => {
	const savedCallback = React.useRef<Function>(() => { });

	React.useEffect(() => {
		savedCallback.current = callback;
	});

	React.useEffect(() => {
		if (delay !== null) {
			const interval = setInterval(() => savedCallback.current(), delay || 0);
			return () => clearInterval(interval);
		}

		return undefined;
	}, [delay]);
};

const App = () => {

	const scale = React.useRef(1);
	const json = React.useRef({});
	React.useEffect(() => {
		const vscode = acquireVsCodeApi() ?? window;
		const client: Client = {
			handleWindowOnload(data) {
				if (isWeb) {
					vscode.postMessage(data)
				}
			}
		}
		window.addEventListener('wheel', (e) => {
			e.preventDefault()

			const isScaling = e.ctrlKey
			const isScrolling = !isScaling
			const el = document.getElementById('test')!
			if (isScrolling) {
				const marginTop = Number(el.style.marginTop.replace('px', '')) - e.deltaY + 'px'
				const marginLeft = Number(el.style.marginLeft.replace('px', '')) - e.deltaX + 'px'
				el.style.marginTop = marginTop
				el.style.marginLeft = marginLeft
			}
			if (isScaling) {
				return
				
				// 以下のコードでScalingできるようになるが、Scaling時のresizeやdragがうまくいかない。
				scale.current += e.deltaY * -0.01
				scale.current = Math.min(Math.max(.125, scale.current), 4);
				console.log(scale.current)
				el.style.transform = `scale(${scale.current})`;
			}
		}, { passive: false })

		window.addEventListener('message', (event) => {
			const message = event.data; // The JSON data our extension sent

			switch (message.type) {
				case 'window.onload.response': {
					json.current = message.json;
					document.querySelectorAll<HTMLDivElement>('.resize-drag').forEach(function (e) {
						if (e.dataset.path === undefined) return

						const rect = json.current[e.dataset.path]
						e.style.width = (rect.width ?? 150) + 'px'
						e.style.height = (rect.height ?? 150) + 'px'
						e.style.top = (rect.top ?? 100) + 'px'
						e.style.left = (rect.left ?? 100) + 'px'
						e.style.border = '1px dashed red'
						e.style.display = 'block'
					})
					break;
				}
				case 'window.onload': {
					client.handleWindowOnload({
						type: 'window.onload.response',
						json: getJson()
					})
					break
				}
			}
		});

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
					end(event) {
						const rect = json.current[event.target.dataset.path]
						vscode.postMessage({
							type: 'drag.end',
							left: rect.left + Number(event.target.getAttribute('data-x')),
							top: rect.top + Number(event.target.getAttribute('data-y')),
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
					move(event) {
						var target = event.target
						var x = (parseFloat(target.getAttribute('data-x')) || 0)
						var y = (parseFloat(target.getAttribute('data-y')) || 0)

						// update the element's style
						console.log(event)
						target.style.width = event.rect.width + 'px'
						target.style.height = event.rect.height + 'px'

						// translate when resizing from top or left edges
						x += event.deltaRect.left
						y += event.deltaRect.top

						target.style.transform = 'translate(' + x + 'px,' + y + 'px)'

						target.setAttribute('data-x', x)
						target.setAttribute('data-y', y)
					},
					end(event) {
						const rect = json.current[event.target.dataset.path]
						vscode.postMessage({
							type: 'resize.end',
							left: rect.left + Number(event.target.getAttribute('data-x')),
							top: rect.top + Number(event.target.getAttribute('data-y')),
							width: event.rect.width,
							height: event.rect.height,
							path: event.target.getAttribute('data-path'),
						})
					},
				},
				modifiers: [
					// keep the edges inside the parent
					interact.modifiers.restrictEdges({
						// outer: 'parent'
					}),

					// minimum size
					interact.modifiers.restrictSize({
						min: { width: 50, height: 50 }
					})
				],

				inertia: true
			})
		document.querySelectorAll<HTMLDivElement>('div[data-path]').forEach(function (e) {
			const f = files.find((f) => {
				return f.webViewUri.path === e.dataset.path
			})
			if (f === undefined) {
				return
			}
			fetch(f.webViewUriString).then((response) => {
				return response.text();
			}).then((text) => {
				const parser = new DOMParser()
				const doc = parser.parseFromString(text, 'text/xml')
				const svg = doc.getElementsByTagName('svg')[0] ?? document.createElement('svg')

				// width, heightが指定されていると、resizeできなくなるので、widthとheightを削除
				svg.style.width = ''
				svg.style.height = ''

				// width, heightが指定されていると、resizeできなくなるので、widthとheightを100%にする
				svg.setAttribute('width', '100%')
				svg.setAttribute('height', '100%')

				// svgにobject-fitを効かせる https://stackoverflow.com/a/43367943
				svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
				e.appendChild(svg)
			})
		})
	}, [])
	return <div className='container'>
		{/* <div>
			<button>ボタン</button>
		</div> */}
		<div className='container'>
		<div className='container' style={{ position: 'relative', marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 }} id="test">
			{files.map((f) => {
				return <div key={f.webViewUri.path} data-path={f.webViewUri.path} className="resize-drag"></div>
			})}
		</div>
		</div>
	</div>
}
const domContainer = document.getElementById('app');
const root = ReactDOM.createRoot(domContainer!);
root.render(<App />);