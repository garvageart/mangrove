<script lang="ts">
	import LeafMenuIcon from "./leaf.menu_icon.svelte";
	import LeafMenuIconGroup from "./leaf.icon_group.svelte";
	import LeafMenuSeperator from "./leaf.menu_seperator.svelte";
	import LeafImagePrompt from "left-2-write/lib/editor/menu/prompt/image/leaf.image_prompt.svelte";
	import LeafLinkPrompt from "left-2-write/lib/editor/menu/prompt/link/leaf.link_prompt.svelte";
	import leafSchema from "left-2-write/routes/new-editor/[id]/editor/leaf.schema";
	import { wrapInList } from "prosemirror-schema-list";
	import { onDestroy } from "svelte";
	import { setBlockType, wrapIn } from "prosemirror-commands";
	import { dev } from "$app/environment";

	if (dev) {
		onDestroy(() => {
			console.log("destroying the menu");
		});
	}
</script>

<div id="lf-floating-menu">
	<LeafMenuIconGroup>
		<!-- Text modifiers -->
		<LeafMenuIcon title="Toggle Bold" markOrNode={leafSchema.marks.strong}>
			<svg width="17" height="21" viewBox="0 0 17 21" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M0.0100098 21.0001V0.600098H7.87001C12.34 0.600098 15.13 2.7901 15.13 6.2701C15.13 8.0701 14.23 9.4501 12.64 10.2301C14.98 11.0101 16.27 12.7501 16.27 15.0901C16.27 18.8401 13.57 21.0001 8.89001 21.0001H0.0100098ZM7.78001 3.8101H4.06001V9.0901H7.69001C9.85001 9.0901 10.99 8.0401 10.99 6.4801C10.99 4.8301 9.82001 3.8101 7.78001 3.8101ZM8.56001 12.0901H4.06001V17.7901H8.80001C10.9 17.7901 12.13 16.6501 12.13 14.9401C12.13 13.2301 10.84 12.0901 8.56001 12.0901Z"
					fill="#181818"
				/>
			</svg>
		</LeafMenuIcon>
		<LeafMenuIcon title="Toggle Italics" markOrNode={leafSchema.marks.em}>
			<svg width="9" height="21" viewBox="0 0 9 21" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M0.0100098 21.0001L3.97001 0.600098H8.02001L4.06001 21.0001H0.0100098Z" fill="#181818" />
			</svg>
		</LeafMenuIcon>
		<LeafMenuIcon title="Toggle Underline" markOrNode={leafSchema.marks.underline}>
			<svg width="21" height="27" viewBox="0 0 21 27" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M18.81 13.2301C18.81 18.3301 15.57 21.4501 10.32 21.4501C5.07 21.4501 1.83 18.3301 1.83 13.2301V0.600098H5.88V13.2301C5.88 16.3201 7.53 18.1801 10.32 18.1801C13.14 18.1801 14.79 16.3201 14.79 13.2301V0.600098H18.81V13.2301Z"
					fill="#181818"
				/>
				<path d="M0 24.7501H20.64V26.2501H0V24.7501Z" fill="#181818" />
			</svg>
		</LeafMenuIcon>
		<LeafMenuIcon title="Toggle Strikethrough" markOrNode={leafSchema.marks.strikethrough}>
			<svg width="19" height="22" viewBox="0 0 19 22" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M5.43 5.73015C5.43 10.6201 17.64 6.66015 17.64 15.0001C17.64 19.1101 14.28 21.4501 9.66 21.4501C5.01 21.4501 1.71 19.2901 0.93 14.8501H5.16C5.67 17.0101 7.23 18.2101 9.69 18.2101C12.21 18.2101 13.5 17.1601 13.5 15.5101C13.5 10.3201 1.32 14.2201 1.32 6.09015C1.32 2.85015 3.99 0.150146 8.82 0.150146C12.93 0.150146 16.41 2.13015 17.07 6.72015H12.78C12.3 4.44015 10.89 3.39015 8.7 3.39015C6.66 3.39015 5.43 4.32015 5.43 5.73015Z"
					fill="#181818"
				/>
				<path d="M0 12.0001H18.57V13.5001H0V12.0001Z" fill="#181818" />
			</svg>
		</LeafMenuIcon>
		<LeafMenuSeperator />
		<!-- Subscript and Superscript -->
		<LeafMenuIcon title="Toggle Superscript" markOrNode={leafSchema.marks.superscript}>
			<svg width="26" height="20" viewBox="0 0 26 20" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M11.73 20L8.72996 15.5L7.97996 14.06L7.19996 15.5L4.28996 20H0.149963L5.87996 11.69L0.569963 3.92001H5.09996L7.64996 7.85001L8.42996 9.32001L9.20996 7.85001L11.73 3.92001H15.84L10.53 11.69L16.26 20H11.73Z"
					fill="#181818"
				/>
				<path
					d="M17.1262 12.14V11.42C17.1262 6.29001 23.0362 6.41001 23.0362 4.04001C23.0362 3.17001 22.4962 2.66001 21.6562 2.66001C20.6662 2.66001 20.1862 3.20001 20.0062 4.13001H17.0662C17.3962 1.76001 19.1062 0.26001 21.6562 0.26001C24.5062 0.26001 26.0062 1.97001 26.0062 4.01001C26.0062 7.19001 21.5962 7.82001 20.3062 9.86001H25.9462V12.14H17.1262Z"
					fill="#181818"
				/>
			</svg>
		</LeafMenuIcon>
		<LeafMenuIcon title="Toggle Subscript" markOrNode={leafSchema.marks.subscript}>
			<svg width="26" height="23" viewBox="0 0 26 23" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M11.73 16.9999L8.72996 12.4999L7.97996 11.0599L7.19996 12.4999L4.28996 16.9999H0.149963L5.87996 8.68992L0.569963 0.919922H5.09996L7.64996 4.84992L8.42996 6.31992L9.20996 4.84992L11.73 0.919922H15.84L10.53 8.68992L16.26 16.9999H11.73Z"
					fill="#181818"
				/>
				<path
					d="M17.3242 22.9999V22.4239C17.3242 17.2399 23.4622 17.5279 23.4622 14.7919C23.4622 13.7119 22.8142 13.0639 21.6802 13.0639C20.4382 13.0639 19.8082 13.7299 19.6282 14.8459H17.2702C17.5942 12.5779 19.1962 11.1559 21.6982 11.1559C24.3982 11.1559 25.7842 12.7579 25.7842 14.7739C25.7842 18.2479 20.6902 18.5539 19.7362 21.2359H25.8202V22.9999H17.3242Z"
					fill="#181818"
				/>
			</svg>
		</LeafMenuIcon>
		<LeafMenuSeperator />
		<!-- Lists -->
		<LeafMenuIcon
			title="Wrap in Ordered List"
			markOrNode={leafSchema.nodes.ordered_list}
			command={wrapInList(leafSchema.nodes.ordered_list)}
		>
			<svg width="33" height="27" viewBox="0 0 33 27" fill="none" xmlns="http://www.w3.org/2000/svg">
				<line x1="10.3925" y1="23.0801" x2="32.9105" y2="23.0801" stroke="#181818" stroke-width="3" />
				<path
					d="M4.39202 24.512C4.39202 25.392 3.68002 26.128 2.32802 26.128C1.14402 26.128 0.336017 25.472 0.192017 24.408H1.42402C1.50402 24.856 1.78402 25.136 2.32002 25.136C2.85602 25.136 3.16002 24.896 3.16002 24.456C3.16002 24.112 2.94402 23.816 2.12002 23.816H1.76802V22.928H2.04802C2.87202 22.928 3.02402 22.584 3.02402 22.312C3.02402 21.952 2.76802 21.72 2.32802 21.72C1.84802 21.72 1.59202 21.976 1.52002 22.408H0.296017C0.432017 21.368 1.20002 20.728 2.33602 20.728C3.58402 20.728 4.25602 21.456 4.25602 22.296C4.25602 22.768 4.06402 23.096 3.64802 23.312C4.16802 23.576 4.39202 23.984 4.39202 24.512Z"
					fill="#181818"
				/>
				<line x1="10.3924" y1="13.0801" x2="32.9104" y2="13.0801" stroke="#181818" stroke-width="3" />
				<path
					d="M0.352003 16.008V15.704C0.352003 13.408 3.008 13.496 3.008 12.384C3.008 11.96 2.76 11.72 2.344 11.72C1.872 11.72 1.632 11.976 1.56 12.408H0.328003C0.464003 11.368 1.216 10.728 2.352 10.728C3.584 10.728 4.232 11.472 4.232 12.368C4.232 13.84 2.168 14.056 1.664 15.072H4.224V16.008H0.352003Z"
					fill="#181818"
				/>
				<line x1="10.3925" y1="3.08008" x2="32.9105" y2="3.08008" stroke="#181818" stroke-width="3" />
				<path
					d="M0.856018 6.00796V5.07196H1.80002V2.24796H0.856018V1.35996H1.22402C1.84002 1.35996 2.01602 1.21596 2.01602 0.919957V0.855957H3.08802V5.07196H4.04002V6.00796H0.856018Z"
					fill="#181818"
				/>
			</svg>
		</LeafMenuIcon>
		<LeafMenuIcon
			title="Wrap in Unordered List"
			markOrNode={leafSchema.nodes.bullet_list}
			command={wrapInList(leafSchema.nodes.bullet_list)}
		>
			<svg width="34" height="26" viewBox="0 0 34 26" fill="none" xmlns="http://www.w3.org/2000/svg">
				<line x1="10.9753" y1="2.28003" x2="33.4933" y2="2.28003" stroke="#181818" stroke-width="3" />
				<rect x="0.582947" width="5.2" height="5.2" fill="#181818" />
				<line x1="10.9753" y1="13.0542" x2="33.4933" y2="13.0542" stroke="#181818" stroke-width="3" />
				<rect x="0.582947" y="10.3999" width="5.2" height="5.2" fill="#181818" />
				<line x1="10.9753" y1="23.0801" x2="33.4933" y2="23.0801" stroke="#181818" stroke-width="3" />
				<rect x="0.582947" y="20.8" width="5.2" height="5.2" fill="#181818" />
			</svg>
		</LeafMenuIcon>
	</LeafMenuIconGroup>
	<LeafMenuIconGroup>
		<LeafMenuIcon title="Insert Image" prompt={true} markOrNode={leafSchema.nodes.image}>
			<svg height="60" viewBox="0 0 87 60" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect x="3" y="3" width="81" height="54" stroke="#181818" stroke-width="6" />
				<path d="M24.5 36L6 54H43L24.5 36Z" fill="#181818" />
				<path d="M50.5122 25L31 44.3333L40.7561 54H81L50.5122 25Z" fill="#181818" />
				<circle cx="23.5" cy="19.5" r="7.5" fill="#181818" />
			</svg>
			<LeafImagePrompt slot="prompt" />
		</LeafMenuIcon>
		<LeafMenuIcon title="Insert Link" prompt={true} markOrNode={leafSchema.marks.link}>
			<svg height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect
					x="14.2715"
					y="2.82843"
					width="22.4606"
					height="16.1818"
					rx="3.16312"
					transform="rotate(45 14.2715 2.82843)"
					stroke="#181818"
					stroke-width="6"
				/>
				<rect
					x="32.6562"
					y="21.2132"
					width="22.4606"
					height="16.1818"
					rx="3.16312"
					transform="rotate(45 32.6562 21.2132)"
					stroke="#181818"
					stroke-width="6"
				/>
				<path
					d="M18.4429 18.1956L31.3426 31.0953"
					stroke="#181818"
					stroke-width="4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<LeafLinkPrompt slot="prompt" />
		</LeafMenuIcon>
		<LeafMenuSeperator />
		<LeafMenuIcon title="Code" markOrNode={leafSchema.nodes.code_block} command={setBlockType(leafSchema.nodes.code_block)}>
			<svg height="27" viewBox="0 0 49 27" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M14 3L3 14L14 25" stroke="#181818" stroke-width="4" />
				<path d="M35 25L46 14L35 3" stroke="#181818" stroke-width="4" />
				<path d="M18 26L26.3351 1.8813H30.9461L22.6109 26H18Z" fill="#181818" />
			</svg>
		</LeafMenuIcon>
		<LeafMenuIcon title="Blockquote" markOrNode={leafSchema.nodes.blockquote} command={wrapIn(leafSchema.nodes.blockquote)}>
			<svg height="30" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M0.76001 14.5489L0.760011 0L16.775 1.40008e-06L16.775 9.47368C16.775 18.1579 14.745 23.3459 10.7976 30H3.01565C5.49685 24.4737 7.0758 20.0752 7.0758 14.5489H0.76001ZM24.1059 14.5489L24.1059 2.04096e-06L40.0081 3.43118e-06V9.47369C40.0081 18.1579 37.9781 23.3459 34.1435 30H26.3615C28.7299 24.4737 30.3089 20.0752 30.3089 14.5489L24.1059 14.5489Z"
					fill="#181818"
				/>
			</svg>
		</LeafMenuIcon>
	</LeafMenuIconGroup>
</div>

<style>
	#lf-floating-menu {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		position: relative;
		min-height: 60px;
		min-width: 240px;
		background-color: var(--almost-white);
		box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.3);
	}

	svg {
		height: 100%;
		overflow: visible;
	}

	:global(.lf-floating-container) {
		z-index: 2000;
		position: absolute;
		background: var(--almost-white);
		margin-bottom: 7px;
		-webkit-transform: translateX(-50%);
		transform: translateX(-50%);
	}
</style>
