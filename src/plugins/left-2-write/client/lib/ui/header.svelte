<header id="header">
	<a id="logo-container" href="/">
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
	</a>
	<span id="dashboard-title">Dashboard</span>
	<slot name="new-post-button" />
</header>

<style>
	#header {
		border-bottom: 1px solid var(--border-colour);
		min-height: 2em;
		width: 100%;
		align-items: center;
		justify-content: left;
		display: flex;
		background-color: #f8f8f8;
		position: sticky;
		top: 0px;
	}

	.logo {
		height: 1em;
		margin: 0.5em;
		fill: #f8f8f8;
	}

	.logo-lines {
		stroke: #f8f8f8;
	}

	#logo-container {
		background-color: #111111;
		width: 2em;
		height: 2em;
	}
	
	#dashboard-title {
		font-family: 'Moret', Times, serif;
		font-weight: 700;
		margin-left: 1em;
	}
</style>
