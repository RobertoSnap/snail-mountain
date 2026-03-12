<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let mode: 'login' | 'register' = $state('login');
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200">
	<div class="card w-full max-w-sm bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title justify-center text-2xl">SnailMountain</h2>
			<p class="text-center text-sm text-base-content/60">
				{mode === 'login' ? 'Logg inn for å fortsette' : 'Opprett en ny konto'}
			</p>

			{#if form?.message}
				<div class="mt-2 alert alert-error">
					<span>{form.message}</span>
				</div>
			{/if}

			{#if mode === 'login'}
				<form method="post" action="?/signIn" use:enhance>
					<label class="fieldset-label" for="email">E-post</label>
					<input
						id="email"
						name="email"
						type="email"
						class="input-bordered input w-full"
						required
					/>

					<label class="fieldset-label" for="password">Passord</label>
					<input
						id="password"
						name="password"
						type="password"
						class="input-bordered input w-full"
						minlength="3"
						required
					/>

					<button type="submit" class="btn mt-4 w-full btn-primary">Logg inn</button>
				</form>
			{:else}
				<form method="post" action="?/signUp" use:enhance>
					<label class="fieldset-label" for="name">Navn</label>
					<input id="name" name="name" type="text" class="input-bordered input w-full" required />

					<label class="fieldset-label" for="email">E-post</label>
					<input
						id="email"
						name="email"
						type="email"
						class="input-bordered input w-full"
						required
					/>

					<label class="fieldset-label" for="password">Passord</label>
					<input
						id="password"
						name="password"
						type="password"
						class="input-bordered input w-full"
						minlength="3"
						required
					/>

					<button type="submit" class="btn mt-4 w-full btn-primary">Registrer</button>
				</form>
			{/if}

			<div class="divider text-xs">eller</div>

			<button
				class="btn btn-ghost btn-sm"
				onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
			>
				{mode === 'login' ? 'Opprett konto' : 'Har allerede konto? Logg inn'}
			</button>
		</div>
	</div>
</div>
