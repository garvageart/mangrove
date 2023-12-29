<div id="lf-code_embed">
	<div id="lf-code_embed-header">Enter HTML Content</div>
	<textarea id="lf-code_embed-editor" />
</div>

<style>
	#lf-code_embed-header {
		font-weight: 700;
		font-size: 0.7em;
		margin-bottom: 0.5em;
	}

	#lf-code_embed-editor {
		resize: none;
		overflow-x: hidden;
		overflow-y: auto;
		min-height: 500px;
		min-width: 100%;
		background-color: #22272e;
		color: var(--almost-white);
		border: 0px;
		padding: 2em;
		font-size: 0.5em;
		font-weight: 300;
		font-family: 'SF Mono', monospace;
	}

	#lf-code_embed-editor:focus {
		outline-width: 0px;
		border-radius: 0px;
	}

	#lf-code_embed-editor:-webkit-scrollbar-thumb {
		height: 56px;
		border-radius: 8px;
		border: 4px solid transparent;
		background-clip: content-box;
		background-color: #919191;
	}

	#lf-code_embed-editor:-webkit-scrollbar {
		width: 16px;
	}
</style>
