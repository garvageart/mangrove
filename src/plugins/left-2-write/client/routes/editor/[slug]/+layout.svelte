<script>
	import { onMount } from "svelte";
	import "../../../static/css/main.css";

	onMount(() => {
		const postTitle = document.getElementById("title");
		const initialTitle = document.title;

		postTitle.onkeyup = () => {
			if (postTitle.value === "") {
				document.title = initialTitle;
				return;
			}

			document.title = initialTitle + ` | ${postTitle.value}`;
		};
	});
</script>

<div id="header-top">
	<header id="header">
		<a id="logo-container" href="/" data-sveltekit-reload>
			<svg
				class="logo"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 1330.04 1343.15"
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
						/><line
							class="d logo-lines"
							x1="973.33"
							y1="1005.37"
							x2="212.76"
							y2="1324.71"
						/></g
					></g
				></svg
			>
		</a>
		<input id="title" placeholder="Untitled post" />
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
	}

	#header {
		border-bottom: 1px solid var(--border-colour);
		width: 100%;
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

	.logo {
		height: 2em;
		margin: 0.5em;
		fill: #f8f8f8;
	}

	.logo-lines {
		stroke: #f8f8f8;
	}

	#logo-container {
		background-color: #111111;
	}

	#title {
		border: 0px;
		/* border-bottom: 1px solid var(--border-colour); */
		height: 100%;
		font-size: 1em;
		font-weight: 700;
		font-family: "Switzer";
		margin-left: 2em;
		margin-right: 2em;
		display: flex;
		justify-content: left;
		align-items: center;
		text-align: left;
		width: 50%;
		max-width: 100%;
		background-color: #f8f8f8;
	}
</style>
