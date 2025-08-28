import type { Knex } from 'knex';

export async function up(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_policies');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('directus_policies', 'color');
  if (hasColumn) return;

  await knex.schema.alterTable('directus_policies', (table) => {
    table.string('color', 30).nullable();
  });
}

export async function down(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_policies');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('directus_policies', 'color');
  if (!hasColumn) return;

  await knex.schema.alterTable('directus_policies', (table) => {
    table.dropColumn('color');
  });
}


