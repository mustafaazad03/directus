import type { Knex } from 'knex';

export async function up(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_policies');
  if (!hasTable) return;

  const hasHidden = await knex.schema.hasColumn('directus_policies', 'hidden');
  const hasCollapse = await knex.schema.hasColumn('directus_policies', 'collapse');

  await knex.schema.alterTable('directus_policies', (table) => {
    if (!hasHidden) table.boolean('hidden').defaultTo(false).notNullable();
    if (!hasCollapse) table.string('collapse', 16).nullable();
  });
}

export async function down(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_policies');
  if (!hasTable) return;

  const hasHidden = await knex.schema.hasColumn('directus_policies', 'hidden');
  const hasCollapse = await knex.schema.hasColumn('directus_policies', 'collapse');

  await knex.schema.alterTable('directus_policies', (table) => {
    if (hasHidden) table.dropColumn('hidden');
    if (hasCollapse) table.dropColumn('collapse');
  });
}


