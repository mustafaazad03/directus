import type { Knex } from 'knex';

export async function up(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasSort = await knex.schema.hasColumn('directus_roles', 'sort');
  if (!hasSort) {
    await knex.schema.alterTable('directus_roles', (table) => {
      table.integer('sort').nullable();
    });
  }
}

export async function down(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasSort = await knex.schema.hasColumn('directus_roles', 'sort');
  if (hasSort) {
    await knex.schema.alterTable('directus_roles', (table) => {
      table.dropColumn('sort');
    });
  }
}


