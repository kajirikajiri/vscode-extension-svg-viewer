import * as vscode from 'vscode';

export type File = {
    webViewUriString: string;
    webViewUri: vscode.Uri;
}

export type Vscode = typeof vscode;

export type Client = {
    handleWindowOnload: ({type, json}: { type: 'window.onload.response', json: Json }) => void
}

export type Json = {[x:string]: {
		left: number,
		top: number,
		width: number,
		height: number,
		path: string,
	}}
