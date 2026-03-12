<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="mb-6 flex items-center gap-4 text-sm text-gray-500">
	<a href="/demo" class="hover:text-gray-700 transition">Demo Home</a>
	<span>/</span>
	<a href="/demo/better-auth" class="hover:text-gray-700 transition">Better Auth</a>
</div>

{@render children()}
