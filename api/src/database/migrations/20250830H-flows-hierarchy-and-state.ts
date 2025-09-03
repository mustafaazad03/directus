import type { Knex } from 'knex';

export async function up(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_flows');
  if (!hasTable) return;

  const [hasParent, hasSort, hasHidden, hasCollapse, hasFolderAtCamel, hasColor, hasFolderAtSnake] = await Promise.all([
    knex.schema.hasColumn('directus_flows', 'parent'),
    knex.schema.hasColumn('directus_flows', 'sort'),
    knex.schema.hasColumn('directus_flows', 'hidden'),
    knex.schema.hasColumn('directus_flows', 'collapse'),
    knex.schema.hasColumn('directus_flows', 'folderAt'),
    knex.schema.hasColumn('directus_flows', 'color'),
    knex.schema.hasColumn('directus_flows', 'folder_at'),
  ]);

  await knex.schema.alterTable('directus_flows', (table) => {
    if (!hasParent) table.uuid('parent').nullable();
    if (!hasSort) table.integer('sort').nullable();
    if (!hasHidden) table.boolean('hidden').notNullable().defaultTo(false);
    if (!hasCollapse) table.string('collapse', 16).nullable();
    if (!hasFolderAtSnake) table.timestamp('folder_at', { useTz: true }).nullable();
    if (!hasColor) table.string('color', 32).nullable();
  });

  // If legacy camelCase column exists, migrate its data into the new snake_case column, then drop it
  if (hasFolderAtCamel && !hasFolderAtSnake) {
    try {
      // copy values
      await knex('directus_flows')
        .whereNotNull('folderAt')
        .update({ folder_at: knex.ref('folderAt') });
    } catch {}

    try {
      await knex.schema.alterTable('directus_flows', (table) => {
        table.dropColumn('folderAt');
      });
    } catch {}
  }

  // Optional backfill: mark any flows that are parents as folders
  try {
    await knex('directus_flows')
      .whereIn('id', knex('directus_flows').select('parent').whereNotNull('parent'))
      .whereNull('folder_at')
      .update({ folder_at: knex.fn.now() });
  } catch {}
}

export async function down(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_flows');
  if (!hasTable) return;

  const [hasParent, hasSort, hasHidden, hasCollapse, hasFolderAtSnake, hasColor] = await Promise.all([
    knex.schema.hasColumn('directus_flows', 'parent'),
    knex.schema.hasColumn('directus_flows', 'sort'),
    knex.schema.hasColumn('directus_flows', 'hidden'),
    knex.schema.hasColumn('directus_flows', 'collapse'),
    knex.schema.hasColumn('directus_flows', 'folder_at'),
    knex.schema.hasColumn('directus_flows', 'color'),
  ]);

  await knex.schema.alterTable('directus_flows', (table) => {
    if (hasParent) table.dropColumn('parent');
    if (hasSort) table.dropColumn('sort');
    if (hasHidden) table.dropColumn('hidden');
    if (hasCollapse) table.dropColumn('collapse');
    if (hasFolderAtSnake) table.dropColumn('folder_at');
    if (hasColor) table.dropColumn('color');
  });
}


