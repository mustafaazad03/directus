import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('directus_roles', 'folderAt');
  if (!hasColumn) {
    await knex.schema.alterTable('directus_roles', (table) => {
      table.timestamp('folderAt', { useTz: true }).nullable();
    });
  }

  // Backfill: set folderAt for existing folders (heuristic: records that are parents of other roles)
  try {
    await knex('directus_roles')
      .whereIn('id', knex('directus_roles').select('parent').whereNotNull('parent'))
      .whereNull('folderAt')
      .update({ folderAt: knex.fn.now() });
  } catch {
    // ignore backfill errors to avoid migration failure in edge environments
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('directus_roles', 'folderAt');
  if (!hasColumn) return;

  await knex.schema.alterTable('directus_roles', (table) => {
    table.dropColumn('folderAt');
  });
}


