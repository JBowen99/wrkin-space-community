<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import Collaboration from '@tiptap/extension-collaboration';
	import CollaborationCaret from '@tiptap/extension-collaboration-caret';
	import { HocuspocusProvider } from '@hocuspocus/provider';
	import { DOC_COLLAB_FIELD, docEditorExtensions } from '$lib/shared/doc-editor';
	import { collabUserColor, collabUserFromAwareness, type CollabUser } from '$lib/shared/collab-user';
	import DocEditorToolbar from '../docs/doc-editor-toolbar.svelte';
	import DocEditorLinkPreview from '../docs/doc-editor-link-preview.svelte';

	type CurrentUser = {
		id: string;
		name: string;
		image?: string | null;
	};

	type Props = {
		docId: string;
		currentUser: CurrentUser;
		onConnectedUsersChange?: (users: CollabUser[]) => void;
	};

	let { docId, currentUser, onConnectedUsersChange }: Props = $props();

	let element = $state<HTMLDivElement | null>(null);
	let editorState = $state<{ editor: Editor | null }>({ editor: null });
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let statusMessage = $state('');

	let provider: HocuspocusProvider | null = null;
	let awarenessCleanup: (() => void) | null = null;

	function syncConnectedUsers() {
		const awareness = provider?.awareness;
		if (!awareness) return;
		onConnectedUsersChange?.(collabUserFromAwareness(awareness.getStates()));
	}

	onMount(() => {
		let cancelled = false;

		async function connect() {
			try {
				const res = await fetch(`/api/collab/token?docId=${encodeURIComponent(docId)}`);
				if (!res.ok) {
					throw new Error('Could not connect to collaboration server');
				}
				const { token, url, documentName } = (await res.json()) as {
					token: string;
					url: string;
					documentName: string;
				};

				if (cancelled || !element) return;

				provider = new HocuspocusProvider({
					url,
					name: documentName,
					token,
					onSynced() {
						if (cancelled || !element || !provider) return;

						const collabIdentity = {
							id: currentUser.id,
							name: currentUser.name,
							color: collabUserColor(currentUser.id),
							image: currentUser.image ?? null
						};

						const awareness = provider.awareness;
						if (awareness) {
							const onAwarenessUpdate = () => syncConnectedUsers();
							awareness.on('update', onAwarenessUpdate);
							awarenessCleanup = () => awareness.off('update', onAwarenessUpdate);
						}

						const ed = new Editor({
							element,
							extensions: [
								...docEditorExtensions,
								Collaboration.configure({
									document: provider.document,
									field: DOC_COLLAB_FIELD
								}),
								CollaborationCaret.configure({
									provider,
									user: collabIdentity
								})
							],
							onTransaction: ({ editor }) => {
								editorState = { editor };
							}
						});
						editorState = { editor: ed };
						syncConnectedUsers();
						status = 'ready';
					},
					onAuthenticationFailed() {
						status = 'error';
						statusMessage = 'Authentication failed';
					}
				});

				provider.on('disconnect', () => {
					if (!cancelled && status === 'ready') {
						statusMessage = 'Disconnected — reconnecting…';
					}
				});
			} catch (err) {
				status = 'error';
				statusMessage = err instanceof Error ? err.message : 'Connection failed';
			}
		}

		connect();

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		awarenessCleanup?.();
		editorState.editor?.destroy();
		provider?.destroy();
	});
</script>

<div
	class="doc-editor mt-6 flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
>
	{#if editorState.editor}
		<DocEditorToolbar editor={editorState.editor} {docId} />
	{/if}

	<div class="doc-editor-canvas relative min-h-[28rem] flex-1">
		{#if status === 'loading'}
			<p class="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
				Connecting…
			</p>
		{:else if status === 'error'}
			<p
				class="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-red-600"
			>
				{statusMessage}
			</p>
		{/if}
		<div
			bind:this={element}
			class="doc-editor-content prose prose-sm max-w-none px-6 py-4 text-ink prose-stone focus:outline-none prose-headings:text-ink prose-strong:text-ink prose-code:text-ink {status !==
			'ready'
				? 'invisible'
				: ''}"
		></div>
		{#if element && status === 'ready'}
			<DocEditorLinkPreview container={element} />
		{/if}
	</div>
</div>

<style>
	.doc-editor-canvas {
		background: var(--color-surface-raised);
	}

	:global(.doc-editor .ProseMirror) {
		min-height: 24rem;
		outline: none;
		background-color: var(--color-surface-raised);
		color: var(--color-ink);
	}

	:global(.doc-editor .ProseMirror :is(h1, h2, h3, h4, h5, h6, p, li, strong, b, em, i, code)) {
		color: inherit;
	}

	:global(.doc-editor .ProseMirror pre) {
		background: color-mix(in srgb, var(--color-border) 30%, var(--color-surface-raised));
		border-radius: 0.375rem;
		font-family: ui-monospace, monospace;
		font-size: 0.8125rem;
		margin: 0.75rem 0;
		padding: 0.75rem 1rem;
		color: var(--color-ink);
	}

	:global(.doc-editor .ProseMirror pre code) {
		background: none;
		padding: 0;
		color: inherit;
	}

	:global(.doc-editor .ProseMirror :not(pre) > code) {
		background: color-mix(in srgb, var(--color-border) 40%, var(--color-surface-raised));
		border-radius: 0.25rem;
		padding: 0.125rem 0.35rem;
		font-size: 0.875em;
		color: var(--color-ink);
	}

	:global(.doc-editor .ProseMirror .doc-editor-selection) {
		background-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	:global(.doc-editor .ProseMirror .collaboration-carets__caret) {
		border-left: 1px solid currentColor;
		border-right: 1px solid currentColor;
		margin-left: -1px;
		margin-right: -1px;
		pointer-events: none;
		position: relative;
		word-break: normal;
	}

	:global(.doc-editor .ProseMirror .collaboration-carets__label) {
		border-radius: 3px 3px 3px 0;
		color: #fff;
		font-size: 11px;
		font-style: normal;
		font-weight: 600;
		left: -1px;
		line-height: normal;
		padding: 0.1rem 0.35rem;
		position: absolute;
		top: -1.4em;
		user-select: none;
		white-space: nowrap;
	}

	:global(.doc-editor .ProseMirror blockquote) {
		border-left: 3px solid var(--color-border);
		margin: 0.75rem 0;
		padding-left: 1rem;
		color: var(--color-ink-muted);
	}

	:global(.doc-editor .ProseMirror u) {
		text-decoration: underline;
	}

	:global(.doc-editor .ProseMirror img) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 0.75rem 0;
		border-radius: 0.375rem;
	}

	:global(.doc-editor .ProseMirror img.ProseMirror-selectednode) {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	:global(.doc-editor .ProseMirror mark) {
		border-radius: 0.125rem;
		padding: 0.05em 0.1em;
		color: inherit;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}

	:global(.doc-editor .ProseMirror a),
	:global(.doc-editor .prose a) {
		color: var(--color-accent);
		text-decoration: underline;
		cursor: pointer;
	}

	:global(.doc-editor .ProseMirror ul[data-type='taskList']) {
		list-style: none;
		margin: 0.5rem 0;
		padding: 0;
	}

	:global(.doc-editor .ProseMirror ul[data-type='taskList'] li) {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		margin: 0.25rem 0;
	}

	:global(.doc-editor .ProseMirror ul[data-type='taskList'] li > label) {
		flex-shrink: 0;
		margin-top: 0.2rem;
		user-select: none;
	}

	:global(.doc-editor .ProseMirror ul[data-type='taskList'] li > div) {
		flex: 1;
		min-width: 0;
	}

	:global(.doc-editor .ProseMirror ul[data-type='taskList'] li[data-checked='true'] > div) {
		opacity: 0.55;
		text-decoration: line-through;
	}
</style>
