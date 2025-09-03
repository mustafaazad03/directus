import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Fields to be marked as system and hidden for the folder feature
    const fieldsToUpdate = [
        // directus_roles - folder feature fields
        { collection: 'directus_roles', field: 'sort' },
        { collection: 'directus_roles', field: 'parent' }, // This already exists in roles.yaml
        { collection: 'directus_roles', field: 'collapse' },
        { collection: 'directus_roles', field: 'color' },
        { collection: 'directus_roles', field: 'hidden' },
        { collection: 'directus_roles', field: 'folder_at' },
        
        // directus_policies - folder feature fields  
        { collection: 'directus_policies', field: 'sort' },
        { collection: 'directus_policies', field: 'parent' },
        { collection: 'directus_policies', field: 'collapse' },
        { collection: 'directus_policies', field: 'color' },
        { collection: 'directus_policies', field: 'hidden' },
        { collection: 'directus_policies', field: 'folder_at' },
        
        // directus_flows - folder feature fields
        { collection: 'directus_flows', field: 'sort' },
        { collection: 'directus_flows', field: 'parent' },
        { collection: 'directus_flows', field: 'collapse' },
        { collection: 'directus_flows', field: 'color' },
        { collection: 'directus_flows', field: 'hidden' },
        { collection: 'directus_flows', field: 'folder_at' }
    ];

    // Update each field to be hidden and system (only if the field exists)
    for (const { collection, field } of fieldsToUpdate) {
        // Check if the field exists in directus_fields
        const existingField = await knex('directus_fields')
            .where({ collection, field })
            .first();

        if (existingField) {
            // Update the individual columns (not meta object)
            await knex('directus_fields')
                .where({ collection, field })
                .update({ meta: { hidden: true, system: true } });
        }
    }
}

export async function down(knex: Knex): Promise<void> {
    // Revert the changes by setting hidden back to false
    const fieldsToRevert = [
        // directus_roles
        { collection: 'directus_roles', field: 'sort' },
        { collection: 'directus_roles', field: 'parent' },
        { collection: 'directus_roles', field: 'collapse' },
        { collection: 'directus_roles', field: 'color' },
        { collection: 'directus_roles', field: 'hidden' },
        { collection: 'directus_roles', field: 'folder_at' },
        
        // directus_policies
        { collection: 'directus_policies', field: 'sort' },
        { collection: 'directus_policies', field: 'parent' },
        { collection: 'directus_policies', field: 'collapse' },
        { collection: 'directus_policies', field: 'color' },
        { collection: 'directus_policies', field: 'hidden' },
        { collection: 'directus_policies', field: 'folder_at' },
        
        // directus_flows
        { collection: 'directus_flows', field: 'sort' },
        { collection: 'directus_flows', field: 'parent' },
        { collection: 'directus_flows', field: 'collapse' },
        { collection: 'directus_flows', field: 'color' },
        { collection: 'directus_flows', field: 'hidden' },
        { collection: 'directus_flows', field: 'folder_at' }
    ];

    for (const { collection, field } of fieldsToRevert) {
        const existingField = await knex('directus_fields')
            .where({ collection, field })
            .first();

        if (existingField) {
            await knex('directus_fields')
                .where({ collection, field })
                .update({
                    hidden: true,
                    system: true
                });
        }
    }
}
