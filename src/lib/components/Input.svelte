<script lang="ts">
	interface Props {
		type?: string;
		name: string;
		label?: string;
		value?: string;
		placeholder?: string;
		required?: boolean;
		[key: string]: unknown;
	}

	let { type = 'text', name, label, value = '', placeholder, required = false, ...rest }: Props = $props();
</script>

<label>
	{#if label}
		<span class="block text-sm font-medium text-gray-700">{label}</span>
	{/if}
	<input
		{type}
		{name}
		{value}
		{placeholder}
		{required}
		class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		{...rest}
	/>
</label>
