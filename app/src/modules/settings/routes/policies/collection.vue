<script setup lang="ts">
import api from '@/api';
import { fetchAll } from '@/utils/fetch-all';
import { translate } from '@/utils/translate-object-values';
import { unexpectedError } from '@/utils/unexpected-error';
import SearchInput from '@/views/private/components/search-input.vue';
import { Policy } from '@directus/types';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import SettingsNavigation from '../../components/navigation.vue';
import PolicyFolderDialog from './components/policy-folder-dialog.vue';
import PolicyItem from './components/policy-item.vue';
import Draggable from 'vuedraggable';
import { merge } from 'lodash';
import { useExpandCollapse } from './composables/use-expand-collapse';

// PolicyBaseFields retained for potential future narrowing, but currently unused

type PolicyResponse = Policy & {
  parent?: string | null;
  color?: string | null;
  sort?: number | null;
  hidden?: boolean | null;
  collapse?: 'open' | 'collapsed' | 'locked' | null;
  folder_at?: string | null;
  users: [{ count: { user: number } }];
  roles: [{ count: { role: number } }];
};

type PolicyItem = Policy & {
  parent?: string | null;
  color?: string | null;
  sort?: number | null;
  hidden?: boolean | null;
  collapse?: 'open' | 'collapsed' | 'locked' | null;
  folder_at?: string | null;
  userCount?: number;
  roleCount?: number;
  isCollapsed?: boolean;
};

const { t } = useI18n();
const router = useRouter();

const search = ref<string | null>(null);
const policyDialogActive = ref(false);
const editPolicy = ref<PolicyItem | null>();

const policies = ref<PolicyItem[]>([]);
const loading = ref(false);

const { collapsedIds, hasExpandablePolicies, expandAll, toggleCollapse } = useExpandCollapse();

const translatedPolicies = computed(() => {
	return translate(policies.value).map((policy) => ({
		...policy,
		isCollapsed: (policy as any).collapse === 'locked' ? false : collapsedIds.value?.includes(policy.id),
	}));
});

function collapseAllAll() {
	collapsedIds.value = translatedPolicies.value.map((p) => p.id);
}

const rootPolicies = computed(() => {
	return translatedPolicies.value.filter((policy) => !policy.parent);
});

export type PolicyTree = {
	id: string;
	visible: boolean;
	children: PolicyTree[];
	search: string | null;
	findChild(id: string): PolicyTree | undefined;
};

function findVisibilityChild(
	id: string,
	tree: PolicyTree[] = visibilityTree.value,
): PolicyTree | undefined {
	return tree.find((child) => child.id === id);
}

const visibilityTree = computed(() => {
	const tree: PolicyTree[] = makeTree();
	const propagateBackwards: PolicyTree[] = [];

	function makeTree(parent: string | null = null): PolicyTree[] {
		const children = translatedPolicies.value.filter(
			(policy) => (policy.parent ?? null) === parent,
		);

		const normalizedSearch = search.value?.toLowerCase();

		return children.map((policy) => ({
			id: policy.id,
			visible: normalizedSearch ? policy.name?.toLowerCase().includes(normalizedSearch) : true,
			search: search.value,
			children: makeTree(policy.id),
			findChild(id: string) {
				return findVisibilityChild(id, this.children);
			},
		}));
	}

	breadthSearch(tree);

	function breadthSearch(tree: PolicyTree[]) {
		for (const policy of tree) {
			if (policy.children.length === 0) continue;

			propagateBackwards.unshift(policy);
		}

		for (const policy of tree) {
			breadthSearch(policy.children);
		}
	}

	for (const child of propagateBackwards) {
		child.visible = child.visible || child.children.some((child) => child.visible);
	}

	return tree;
});

fetchPolicies();

const addNewLink = computed(() => {
	return `/settings/policies/+`;
});

async function fetchPolicies() {
	loading.value = true;

	try {
		const response = await fetchAll<PolicyResponse>(`/policies`, {
			params: {
				limit: -1,
				fields: [
					'id',
					'name',
					'icon',
					'description',
					'parent',
					'color',
					'sort',
					'hidden',
					'collapse',
					'folder_at',
					'admin_access',
					'users',
					'roles',
				],
				deep: {
					users: {
						_aggregate: { count: 'user' },
						_groupBy: ['policy'],
						_sort: 'policy',
						_limit: -1,
					},
					roles: {
						_aggregate: { count: 'role' },
						_groupBy: ['policy'],
						_sort: 'policy',
						_limit: -1,
					},
				},
				sort: ['sort', 'name'],
			},
		});

		policies.value = response.map((policy) => {
			return {
				...translate(policy),
				userCount: policy.users?.[0]?.count.user ?? 0,
				roleCount: policy.roles?.[0]?.count.role ?? 0,
			};
		});

		// Normalize collapse-all sentinel to actual IDs so toggling works afterwards
		if (collapsedIds.value?.includes('__ALL__')) {
			collapsedIds.value = policies.value.map((p) => p.id);
		}
	} catch (error) {
		unexpectedError(error);
	} finally {
		loading.value = false;
	}
}

async function onSort(updates: PolicyItem[], removeGroup = false) {
	const updatesWithSortValue = updates.map((policy, index) =>
		merge(policy, { sort: index + 1, parent: removeGroup ? null : policy.parent }),
	);

	policies.value = policies.value.map((policy) => {
		const updatedValues = updatesWithSortValue.find(
			(updatedPolicy) => updatedPolicy.id === policy.id,
		);

		return updatedValues ? merge({}, policy, updatedValues) : policy;
	});

	try {
		await api.patch(
			`/policies`,
			updatesWithSortValue.map((policy) => {
				return {
					id: policy.id,
					sort: policy.sort,
					parent: policy.parent,
				};
			}),
		);
		await fetchPolicies();
	} catch (error) {
		unexpectedError(error);
	}
}

async function onUpdatePolicy(payload: { id: string; hidden?: boolean; collapse?: 'open' | 'collapsed' | 'locked' | null }) {
	try {
		await api.patch(`/policies/${payload.id}`, {
			hidden: payload.hidden,
			collapse: payload.collapse,
		});
		// Update local state optimistically
		policies.value = policies.value.map((p) => (p.id === payload.id ? ({ ...p, ...payload } as any) : p));
	} catch (error) {
		unexpectedError(error);
	}
}

function navigateToPolicy({ item }: { item: PolicyItem }) {
	const isFolder = item.folder_at !== null && item.folder_at !== undefined;
	if (isFolder) {
		// ensure only the edit dialog is shown
		policyDialogActive.value = false;
		editPolicy.value = item;
	} else {
		router.push(`/settings/policies/${item.id}`);
	}
}

async function deletePolicy(policy: PolicyItem) {
	try {
		await api.delete(`/policies/${policy.id}`);
		await fetchPolicies();
	} catch (error) {
		unexpectedError(error);
	}
}
</script>

<template>
	<private-view :title="t('settings_permissions')">
		<template #headline>
			<v-breadcrumb :items="[{ name: t('settings'), to: '/settings' }]" />
		</template>

		<template #title-outer:prepend>
			<v-button class="header-icon" rounded icon exact disabled>
				<v-icon name="admin_panel_settings" />
			</v-button>
		</template>

		<template #actions>
			<search-input
				v-model="search"
				:show-filter="false"
				:autofocus="policies.length > 25"
				:placeholder="t('search_policy')"
			/>

			<policy-folder-dialog v-model="policyDialogActive" @created="fetchPolicies">
				<template #activator="{ on }">
					<v-button v-tooltip.bottom="t('create_folder')" rounded icon secondary @click="on">
						<v-icon name="create_new_folder" />
					</v-button>
				</template>
			</policy-folder-dialog>

			<v-button v-tooltip.bottom="t('create_policy')" rounded icon :to="addNewLink">
				<v-icon name="add" />
			</v-button>
		</template>

		<template #navigation>
			<settings-navigation />
		</template>

		<div class="padding-box">
			<v-info v-if="policies.length === 0" icon="admin_panel_settings" :title="t('no_policies')">
				{{ t('no_policies_copy') }}

				<template #append>
					<v-button :to="addNewLink">{{ t('create_policy') }}</v-button>
				</template>
			</v-info>

			<template v-else>
				<transition-expand>
					<div v-if="hasExpandablePolicies" class="expand-collapse-button">
						{{ t('expand') }}
						<button @click="expandAll">{{ t('all') }}</button>
						/
						<button @click="collapseAllAll">{{ t('none') }}</button>
					</div>
				</transition-expand>
				<draggable
					tag="v-list"
					:model-value="rootPolicies"
					:group="{ name: 'policies' }"
					:swap-threshold="0.3"
					class="root-drag-container draggable-list"
					item-key="id"
					handle=".drag-handle"
					v-bind="{ 'force-fallback': true }"
					@update:model-value="onSort($event, true)"
				>
					<template #item="{ element }">
						<policy-item
							:policy="element"
							:policies="translatedPolicies"
							:is-collapsed="element.isCollapsed"
							:visibility-tree="findVisibilityChild(element.id)!"
							@edit-policy="editPolicy = $event"
							@set-nested-sort="onSort"
							@toggle-collapse="toggleCollapse"
							@update-policy="onUpdatePolicy"
							@delete-policy="deletePolicy"
							@click="navigateToPolicy({ item: element })"
						/>
					</template>
				</draggable>
			</template>
		</div>

		<router-view name="add" />

		<template #sidebar>
			<sidebar-detail icon="info" :title="t('information')" close>
				<div v-md="t('page_help_settings_policies_collection')" class="page-description" />
			</sidebar-detail>
		</template>

		<policy-folder-dialog
			:model-value="!!editPolicy"
			:policy="editPolicy"
			@update:model-value="editPolicy = null"
			@created="fetchPolicies"
		/>
	</private-view>
</template>

<style scoped lang="scss">
.padding-box {
	padding: var(--content-padding);
	padding-block-start: 0;
}

.v-info {
	padding: var(--content-padding) 0;
}

.root-drag-container {
	padding: 8px 0;
	overflow: hidden;
}

.header-icon {
	--v-button-color-disabled: var(--theme--primary);
	--v-button-background-color-disabled: var(--theme--primary-background);
	--v-button-background-color-hover-disabled: var(--theme--primary-subdued);
	--v-button-color-hover-disabled: var(--theme--primary);
}

.policy-item.hidden {
	--v-list-item-color: var(--theme--foreground-subdued);
}

.policy-icon {
	margin-inline-end: 8px;
}

.hidden .policy-name {
	color: var(--theme--foreground-subdued);
	flex-grow: 1;
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

.expand-collapse-button {
	padding-block: 4px 8px;
	text-align: end;
	color: var(--theme--foreground-subdued);

	button {
		color: var(--theme--foreground-subdued);
		transition: color var(--fast) var(--transition);
	}

	button:hover {
		color: var(--theme--foreground);
		transition: none;
	}
}

.v-list.draggable-list {
	padding-block-start: 0;
}
</style>