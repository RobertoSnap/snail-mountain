<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutServerData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutServerData; children: Snippet } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if data.user}
	<div class="navbar bg-base-100 shadow-sm">
		<div class="mx-auto flex w-full max-w-6xl items-center px-6">
			<div class="flex-1">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static path -->
				<a href="/" class="btn text-xl btn-ghost">SnailMountain</a>
			</div>
			<div class="flex-none gap-2">
				<span class="text-sm text-base-content/60">{data.user.email}</span>
				<form method="post" action="/login?/signOut">
					<button class="btn btn-ghost btn-sm">Logg ut</button>
				</form>
			</div>
		</div>
	</div>
{/if}

{@render children()}
