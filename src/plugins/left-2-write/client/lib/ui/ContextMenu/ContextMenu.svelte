<!--
    Context Menu Svelte
    Inspiration code from: https://svelte.dev/repl/6fb90919e24942b2b47d9ad154386b0c?version=3.49.0
-->
<script lang="ts">
	import { SvelteComponent, createEventDispatcher, onMount, setContext } from "svelte";
	import MenuItem from "./ContextMenuItem.svelte";
	import type ContextMenu from "./ContextMenu.svelte";
	import { key } from "./menuKey";
	import type { MouseEventHandler } from "svelte/elements";
	import { dev } from "$app/environment";
	import type { ILeft2WriteMenuOptions } from "../../../../../../types/plugins/l2w.types";

	const dispatch = createEventDispatcher();
	let contextMenu: HTMLDivElement;

	// export let outer = true;
	// export let contextMenuComp: ContextMenu = null;
	export let showMenu: boolean = null;
	export let menuOptions: ILeft2WriteMenuOptions[] = null;
	export let floating: boolean = null;

	// $: if (dev) {
	// 	console.log(showMenu);
	// }

	// setContext(key, {
	// 	dispatchClick: () => dispatch("click")
	// });
	
	function getContextMenuCoords(node: HTMLElement) {
		let target = node;
		
		if (floating) {
			// Something something here
			return
		}
		
		const centerX = target.offsetLeft + target.offsetWidth / 2;
		const centerY = target.offsetTop + target.offsetHeight / 2;

		console.log(target);
		console.log(centerX, centerY);
	}

	type CloseMenuEvent =
		| (MouseEvent & { currentTarget: EventTarget & Window })
		| (MouseEvent & { currentTarget: EventTarget & HTMLDivElement });

	// Idk how to make this work yet, it's a problem for another time
	function closeMenu(e: CloseMenuEvent) {
		const target = e.target as HTMLElement;

		// Lmao it was this simple all along? Okay
		if (contextMenu?.parentElement.contains(target)) {
			return;
		}

		showMenu = false;
	}
</script>

<svelte:window on:click={closeMenu} />

{#if showMenu}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div id="context-menu" role="dialog" bind:this={contextMenu} style="z-index: 990; position: absolute; top:0.5em; right: 0.5em;">
		<div id="context-menu-options">
			<ul></ul>
			{#each menuOptions as options}
				<MenuItem
					{options}
					on:itemclick={(e) => {
						options.action(e);
						showMenu = false;
					}}
				/>
			{/each}
		</div>
	</div>
{/if}

<style>
	#context-menu-options {
		display: inline-flex;
		/* border: 1px var(--border-colour) solid; */
		width: 6.5em;
		background-color: #242424;
		color: var(--almost-white);
		/* border-radius: 10px; */
		overflow: hidden;
		flex-direction: column;
	}

	/* #navbar ul {
		margin: 6px;
	} */
</style>
