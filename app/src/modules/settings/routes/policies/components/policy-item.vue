<script setup lang="ts">
import { Policy } from '@directus/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Draggable from 'vuedraggable';
import PolicyOptions from './policy-options.vue';

export interface PolicyTree {
	id: string;
	visible: boolean;
	children: PolicyTree[];
	search: string | null;
	findChild(id: string): PolicyTree | undefined;
}

const props = defineProps<{
	policy: Policy & { isCollapsed?: boolean; userCount?: number; roleCount?: number };
	policies: (Policy & { isCollapsed?: boolean; userCount?: number; roleCount?: number })[];
	isCollapsed: boolean;
	visibilityTree: PolicyTree;
	disableDrag?: boolean;
}>();

const emit = defineEmits(['setNestedSort', 'editPolicy', 'toggleCollapse', 'updatePolicy', 'deletePolicy']);

const { t } = useI18n();

const toggleCollapse = () => {
	emit('toggleCollapse', props.policy.id);
};

const nestedPolicies = computed(() =>
	props.policies.filter((policy) => policy.parent === props.policy.id),
);

const hasChildren = computed(() => nestedPolicies.value.length > 0);

function onGroupSortChange(policies: Policy[]) {
	const updates = policies.map((policy) => ({
		id: policy.id,
		parent: props.policy.id,
	}));

	emit('setNestedSort', updates);
}
</script>

<template>
	<div v-show="visibilityTree.visible" class="policy-item">
		<v-list-item
			block
			dense
			clickable
			:class="{ hidden: (policy as any).hidden }"
			:to="(policy as any).folderAt ? undefined : `/settings/policies/${policy.id}`"
			@click.self="(policy as any).folderAt ? $emit('editPolicy', policy) : null"
		>
			<v-list-item-icon class="drag-handle" :class="{ disabled: disableDrag }">
				<v-icon name="drag_handle" />
			</v-list-item-icon>

			<v-list-item-icon>
				<v-icon :name="hasChildren ? 'folder' : (policy.icon || 'badge')" :color="policy.color" />
			</v-list-item-icon>

			<div class="policy-name">
				<v-text-overflow :text="policy.name" />
			</div>

			<div class="spacer" />

			<div v-if="hasChildren && (policy as any).collapse !== 'locked'" class="expand-toggle" @click.stop.prevent="toggleCollapse">
				<v-icon v-tooltip="!isCollapsed ? t('collapse') : t('expand')" :name="!isCollapsed ? 'unfold_less' : 'unfold_more'" />
			</div>

			<policy-options
				v-if="(policy as any).folderAt !== null && (policy as any).folderAt !== undefined"
				:policy="policy"
				:has-nested-policies="hasChildren"
				@delete="$emit('deletePolicy', policy)"
				@update="$emit('updatePolicy', { id: policy.id, ...$event })"
			/>
		</v-list-item>

		<transition-expand>
			<draggable
				v-if="hasChildren && !isCollapsed"
				v-show="nestedPolicies.some((policy) => visibilityTree.findChild?.(policy.id)?.visible)"
				tag="v-list"
				:model-value="nestedPolicies"
				:group="{ name: 'policies' }"
				:swap-threshold="0.3"
				class="nested draggable-list"
				item-key="id"
				handle=".drag-handle:not(.disabled)"
				v-bind="{ 'force-fallback': true }"
				@update:model-value="onGroupSortChange"
			>
				<template #item="{ element }">
					<policy-item
						:policy="element"
						:policies="policies"
						:is-collapsed="element.isCollapsed"
						:visibility-tree="visibilityTree.findChild?.(element.id)!"
						@edit-policy="$emit('editPolicy', $event)"
						@set-nested-sort="$emit('setNestedSort', $event)"
						@toggle-collapse="$emit('toggleCollapse', $event)"
						@update-policy="$emit('updatePolicy', $event)"
						@delete-policy="$emit('deletePolicy', $event)"
					/>
				</template>
			</draggable>
		</transition-expand>
	</div>
</template>

<style lang="scss" scoped>
.policy-item {
	margin-bottom: 8px;
	.v-list-item {
		--v-list-item-min-height: 48px;
		--v-list-item-padding: 0 8px;

		margin-bottom: 2px;
		padding-left: 8px;
		border-radius: 4px;

		.drag-handle {
			cursor: grab;
			margin-right: 8px;

			&.disabled {
				cursor: default;
			}
		}

		.expand-toggle {
			--v-icon-color: var(--theme--foreground-subdued);

			margin-right: 8px;
			cursor: pointer;
			transition: color var(--fast) var(--transition);

			&:hover {
				--v-icon-color: var(--theme--foreground);
			}
		}

		.policy-name {
			flex-grow: 1;
			margin-right: 12px;
			margin-left: 10px;
		}
	}

	& :deep(.v-list-item.hidden) {
		--v-list-item-color: var(--theme--foreground-subdued);
	}

	.spacer {
		flex-grow: 1;
	}

	.nested {
		margin-left: 20px;
	}
}

.draggable-list :deep(.sortable-ghost) {
	.v-list-item {
		--v-list-item-background-color: var(--theme--primary-background);
		--v-list-item-border-color: var(--theme--primary);
		--v-list-item-background-color-hover: var(--theme--primary-background);
		--v-list-item-border-color-hover: var(--theme--primary);

		> * {
			opacity: 0;
		}
	}
}
</style>
