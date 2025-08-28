<script setup lang="ts">
import { Policy } from '@directus/types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
	policy: Policy & { hidden?: boolean; collapse?: 'open' | 'collapsed' | 'locked' | null };
	hasNestedPolicies: boolean;
}>();

const emit = defineEmits(['delete', 'update']);

const { t } = useI18n();

const confirmDelete = ref(false);

function deletePolicy() {
	emit('delete', props.policy);
}
</script>

<template>
	<v-menu placement="bottom-end">
		<template #activator="{ on }">
			<v-icon
				class="ctx-toggle"
				name="more_horiz"
				clickable
				@click.stop="on"
			/>
		</template>

		<v-list>
			<v-list-item clickable @click="$emit('update', { hidden: !(props.policy.hidden ?? false) })">
				<template v-if="props.policy.hidden === false">
					<v-list-item-icon><v-icon name="visibility_off" /></v-list-item-icon>
					<v-list-item-content>
						{{ t('make_folder_hidden') }}
					</v-list-item-content>
				</template>
				<template v-else>
					<v-list-item-icon><v-icon name="visibility" /></v-list-item-icon>
					<v-list-item-content>
						{{ t('make_folder_visible') }}
					</v-list-item-content>
				</template>
			</v-list-item>

			<v-divider />

			<v-list-item :active="props.policy.collapse === 'open'" clickable @click="$emit('update', { collapse: 'open' })">
				<v-list-item-icon>
					<v-icon name="folder_open" />
				</v-list-item-icon>
				<v-list-item-content>
					{{ t('start_open') }}
				</v-list-item-content>
			</v-list-item>

			<v-list-item :active="props.policy.collapse === 'collapsed'" clickable @click="$emit('update', { collapse: 'collapsed' })">
				<v-list-item-icon>
					<v-icon name="folder" />
				</v-list-item-icon>
				<v-list-item-content>
					{{ t('start_collapsed') }}
				</v-list-item-content>
			</v-list-item>

			<v-list-item :active="props.policy.collapse === 'locked'" clickable @click="$emit('update', { collapse: 'locked' })">
				<v-list-item-icon>
					<v-icon name="folder_lock" />
				</v-list-item-icon>
				<v-list-item-content>
					{{ t('always_open') }}
				</v-list-item-content>
			</v-list-item>

			<v-divider />

			<v-list-item v-if="hasNestedPolicies" clickable @click="confirmDelete = true">
				<v-list-item-icon>
					<v-icon name="delete" />
				</v-list-item-icon>
				<v-list-item-content>
					<span>{{ t('delete_folder') }}</span>
				</v-list-item-content>
			</v-list-item>
		</v-list>
	</v-menu>

	<v-dialog v-model="confirmDelete" @esc="confirmDelete = false">
		<v-card>
			<v-card-title>{{ t('delete_are_you_sure') }}</v-card-title>
			<v-card-text>
				{{ t('delete_folder_copy') }}
			</v-card-text>
			<v-card-actions>
				<v-button secondary @click="confirmDelete = false">
					{{ t('cancel') }}
				</v-button>
				<v-button kind="danger" @click="deletePolicy">
					{{ t('delete_label') }}
				</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style lang="scss" scoped>
.ctx-toggle {
	--v-icon-color: var(--theme--foreground-subdued);

	transition: color var(--fast) var(--transition);

	&:hover {
		--v-icon-color: var(--theme--foreground);
	}
}
</style>
