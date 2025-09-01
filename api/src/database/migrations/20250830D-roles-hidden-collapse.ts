import type { Knex } from 'knex';

export async function up(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasHidden = await knex.schema.hasColumn('directus_roles', 'hidden');
  const hasCollapse = await knex.schema.hasColumn('directus_roles', 'collapse');

  await knex.schema.alterTable('directus_roles', (table) => {
    if (!hasHidden) table.boolean('hidden').defaultTo(false).notNullable();
    if (!hasCollapse) table.string('collapse', 16).nullable();
  });
}

export async function down(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasHidden = await knex.schema.hasColumn('directus_roles', 'hidden');
  const hasCollapse = await knex.schema.hasColumn('directus_roles', 'collapse');

  await knex.schema.alterTable('directus_roles', (table) => {
    if (hasHidden) table.dropColumn('hidden');
    if (hasCollapse) table.dropColumn('collapse');
  });
}


