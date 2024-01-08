<script>
	import { page } from "$app/stores";
</script>

<div id="header-top">
	<header id="header">
		<a href="/" id="lf-home-text" title="Home" class="header-text-container" data-sveltekit-reload>Home</a>
		<div id="lf-story-history-container" class="header-text-container">
			<div>Story History</div>
		</div>
		<a
			id="lf-quill-link"
			href={$page.url.href.replace("editor/", "new-editor/")}
			class="header-text-container"
			data-sveltekit-reload
			>New Editor
		</a>
	</header>
	<div id="toolbar">
		<!-- Add font size dropdown -->
		<!--  -->
		<select class="ql-header ql-picker">
			<option value="1" />
			<!-- Note a missing, thus falsy value, is used to reset to default -->
			<!-- <option selected /> -->
			<option value="2" />
			<option value="3" />
			<option value="4" />
			<option value="5" />
			<option value="6" />
			<option selected />
		</select>
		<span class="ql-formats">
			<button class="ql-bold" />
			<button class="ql-italic" />
			<button class="ql-underline" />
			<button class="ql-strike" />
			<button class="ql-code" />
		</span>
		<!-- Subscript and Superscript -->
		<span class="ql-formats">
			<button class="ql-script" value="sub" />
			<button class="ql-script" value="super" />
		</span>
		<!--  -->
		<span class="ql-formats">
			<button class="ql-link" />
			<button class="ql-blockquote" />
			<button class="ql-code-block" />
		</span>
		<!--  -->
		<!-- Add a bold button -->
		<span class="ql-formats">
			<button class="ql-list" value="ordered" />
			<button class="ql-list" value="bullet" />
		</span>
		<span class="ql-formats">
			<button class="ql-indent" value="-1" />
			<button class="ql-indent" value="+1" />
		</span>
		<span class="ql-formats">
			<select class="ql-align">
				<option selected />
				<option value="center" />
				<option value="right" />
				<option value="justify" />
			</select>
			<button class="ql-direction" value="rtl" />
		</span>
		<span class="ql-formats">
			<button class="ql-image" />
			<button class="ql-video" />
		</span>
		<span class="ql-formats">
			<span class="ql-color ql-picker ql-color-picker" />
			<select class="ql-color" />
			<select class="ql-background" />
			<span class="ql-background ql-picker ql-color-picker" />
		</span>
	</div>
</div>

<slot />

<style>
	#toolbar {
		border: 0px;
		border-bottom: 1px solid var(--border-colour);
		/* box-shadow: 0px 2px 4px 1px rgba(0, 0, 0, 0.2); */
		width: 100%;
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		justify-content: center;
		background-color: #f8f8f8;
		font-family: "Switzer-Variable";
		font-weight: 500;
	}

	#header {
		border-bottom: 1px solid var(--border-colour);
		width: 100%;
		height: 1.5em;
		align-items: center;
		justify-content: left;
		display: flex;
		background-color: #f8f8f8;
	}

	#header-top {
		position: sticky;
		top: 0;
		z-index: 1;
		/* box-shadow: 0px 0px 3px 1px rgba(0, 0, 0, 0.2); */
	}

	#lf-quill-link {
		position: absolute;
		right: 0px;
		border-left: 1px solid var(--border-colour);
		border-right: 0px;
	}

	/* .logo {
		height: 1.0em;
		margin: 0.3em;
		fill: #f8f8f8;
	}

	.logo-lines {
		stroke: #f8f8f8;
	}

	#logo-container {
		background-color: #111111;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	} */

	.header-text-container {
		/* width: 10em; */
		height: 100%;
		font-weight: 600;
		font-size: 0.6em;
		border-right: 1px solid var(--border-colour);
		padding: 1em;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
