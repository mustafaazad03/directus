import type { Knex } from 'knex';

export async function up(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasColor = await knex.schema.hasColumn('directus_roles', 'color');
  if (!hasColor) {
    await knex.schema.alterTable('directus_roles', (table) => {
      table.string('color', 32).nullable();
    });
  }
}

export async function down(knex: Knex) {
  const hasTable = await knex.schema.hasTable('directus_roles');
  if (!hasTable) return;

  const hasColor = await knex.schema.hasColumn('directus_roles', 'color');
  if (hasColor) {
    await knex.schema.alterTable('directus_roles', (table) => {
      table.dropColumn('color');
    });
  }
}


