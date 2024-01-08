<script lang="ts">
	export let value: string = null;
	export let placeholder: string = null;
	export let label: string = null;

	export let onInput: (
		e: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) => void = null;
</script>

{#if label}
	<label for="lf-prompt_field">{label}</label>
{/if}
<input id="lf-prompt_field" type="text" autocomplete="off" bind:value on:input={onInput} {placeholder} />

<style>
	label {
		font-family: "Switzer-Variable", sans-serif;
		font-size: 0.5em;
		font-weight: 400;
		margin-bottom: 0.2em;
	}

	input {
		/* width: 100%; */
		border: var(--almost-black) 2px solid;
		font-family: "Switzer-Variable", "sans-serif";
		letter-spacing: 0.4px;
		color: var(--almost-black);
		height: 1.5em;
		padding: 0.25em 0.5em;
		margin-bottom: 0.8em;
	}

	input::placeholder {
		font-style: italic;
	}

	input:focus {
		outline: none;
	}

	input::selection {
		background-color: var(--link-colour);
	}
</style>
