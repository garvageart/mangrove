<script lang="ts">
	import { fade } from "svelte/transition";
	import { dismissToast, toasts } from "./notification_toast.store";
	import CloseIcon from "./CloseIcon.svelte";

	function convertTextURLsToHref(text: string) {
		const urlRegex = L2W_URL_REGEX;
		
		return text.replaceAll(urlRegex, (url) => {
			return `<a href="${url}">${url}</a>`;
		});
}
</script>

{#if $toasts}
	<section id="lf-toast-section">
		{#each $toasts as toast}
			<article id="lf-toast" role="alert" transition:fade>
				<div id="lf-toast-message">
					{@html convertTextURLsToHref(toast.message)}
				</div>

				{#if toast.dismissible}
					<button id="lf-toast-close" on:click={() => dismissToast(toast.id)}>
						<CloseIcon />
					</button>
				{/if}
			</article>
		{/each}
	</section>
{/if}

<style>
	#lf-toast-section {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		width: 100%;
		display: flex;
		margin: 1em;
		justify-content: center;
		flex-direction: column;
		z-index: 1000;
	}

	#lf-toast {
		background-color: var(--almost-black);
		color: var(--almost-white);
		width: 10em;
		padding: 1em 1em;
		margin: 0.2em;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	#lf-toast-message {
		font-size: 0.6em;
	}

	#lf-toast-close {
		background: transparent;
		height: 2em;
		width: 2em;
		margin: 0 0.5em;
	}
</style>
