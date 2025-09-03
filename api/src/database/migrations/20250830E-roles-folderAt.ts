import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const [hasCamel, hasSnake] = await Promise.all([
    knex.schema.hasColumn('directus_roles', 'folderAt'),
    knex.schema.hasColumn('directus_roles', 'folder_at'),
  ]);

  if (!hasSnake) {
    await knex.schema.alterTable('directus_roles', (table) => {
      table.timestamp('folder_at', { useTz: true }).nullable();
    });
  }

  if (hasCamel && !hasSnake) {
    try {
      await knex('directus_roles')
        .whereNotNull('folderAt')
        .update({ folder_at: knex.ref('folderAt') });
    } catch {}

    try {
      await knex.schema.alterTable('directus_roles', (table) => {
        table.dropColumn('folderAt');
      });
    } catch {}
  }

  // Backfill: set folderAt for existing folders (heuristic: records that are parents of other roles)
  try {
    await knex('directus_roles')
      .whereIn('id', knex('directus_roles').select('parent').whereNotNull('parent'))
      .whereNull('folder_at')
      .update({ folder_at: knex.fn.now() });
  } catch {
    // ignore backfill errors to avoid migration failure in edge environments
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasSnake = await knex.schema.hasColumn('directus_roles', 'folder_at');
  if (!hasSnake) return;

  await knex.schema.alterTable('directus_roles', (table) => {
    table.dropColumn('folder_at');
  });
}


