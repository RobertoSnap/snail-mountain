<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData, ActionData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let selectedProvider = $state('anthropic');
	let apiKey = $state('');
	let projectName = $state('');
	let selectedTeamId = $state('');
	let githubRepo = $state('');
	let saving = $state(false);

	let hasProjects = $derived(data.projects.length > 0);
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200 p-4">
	<div class="card w-full max-w-md bg-base-100 shadow-xl">
		<div class="card-body">
			<!-- Stepper -->
			<ul class="steps mb-6 w-full">
				<li class="step step-primary">Koble til Linear</li>
				<li class="step" class:step-primary={data.linearConnected}>Opprett prosjekt</li>
			</ul>

			{#if !data.linearConnected}
				<!-- Step 1: Connect Linear -->
				<h2 class="card-title justify-center text-2xl">Koble til Linear</h2>
				<p class="text-center text-sm text-base-content/60">
					Koble til Linear-kontoen din for å komme i gang.
				</p>

				{#if data.linearError}
					<div class="mt-2 alert alert-error">
						<span>{data.linearError}</span>
					</div>
				{/if}

				<a href="/api/linear/connect" class="btn mt-4 w-full btn-primary">Koble til Linear</a>
			{:else if !hasProjects}
				<!-- Step 2: Create Project -->
				<h2 class="card-title justify-center text-2xl">Opprett prosjekt</h2>
				<p class="text-center text-sm text-base-content/60">
					Konfigurer ditt første prosjekt for å komme i gang.
				</p>

				{#if form && 'error' in form}
					<div class="mt-2 alert alert-error">
						<span>{form.error}</span>
					</div>
				{/if}

				<form
					method="POST"
					action="?/createProject"
					use:enhance={() => {
						saving = true;
						return async ({ update }) => {
							saving = false;
							await update();
						};
					}}
					class="mt-4 space-y-4"
				>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Prosjektnavn</legend>
						<input
							type="text"
							name="name"
							bind:value={projectName}
							class="input-bordered input w-full"
							placeholder="Mitt prosjekt"
							required
						/>
					</fieldset>

					{#if data.linearTeams.length > 0}
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Linear-team</legend>
							<select
								name="linearTeamId"
								bind:value={selectedTeamId}
								class="select-bordered select w-full"
							>
								<option value="">Velg team...</option>
								{#each data.linearTeams as team (team.id)}
									<option value={team.id}>{team.key} — {team.name}</option>
								{/each}
							</select>
						</fieldset>
					{/if}

					<!-- AI Provider -->
					<fieldset class="fieldset">
						<legend class="fieldset-legend">AI-leverandør</legend>
						<div class="flex gap-3">
							<button
								type="button"
								class="btn flex-1"
								class:btn-primary={selectedProvider === 'anthropic'}
								class:btn-outline={selectedProvider !== 'anthropic'}
								onclick={() => (selectedProvider = 'anthropic')}
							>
								Claude
							</button>
							<button
								type="button"
								class="btn flex-1"
								class:btn-primary={selectedProvider === 'openai'}
								class:btn-outline={selectedProvider !== 'openai'}
								onclick={() => (selectedProvider = 'openai')}
							>
								Codex
							</button>
						</div>
					</fieldset>
					<input type="hidden" name="aiProvider" value={selectedProvider} />

					<fieldset class="fieldset">
						<legend class="fieldset-legend">
							{selectedProvider === 'anthropic' ? 'API-nøkkel / Token' : 'OpenAI API-nøkkel'}
						</legend>
						<input
							type="password"
							name="aiApiKey"
							bind:value={apiKey}
							class="input-bordered input w-full"
							placeholder={selectedProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
							required
						/>
					</fieldset>

					{#if selectedProvider === 'anthropic'}
						<p class="text-xs text-base-content/50">
							Bruk <kbd class="kbd kbd-xs">claude setup-token</kbd> for å generere en token med Max- eller
							Pro-abonnement, eller bruk en Anthropic API-nøkkel.
						</p>
					{/if}

					<fieldset class="fieldset">
						<legend class="fieldset-legend">GitHub-repo (valgfritt)</legend>
						<input
							type="text"
							name="githubRepo"
							bind:value={githubRepo}
							class="input-bordered input w-full"
							placeholder="owner/repo"
						/>
						<p class="mt-1 text-xs text-base-content/50">
							La stå tomt hvis prosjektet bare skriver til filer.
						</p>
					</fieldset>

					<button
						type="submit"
						class="btn w-full btn-primary"
						disabled={saving || !projectName.trim() || !apiKey.trim()}
					>
						{#if saving}
							<span class="loading loading-sm loading-spinner"></span>
						{/if}
						Opprett prosjekt
					</button>
				</form>
			{:else}
				<!-- All done -->
				<h2 class="card-title justify-center text-2xl">Oppsett fullført</h2>

				{#if form && 'success' in form}
					<div class="mt-2 alert alert-success">
						<span>Prosjekt opprettet!</span>
					</div>
				{/if}

				<div class="mt-4">
					<h3 class="text-lg font-semibold">Dine prosjekter</h3>
					<ul class="mt-2 space-y-2">
						{#each data.projects as proj (proj.id)}
							<li class="flex items-center justify-between rounded-lg bg-base-200 p-3">
								<span class="font-medium">{proj.name}</span>
								{#if proj.githubRepo}
									<span class="badge text-xs badge-neutral">{proj.githubRepo}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>

				<a href="/" class="btn mt-4 w-full btn-primary">Gå til dashboardet</a>
			{/if}
		</div>
	</div>
</div>
