<script lang="ts">
	let { data } = $props();

	const statusBadge: Record<string, string> = {
		queued: 'badge-info',
		running: 'badge-warning',
		needs_input: 'badge-secondary',
		verifying: 'badge-accent',
		done: 'badge-success',
		failed: 'badge-error'
	};
</script>

<div class="mx-auto max-w-6xl p-6">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">SnailMountain</h1>
		<span class="text-sm text-base-content/60">{data.runs.length} kjøringer</span>
	</div>

	{#if data.runs.length === 0}
		<div class="card bg-base-200">
			<div class="card-body items-center text-center">
				<p class="text-base-content/60">
					Ingen kjøringer enda. Assign en Linear issue til agenten for å starte.
				</p>
			</div>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Issue</th>
						<th>Repo</th>
						<th>Status</th>
						<th>Modell</th>
						<th>Kostnad</th>
						<th>Opprettet</th>
						<th>PR</th>
					</tr>
				</thead>
				<tbody>
					{#each data.runs as run (run.id)}
						<tr
							class="hover cursor-pointer"
							onclick={() => (window.location.href = `/runs/${run.id}`)}
						>
							<td>
								<div class="font-medium">{run.issueId}</div>
								<div class="text-sm text-base-content/60">{run.issueTitle}</div>
							</td>
							<td>{run.repoKey}</td>
							<td>
								<span class="badge {statusBadge[run.status] ?? 'badge-ghost'}">
									{run.status}
								</span>
							</td>
							<td>{run.model ?? '-'}</td>
							<td>
								{#if run.costUsd != null}
									${run.costUsd.toFixed(2)}
								{:else}
									-
								{/if}
							</td>
							<td>
								{#if run.createdAt}
									<span class="text-sm">{new Date(run.createdAt).toLocaleString('nb-NO')}</span>
								{/if}
							</td>
							<td>
								{#if run.prUrl}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
									<a href={run.prUrl} class="link link-primary" target="_blank" rel="noopener">
										PR
									</a>
								{:else if run.status === 'failed'}
									<span class="tooltip" data-tip={run.errorMessage}>
										<span class="text-sm text-error">Feilet</span>
									</span>
								{:else}
									-
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
