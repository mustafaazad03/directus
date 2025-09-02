import type { Knex } from 'knex';

export async function up(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_flows');
  if (!hasTable) return;

  const [hasParent, hasSort, hasHidden, hasCollapse, hasFolderAt, hasColor] = await Promise.all([
    knex.schema.hasColumn('directus_flows', 'parent'),
    knex.schema.hasColumn('directus_flows', 'sort'),
    knex.schema.hasColumn('directus_flows', 'hidden'),
    knex.schema.hasColumn('directus_flows', 'collapse'),
    knex.schema.hasColumn('directus_flows', 'folderAt'),
    knex.schema.hasColumn('directus_flows', 'color'),
  ]);

  await knex.schema.alterTable('directus_flows', (table) => {
    if (!hasParent) table.uuid('parent').nullable();
    if (!hasSort) table.integer('sort').nullable();
    if (!hasHidden) table.boolean('hidden').notNullable().defaultTo(false);
    if (!hasCollapse) table.string('collapse', 16).nullable();
    if (!hasFolderAt) table.timestamp('folderAt', { useTz: true }).nullable();
    if (!hasColor) table.string('color', 32).nullable();
  });

  // Optional backfill: mark any flows that are parents as folders
  try {
    await knex('directus_flows')
      .whereIn('id', knex('directus_flows').select('parent').whereNotNull('parent'))
      .whereNull('folderAt')
      .update({ folderAt: knex.fn.now() });
  } catch {}
}

export async function down(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_flows');
  if (!hasTable) return;

  const [hasParent, hasSort, hasHidden, hasCollapse, hasFolderAt, hasColor] = await Promise.all([
    knex.schema.hasColumn('directus_flows', 'parent'),
    knex.schema.hasColumn('directus_flows', 'sort'),
    knex.schema.hasColumn('directus_flows', 'hidden'),
    knex.schema.hasColumn('directus_flows', 'collapse'),
    knex.schema.hasColumn('directus_flows', 'folderAt'),
    knex.schema.hasColumn('directus_flows', 'color'),
  ]);

  await knex.schema.alterTable('directus_flows', (table) => {
    if (hasParent) table.dropColumn('parent');
    if (hasSort) table.dropColumn('sort');
    if (hasHidden) table.dropColumn('hidden');
    if (hasCollapse) table.dropColumn('collapse');
    if (hasFolderAt) table.dropColumn('folderAt');
    if (hasColor) table.dropColumn('color');
  });
}


