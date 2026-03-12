<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-[50vh] flex-col items-center justify-center">
	<h1 class="text-4xl font-bold text-gray-900">{page.status}</h1>
	<p class="mt-2 text-lg text-gray-600">{page.error?.message}</p>
	<a
		href="/"
		class="mt-6 rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
	>
		Go home
	</a>
</div>
