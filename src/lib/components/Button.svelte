<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary';
		type?: 'button' | 'submit' | 'reset';
		children: Snippet;
		[key: string]: unknown;
	}

	let { children, variant = 'primary', type = 'button', ...rest }: Props = $props();

	const variantClasses = {
		primary: 'rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700',
		secondary: 'rounded-md bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300'
	};
</script>

<button {type} class={variantClasses[variant]} {...rest}>
	{@render children()}
</button>
