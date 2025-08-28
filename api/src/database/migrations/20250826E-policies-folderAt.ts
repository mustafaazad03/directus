import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	const hasTable = await knex.schema.hasTable('directus_policies');
	if (!hasTable) return;

	const hasColumn = await knex.schema.hasColumn('directus_policies', 'folderAt');
	if (hasColumn) return;

	await knex.schema.alterTable('directus_policies', (table) => {
		table.timestamp('folderAt', { useTz: true }).nullable();
	});

	// Backfill: set folderAt for existing folders (heuristic: records that are parents of other policies)
	try {
		await knex('directus_policies')
			.whereIn('id', knex('directus_policies').select('parent').whereNotNull('parent'))
			.whereNull('folderAt')
			.update({ folderAt: knex.fn.now() });
	} catch {
		// ignore backfill errors to avoid migration failure in edge environments
	}
}

export async function down(knex: Knex): Promise<void> {
	const hasTable = await knex.schema.hasTable('directus_policies');
	if (!hasTable) return;

	const hasColumn = await knex.schema.hasColumn('directus_policies', 'folderAt');
	if (!hasColumn) return;

	await knex.schema.alterTable('directus_policies', (table) => {
		table.dropColumn('folderAt');
	});
}
