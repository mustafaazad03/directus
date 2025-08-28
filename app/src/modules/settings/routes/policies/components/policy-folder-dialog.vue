<script setup lang="ts">
import { defineOptions } from 'vue';
defineOptions({ name: 'PolicyFolderDialog' });
import api from '@/api';
import { unexpectedError } from '@/utils/unexpected-error';
import { ref, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { isEqual } from 'lodash';
import { Policy } from '@directus/types';

const props = defineProps<{
	modelValue?: boolean;
	policy?: Policy | null;
}>();

const emit = defineEmits(['update:modelValue', 'created']);

const { t } = useI18n();

const values = reactive({
	name: props.policy?.name ?? null,
	icon: props.policy?.icon ?? 'folder',
	description: props.policy?.description ?? null,
	color: props.policy?.color ?? null,
});

watch(
	() => props.modelValue,
	(newValue, oldValue) => {
		if (isEqual(newValue, oldValue) === false) {
			values.name = props.policy?.name ?? null;
			values.icon = props.policy?.icon ?? 'folder';
			values.description = props.policy?.description ?? null;
			values.color = props.policy?.color ?? null;
		}
	},
);

const saving = ref(false);

function cancel() {
	emit('update:modelValue', false);
}

async function save() {
	if (!values.name || saving.value) return;

	saving.value = true;

	try {
		if (props.policy) {
			await api.patch(`/policies/${props.policy.id}`, values);
		} else {
			await api.post('/policies', { ...values, folderAt: new Date() });
		}

		emit('created');
		emit('update:modelValue', false);
	} catch (error) {
		unexpectedError(error);
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<v-dialog
		:model-value="modelValue"
		persistent
		keep-behind
		@update:model-value="$emit('update:modelValue', $event)"
		@esc="cancel"
		@apply="save"
	>
		<template #activator="slotBinding">
			<slot name="activator" v-bind="slotBinding" />
		</template>

		<v-card>
			<v-card-title v-if="!policy">{{ t('create_folder') }}</v-card-title>
			<v-card-title v-else>{{ t('edit_folder') }}</v-card-title>

			<v-card-text>
				<div class="fields">
					<v-input
						v-model="values.name"
						:disabled="!!policy"
						class="full policy-key"
						autofocus
						:placeholder="t('folder_name')"
					/>
					<interface-select-icon width="half" :value="values.icon" @input="values.icon = $event" />
					<interface-select-color width="half" :value="values.color" @input="values.color = $event" />
					<v-input v-model="values.description" class="full" :placeholder="t('description')" />
				</div>
			</v-card-text>

			<v-card-actions>
				<v-button secondary @click="cancel">
					{{ t('cancel') }}
				</v-button>
				<v-button :disabled="!values.name" :loading="saving" @click="save">
					{{ t('save') }}
				</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style scoped>
.fields {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

.full {
	grid-column: 1 / span 2;
}

.policy-key {
	--v-input-font-family: var(--theme--fonts--monospace--font-family);
}
</style>


