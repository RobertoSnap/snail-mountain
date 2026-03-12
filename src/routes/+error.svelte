<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="text-center">
		<h1 class="text-6xl font-bold text-base-content/20">{page.status}</h1>
		<p class="mt-4 text-lg text-base-content/60">
			{#if page.status === 404}
				Siden ble ikke funnet.
			{:else}
				Noe gikk galt.
			{/if}
		</p>
		{#if page.error?.message}
			<p class="mt-2 text-sm text-base-content/40">{page.error.message}</p>
		{/if}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static path -->
		<a href="/" class="btn mt-6 btn-primary">Tilbake til forsiden</a>
	</div>
</div>
