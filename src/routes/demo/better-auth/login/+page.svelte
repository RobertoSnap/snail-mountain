<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Login</h1>
<form method="post" action="?/signInEmail" use:enhance class="flex flex-col gap-4">
	<Input type="email" name="email" label="Email" required />
	<Input type="password" name="password" label="Password" required />
	<Input name="name" label="Name (for registration)" />
	<Button type="submit">Login</Button>
	<Button type="submit" formaction="?/signUpEmail" variant="secondary">Register</Button>
</form>
<p class="text-red-500">{form?.message ?? ''}</p>
