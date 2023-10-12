<script>
	import { onMount } from "svelte";
	import "../../../static/css/main.css";
</script>

<div id="header-top">
	<header id="header">
		<!-- <a id="logo-container" title="Home" href="/" data-sveltekit-reload>
			<svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1330.04 1343.15"
				><defs
					><style>
						.d {
							fill: none;
							stroke: #000;
							stroke-miterlimit: 10;
							stroke-width: 60px;
						}
					</style></defs
				><g id="a" /><g id="b"
					><g id="c"
						><ellipse cx="719.42" cy="200" rx="199.95" ry="199.95" /><ellipse
							cx="200"
							cy="629.24"
							rx="199.95"
							ry="199.95"
						/><ellipse cx="973.33" cy="1005.37" rx="119.97" ry="119.96" /><line
							class="d logo-lines"
							x1="1311.8"
							y1="253.11"
							x2="973.33"
							y2="1005.37"
						/><line class="d logo-lines" x1="973.33" y1="1005.37" x2="212.76" y2="1324.71" /></g
					></g
				></svg
			>
		</a> -->
		<a href="/" id="lf-home-text" title="Home" class="header-text-container" data-sveltekit-reload>Home</a>
		<div id="lf-story-history-container" class="header-text-container">
			<div>Story History</div>
		</div>
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
		font-family: "Switzer";
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
