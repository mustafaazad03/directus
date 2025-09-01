<script setup lang="ts">
import api from '@/api';
import { fetchAll } from '@/utils/fetch-all';
import { translate } from '@/utils/translate-object-values';
import { unexpectedError } from '@/utils/unexpected-error';
import SearchInput from '@/views/private/components/search-input.vue';
import { Role } from '@directus/types';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import SettingsNavigation from '../../components/navigation.vue';
import RoleFolderDialog from './components/role-folder-dialog.vue';
import RoleItem from './components/role-item.vue';
import Draggable from 'vuedraggable';
import { merge } from 'lodash';
import { useExpandCollapse } from './composables/use-expand-collapse';

// Base fields mirrored from Policies implementation
type RoleBaseFields =
	| 'id'
	| 'name'
	| 'icon'
	| 'description'
	| 'parent'
	| 'color'
	| 'sort'
	| 'hidden'
	| 'collapse'
	| 'folderAt';

type RoleResponse = Pick<Role, RoleBaseFields> & {
	users: [{ count: { id: number } }];
};

type RoleItemType = Pick<Role, RoleBaseFields> & {
	userCount?: number;
	isCollapsed?: boolean;
};

const { t } = useI18n();
const router = useRouter();

const search = ref<string | null>(null);
const roleDialogActive = ref(false);
const editRole = ref<RoleItemType | null>();

const roles = ref<RoleItemType[]>([]);
const loading = ref(false);

const { collapsedIds, hasExpandableRoles, expandAll, collapseAll, toggleCollapse } = useExpandCollapse();

const translatedRoles = computed(() => {
	return translate(roles.value).map((role) => ({
		...role,
		isCollapsed: (role as any).collapse === 'locked' ? false : collapsedIds.value?.includes((role as any).id),
	}));
});

function collapseAllAll() {
	collapsedIds.value = translatedRoles.value.map((r) => (r as any).id) as any;
}

const rootRoles = computed(() => {
	return translatedRoles.value.filter((role) => !(role as any).parent);
});

export type RoleTree = {
	id: string;
	visible: boolean;
	children: RoleTree[];
	search: string | null;
	findChild(id: string): RoleTree | undefined;
};

function findVisibilityChild(
	id: string,
	tree: RoleTree[] = visibilityTree.value,
): RoleTree | undefined {
	return tree.find((child) => child.id === id);
}

const visibilityTree = computed(() => {
	const tree: RoleTree[] = makeTree();
	const propagateBackwards: RoleTree[] = [];

	function makeTree(parent: string | null = null): RoleTree[] {
		const children = translatedRoles.value.filter(
			(role) => (((role as any).parent ?? null) as any) === parent,
		);

		const normalizedSearch = search.value?.toLowerCase();

		return children.map((role: any) => ({
			id: role.id,
			visible: normalizedSearch ? role.name?.toLowerCase().includes(normalizedSearch) : true,
			search: search.value,
			children: makeTree(role.id),
			findChild(id: string) {
				return findVisibilityChild(id, this.children);
			},
		}));
	}

	breadthSearch(tree);

	function breadthSearch(tree: RoleTree[]) {
		for (const role of tree) {
			if (role.children.length === 0) continue;
			propagateBackwards.unshift(role);
		}
		for (const role of tree) {
			breadthSearch(role.children);
		}
	}

	for (const child of propagateBackwards) {
		child.visible = child.visible || child.children.some((child) => child.visible);
	}

	return tree;
});

fetchRoles();

const addNewLink = computed(() => {
	return `/settings/roles/+`;
});

async function fetchRoles() {
	loading.value = true;

	try {
		const response = await fetchAll<RoleResponse>(`/roles`, {
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
					'folderAt',
					'users',
				],
				deep: {
					users: {
						_aggregate: { count: 'id' },
						_groupBy: ['role'],
						_sort: 'role',
						_limit: -1,
					},
				},
				sort: ['sort', 'name'],
			},
		});

		roles.value = response.map((role: any) => ({
			...translate(role),
			userCount: role.users?.[0]?.count.id ?? 0,
		}));

		if (collapsedIds.value?.includes('__ALL__')) {
			collapsedIds.value = (roles.value as any).map((r: any) => r.id);
		}
	} catch (error) {
		unexpectedError(error);
	} finally {
		loading.value = false;
	}
}

async function onSort(updates: RoleItemType[], removeGroup = false) {
	const updatesWithSortValue = updates.map((role: any, index) =>
		merge(role, { sort: index + 1, parent: removeGroup ? null : role.parent }),
	);

	roles.value = roles.value.map((role: any) => {
		const updatedValues = updatesWithSortValue.find((updatedRole: any) => updatedRole.id === role.id);
		return updatedValues ? merge({}, role, updatedValues) : role;
	});

	try {
		await api.patch(
			`/roles`,
			updatesWithSortValue.map((role: any) => ({ id: role.id, sort: role.sort, parent: role.parent })),
		);
		await fetchRoles();
	} catch (error) {
		unexpectedError(error);
	}
}

async function onUpdateRole(payload: { id: string; hidden?: boolean; collapse?: 'open' | 'collapsed' | 'locked' | null }) {
	try {
		await api.patch(`/roles/${payload.id}`, {
			hidden: payload.hidden,
			collapse: payload.collapse,
		});
		roles.value = roles.value.map((r: any) => (r.id === payload.id ? ({ ...r, ...payload } as any) : r));
	} catch (error) {
		unexpectedError(error);
	}
}

function navigateToRole({ item }: { item: RoleItemType }) {
	const isFolder = (item as any).folderAt !== null && (item as any).folderAt !== undefined;
	if (isFolder) {
		roleDialogActive.value = false;
		editRole.value = item;
	} else {
		router.push(`/settings/roles/${(item as any).id}`);
	}
}

async function deleteRole(role: any) {
	try {
		await api.delete(`/roles/${role.id}`);
		await fetchRoles();
	} catch (error) {
		unexpectedError(error);
	}
}
</script>

<template>
	<private-view :title="t('settings_roles')">
		<template #headline>
			<v-breadcrumb :items="[{ name: t('settings'), to: '/settings' }]" />
		</template>

		<template #title-outer:prepend>
			<v-button class="header-icon" rounded icon exact disabled>
				<v-icon name="group" />
			</v-button>
		</template>

		<template #actions>
			<search-input
				v-model="search"
				:show-filter="false"
				:autofocus="roles.length > 25"
				:placeholder="t('search_role')"
			/>

			<role-folder-dialog v-model="roleDialogActive" @created="fetchRoles">
				<template #activator="{ on }">
					<v-button v-tooltip.bottom="t('create_folder')" rounded icon secondary @click="on">
						<v-icon name="create_new_folder" />
					</v-button>
				</template>
			</role-folder-dialog>

			<v-button v-tooltip.bottom="t('create_role')" rounded icon :to="addNewLink">
				<v-icon name="add" />
			</v-button>
		</template>

		<template #navigation>
			<settings-navigation />
		</template>

		<div class="padding-box">
			<v-info v-if="roles.length === 0" icon="group" :title="t('no_roles')">
				{{ t('no_roles_copy') }}
				<template #append>
					<v-button :to="addNewLink">{{ t('create_role') }}</v-button>
				</template>
			</v-info>

			<template v-else>
				<transition-expand>
					<div v-if="hasExpandableRoles" class="expand-collapse-button">
						{{ t('expand') }}
						<button @click="expandAll">{{ t('all') }}</button>
						/
						<button @click="collapseAllAll">{{ t('none') }}</button>
					</div>
				</transition-expand>

				<draggable
					tag="v-list"
					:model-value="rootRoles"
					:group="{ name: 'roles' }"
					:swap-threshold="0.3"
					class="root-drag-container draggable-list"
					item-key="id"
					handle=".drag-handle"
					v-bind="{ 'force-fallback': true }"
					@update:model-value="onSort($event, true)"
				>
					<template #item="{ element }">
						<role-item
							:role="element"
							:roles="translatedRoles"
							:is-collapsed="(element as any).isCollapsed"
							:visibility-tree="findVisibilityChild((element as any).id)!"
							@edit-role="editRole = $event"
							@set-nested-sort="onSort"
							@toggle-collapse="toggleCollapse"
							@update-role="onUpdateRole"
							@delete-role="deleteRole"
							@click="navigateToRole({ item: element })"
						/>
					</template>
				</draggable>
			</template>
		</div>

		<router-view name="add" />

		<template #sidebar>
			<sidebar-detail icon="info" :title="t('information')" close>
				<div v-md="t('page_help_settings_roles_collection')" class="page-description" />
			</sidebar-detail>
		</template>

		<role-folder-dialog
			:model-value="!!editRole"
			:role="editRole as any"
			@update:model-value="editRole = null"
			@created="fetchRoles"
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

.role-item.hidden {
	--v-list-item-color: var(--theme--foreground-subdued);
}

.role-icon {
	margin-inline-end: 8px;
}

.hidden .role-name {
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
