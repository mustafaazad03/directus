<script setup lang="ts">
import api from '@/api';
import { useCollectionPermissions } from '@/composables/use-permissions';
import { router } from '@/router';
import { useFlowsStore } from '@/stores/flows';
import { unexpectedError } from '@/utils/unexpected-error';
import type { FlowRaw } from '@directus/types';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SettingsNavigation from '../../components/navigation.vue';
import FlowDrawer from './flow-drawer.vue';
import FlowFolderDialog from './components/flow-folder-dialog.vue';
import FlowItem from './components/flow-item.vue';
import Draggable from 'vuedraggable';
import { merge, sortBy } from 'lodash';

const { t } = useI18n();

const { createAllowed } = useCollectionPermissions('directus_flows');

const confirmDelete = ref<FlowRaw | null>(null);
const deletingFlow = ref(false);
const editFlow = ref<string | undefined>();

const flowsStore = useFlowsStore();

// Tree state
const search = ref<string | null>(null);
const flowDialogActive = ref(false);
const editFolder = ref<FlowRaw | null>(null);
const collapsedIds = ref<string[]>([]);

const flows = computed<FlowRaw[]>(() => flowsStore.flows);

const translatedFlows = computed(() => {
	return flows.value.map((flow: any) => ({
		...flow,
		isCollapsed: flow.collapse === 'locked' ? false : collapsedIds.value?.includes(flow.id),
	}));
});

function collapseAllAll() {
	collapsedIds.value = translatedFlows.value.map((f: any) => f.id);
}

const rootFlows = computed(() => sortBy(translatedFlows.value.filter((f: any) => !f.parent), [(f: any) => f.sort ?? 999999, (f: any) => f.name ?? '']));

export type FlowTree = {
	id: string;
	visible: boolean;
	children: FlowTree[];
	search: string | null;
	findChild(id: string): FlowTree | undefined;
};

function findVisibilityChild(id: string, tree: FlowTree[] = visibilityTree.value): FlowTree | undefined {
	return tree.find((child) => child.id === id);
}

const visibilityTree = computed(() => {
	const tree: FlowTree[] = makeTree();
	const propagateBackwards: FlowTree[] = [];

	function makeTree(parent: string | null = null): FlowTree[] {
		const children = translatedFlows.value.filter((flow: any) => (flow.parent ?? null) === parent);
		const normalizedSearch = search.value?.toLowerCase();
		return children.map((flow: any) => ({
			id: flow.id,
			visible: normalizedSearch ? flow.name?.toLowerCase().includes(normalizedSearch) : true,
			search: search.value,
			children: makeTree(flow.id),
			findChild(id: string) {
				return findVisibilityChild(id, this.children);
			},
		}));
	}

	breadthSearch(tree);
	function breadthSearch(tree: FlowTree[]) {
		for (const flow of tree) {
			if (flow.children.length === 0) continue;
			propagateBackwards.unshift(flow);
		}
		for (const flow of tree) breadthSearch(flow.children);
	}
	for (const child of propagateBackwards) child.visible = child.visible || child.children.some((child) => child.visible);
	return tree;
});

async function deleteFlow() {
	if (!confirmDelete.value || deletingFlow.value) return;
	deletingFlow.value = true;
	try {
		await api.delete(`/flows/${confirmDelete.value.id}`);
		await flowsStore.hydrate();
		confirmDelete.value = null;
	} catch (error) {
		unexpectedError(error);
	} finally {
		deletingFlow.value = false;
	}
}

function onFlowDrawerCompletion(id: string) {
	if (editFlow.value === '+') router.push(`/settings/flows/${id}`);
	editFlow.value = undefined;
}

async function onSort(updates: any[], removeGroup = false) {
	const updatesWithSortValue = updates.map((flow: any, index) => merge(flow, { sort: index + 1, parent: removeGroup ? null : flow.parent }));
	try {
		await api.patch(`/flows`, updatesWithSortValue.map((flow: any) => ({ id: flow.id, sort: flow.sort, parent: flow.parent })));
		await flowsStore.hydrate();
	} catch (error) {
		unexpectedError(error);
	}
}

async function onUpdateFlow(payload: { id: string; hidden?: boolean; collapse?: 'open' | 'collapsed' | 'locked' | null }) {
	try {
		await api.patch(`/flows/${payload.id}`, { hidden: payload.hidden, collapse: payload.collapse });
		await flowsStore.hydrate();
	} catch (error) {
		unexpectedError(error);
	}
}

function navigateToFlowOrFolder(item: any) {
	const isFolder = item.folder_at !== null && item.folder_at !== undefined;
	if (isFolder) {
		flowDialogActive.value = false;
		editFolder.value = item as any;
	} else {
		router.push(`/settings/flows/${item.id}`);
	}
}
</script>

<template>
	<private-view :title="t('flows')">
		<template #title-outer:prepend>
			<v-button class="header-icon" rounded disabled icon>
				<v-icon name="bolt" />
			</v-button>
		</template>

		<template #headline>
			<v-breadcrumb :items="[{ name: t('settings'), to: '/settings' }]" />
		</template>

		<template #navigation>
			<settings-navigation />
		</template>

		<template #actions>
			<flow-folder-dialog v-model="flowDialogActive" @created="flowsStore.hydrate">
				<template #activator="{ on }">
					<v-button v-tooltip.bottom="t('create_folder')" rounded icon secondary @click="on">
						<v-icon name="create_new_folder" />
					</v-button>
				</template>
			</flow-folder-dialog>

			<v-button v-tooltip.bottom="createAllowed ? t('create_flow') : t('not_allowed')" rounded icon :disabled="createAllowed === false" @click="editFlow = '+'">
				<v-icon name="add" />
			</v-button>
		</template>

		<template #sidebar>
			<sidebar-detail icon="info" :title="t('information')" close>
				<div v-md="t('page_help_settings_flows_collection')" class="page-description" />
			</sidebar-detail>
		</template>

		<div class="v-table">
			<transition-expand>
				<div class="expand-collapse-button" style="text-align: end; color: var(--theme--foreground-subdued);">
					{{ t('expand') }}
					<button @click="collapsedIds = []">{{ t('all') }}</button>
					/
					<button @click="collapseAllAll">{{ t('none') }}</button>
				</div>
			</transition-expand>

			<draggable
				tag="v-list"
				:model-value="rootFlows"
				:group="{ name: 'flows' }"
				:swap-threshold="0.3"
				class="root-drag-container draggable-list"
				item-key="id"
				handle=".drag-handle"
				v-bind="{ 'force-fallback': true }"
				@update:model-value="onSort($event, true)"
			>
				<template #item="{ element }">
					<flow-item
						:flow="element as any"
						:flows="translatedFlows as any"
						:is-collapsed="(element as any).isCollapsed"
						:visibility-tree="findVisibilityChild((element as any).id)!"
						@edit-flow="editFolder = $event as any"
						@set-nested-sort="onSort"
						@toggle-collapse="(id: string) => (collapsedIds = collapsedIds.includes(id) ? collapsedIds.filter((v) => v !== id) : [...collapsedIds, id])"
						@update-flow="onUpdateFlow"
						@delete-flow="confirmDelete = $event as any"
						@click="navigateToFlowOrFolder(element)"
					/>
				</template>
			</draggable>
		</div>

		<v-dialog :model-value="!!confirmDelete" @esc="confirmDelete = null" @apply="deleteFlow">
			<v-card>
				<v-card-title>{{ t('flow_delete_confirm', { flow: confirmDelete!.name }) }}</v-card-title>
				<v-card-actions>
					<v-button secondary @click="confirmDelete = null">{{ t('cancel') }}</v-button>
					<v-button danger :loading="deletingFlow" @click="deleteFlow">{{ t('delete_label') }}</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<!-- Edit existing folder dialog -->
		<flow-folder-dialog
			:model-value="!!editFolder"
			:flow="editFolder as any"
			@update:model-value="editFolder = null"
			@created="flowsStore.hydrate"
		/>

		<flow-drawer :active="editFlow !== undefined" :primary-key="editFlow" @cancel="editFlow = undefined" @done="onFlowDrawerCompletion" />

		<router-view name="add" />
	</private-view>
</template>

<style scoped>
.v-table {
	padding: var(--content-padding);
	padding-block-start: 0;
}

.ctx-toggle {
	--v-icon-color: var(--theme--foreground-subdued);
	--v-icon-color-hover: var(--theme--foreground);
}

.v-list-item.danger {
	--v-list-item-color: var(--theme--danger);
	--v-list-item-color-hover: var(--theme--danger);
	--v-list-item-icon-color: var(--theme--danger);
}

.header-icon {
	--v-button-color-disabled: var(--theme--primary);
	--v-button-background-color-disabled: var(--theme--primary-background);
}

.root-drag-container {
	padding: 8px 0;
	overflow: hidden;
}
</style>
