<script lang="ts">
	import Seperator from "$lib/editor/leaf.seperator.svelte";
	import Loader from "$lib/states/loader.svelte";
	import { loading } from "$lib/states/loader";
	import { onMount } from "svelte";

	export let title: string;
	export let subtitle: string;
	export let showSeperator: boolean = false;

	onMount(() => {
		// setTimeout(()=> {
			$loading = false;
		// }, 2000)
	});
</script>

{#if $loading}
	<Loader />
{:else}
	<div id="lf-md-container">
		<div id="lf-md-headings">
			<h3
				id="lf-md-title"
				class="lf-md-title"
			>
				{title}
			</h3>
			<h4
				id="lf-md-subtitle"
				class="lf-md-subtitle"
			>
				{subtitle}
			</h4>
		</div>
		{#if showSeperator === true}
			<Seperator />
		{/if}
	</div>
{/if}

<style>
	.lf-md-title {
		font-weight: 600;
		font-size: 0.6em;
	}

	.lf-md-subtitle {
		font-weight: 300;
		font-size: 0.5em;
	}

	#lf-md-headings {
		margin-bottom: 0.5em;
	}
</style>
