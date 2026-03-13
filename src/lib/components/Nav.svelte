<script lang="ts">
	import { page } from '$app/state';

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/demo', label: 'Demo' }
	];
</script>

<nav class="flex items-center gap-6 border-b border-gray-200 bg-white px-6 py-3">
	<a href="/" class="font-bold text-gray-900">Snail Mountain</a>

	<div class="ml-auto flex items-center gap-6">
		{#each links as link (link.href)}
			<a
				href={link.href}
				class="text-sm text-gray-600 hover:text-gray-900 transition{page.url.pathname === link.href
					? ' font-semibold text-gray-900'
					: ''}"
			>
				{link.label}
			</a>
		{/each}
	</div>
</nav>
