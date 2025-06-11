import { Slice } from '@tiptap/pm/model';
import { EditorView } from '@tiptap/pm/view';
import * as pmView from '@tiptap/pm/view';

function getPmView() {
	try {
		return pmView;
	} catch (error: any) {
		return null;
	}
}

export function serializeForClipboard(view: EditorView, slice: Slice) {
	// Newer Tiptap/ProseMirror
	if (view && typeof view.serializeForClipboard === 'function') {
		return view.serializeForClipboard(slice);
	}

	// Older version fallback
	const proseMirrorView = getPmView();

	if (proseMirrorView && typeof (proseMirrorView as any)?.__serializeForClipboard === 'function') {
		return (proseMirrorView as any).__serializeForClipboard(view, slice);
	}

	throw new Error('No supported clipboard serialization method found.');
}
