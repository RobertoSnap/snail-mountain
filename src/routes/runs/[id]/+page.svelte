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

	function formatPayload(json: string | null): string {
		if (!json) return '';
		try {
			return JSON.stringify(JSON.parse(json), null, 2);
		} catch {
			return json;
		}
	}
</script>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-2">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static path -->
		<a href="/" class="link text-sm">&larr; Tilbake</a>
	</div>

	<div class="mb-8">
		<h1 class="text-2xl font-bold">{data.run.issueId}: {data.run.issueTitle}</h1>
		<div class="mt-2 flex flex-wrap gap-2">
			<span class="badge {statusBadge[data.run.status] ?? 'badge-ghost'}">
				{data.run.status}
			</span>
			<span class="badge badge-outline">{data.run.repoKey}</span>
			{#if data.run.model}
				<span class="badge badge-outline">{data.run.model}</span>
			{/if}
		</div>
	</div>

	<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-lg bg-base-200 p-4">
			<div class="text-sm text-base-content/60">Kostnad</div>
			<div class="text-lg font-semibold">
				{data.run.costUsd != null ? `$${data.run.costUsd.toFixed(2)}` : '-'}
			</div>
		</div>
		<div class="rounded-lg bg-base-200 p-4">
			<div class="text-sm text-base-content/60">Budsjett</div>
			<div class="text-lg font-semibold">
				{data.run.budgetUsd != null ? `$${data.run.budgetUsd.toFixed(2)}` : '-'}
			</div>
		</div>
		<div class="rounded-lg bg-base-200 p-4">
			<div class="text-sm text-base-content/60">Opprettet</div>
			<div class="text-sm font-semibold">
				{data.run.createdAt ? new Date(data.run.createdAt).toLocaleString('nb-NO') : '-'}
			</div>
		</div>
		<div class="rounded-lg bg-base-200 p-4">
			<div class="text-sm text-base-content/60">PR</div>
			<div class="text-sm font-semibold">
				{#if data.run.prUrl}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
					<a href={data.run.prUrl} class="link link-primary" target="_blank" rel="noopener">
						Se PR
					</a>
				{:else}
					-
				{/if}
			</div>
		</div>
	</div>

	{#if data.run.errorMessage}
		<div class="mb-8 alert alert-error">
			<span>{data.run.errorMessage}</span>
		</div>
	{/if}

	<h2 class="mb-4 text-xl font-bold">Audit Log</h2>

	{#if data.events.length === 0}
		<p class="text-base-content/60">Ingen events enda.</p>
	{:else}
		<ul class="timeline timeline-vertical timeline-compact">
			{#each data.events as event (event.id)}
				<li>
					<div class="timeline-start text-sm text-base-content/60">
						{event.createdAt ? new Date(event.createdAt).toLocaleTimeString('nb-NO') : ''}
					</div>
					<div class="timeline-middle">
						<div class="h-3 w-3 rounded-full bg-primary"></div>
					</div>
					<div class="timeline-end timeline-box">
						<div class="font-mono text-sm font-semibold">{event.eventType}</div>
						{#if event.payloadJson}
							<pre class="mt-1 max-h-40 overflow-auto text-xs text-base-content/70">{formatPayload(
									event.payloadJson
								)}</pre>
						{/if}
					</div>
					<hr />
				</li>
			{/each}
		</ul>
	{/if}
</div>
