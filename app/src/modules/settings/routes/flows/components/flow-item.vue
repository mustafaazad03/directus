<script setup lang="ts">
import type { FlowRaw } from '@directus/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Draggable from 'vuedraggable';
import FlowOptions from './flow-options.vue';
import { sortBy } from 'lodash';

export interface FlowTree {
  id: string;
  visible: boolean;
  children: FlowTree[];
  search: string | null;
  findChild(id: string): FlowTree | undefined;
}

const props = defineProps<{
  flow: FlowRaw & { isCollapsed?: boolean };
  flows: (FlowRaw & { isCollapsed?: boolean })[];
  isCollapsed: boolean;
  visibilityTree: FlowTree;
  disableDrag?: boolean;
}>();

const emit = defineEmits(['setNestedSort', 'editFlow', 'toggleCollapse', 'updateFlow', 'deleteFlow']);

const { t } = useI18n();

const toggleCollapse = () => {
  emit('toggleCollapse', (props.flow as any).id);
};

const nestedFlows = computed(() => sortBy(props.flows.filter((f: any) => f.parent === (props.flow as any).id), [(f: any) => f.sort ?? 999999, (f: any) => f.name ?? '']));
const hasChildren = computed(() => nestedFlows.value.length > 0);

function onGroupSortChange(flows: FlowRaw[]) {
  const updates = flows.map((f: any) => ({ id: f.id, parent: (props.flow as any).id }));
  emit('setNestedSort', updates);
}
</script>

<template>
  <div v-show="visibilityTree.visible" class="flow-item">
    <v-list-item
      block
      dense
      clickable
      :class="{ hidden: (flow as any).hidden }"
      :to="(flow as any).folderAt ? undefined : `/settings/flows/${(flow as any).id}`"
      @click.self="(flow as any).folderAt ? $emit('editFlow', flow) : null"
    >
      <v-list-item-icon class="drag-handle" :class="{ disabled: disableDrag }">
        <v-icon name="drag_handle" />
      </v-list-item-icon>

      <v-list-item-icon>
        <v-icon :name="hasChildren ? 'folder' : ((flow as any).icon || 'bolt')" :color="(flow as any).color" />
      </v-list-item-icon>

      <div class="flow-name">
        <v-text-overflow :text="(flow as any).name" />
      </div>

      <div class="spacer" />

      <div v-if="hasChildren && (flow as any).collapse !== 'locked'" class="expand-toggle" @click.stop.prevent="toggleCollapse">
        <v-icon v-tooltip="!isCollapsed ? t('collapse') : t('expand')" :name="!isCollapsed ? 'unfold_less' : 'unfold_more'" />
      </div>

      <flow-options
        v-if="(flow as any).folderAt !== null && (flow as any).folderAt !== undefined"
        :flow="flow"
        :has-nested-flows="hasChildren"
        @delete="$emit('deleteFlow', flow)"
        @update="$emit('updateFlow', { id: (flow as any).id, ...$event })"
      />
    </v-list-item>

    <transition-expand>
      <draggable
        v-if="!isCollapsed"
        tag="v-list"
        :model-value="nestedFlows"
        :group="{ name: 'flows' }"
        :swap-threshold="0.3"
        class="nested draggable-list"
        item-key="id"
        handle=".drag-handle:not(.disabled)"
        v-bind="{ 'force-fallback': true }"
        @update:model-value="onGroupSortChange"
      >
        <template #item="{ element }">
          <flow-item
            :flow="element"
            :flows="flows"
            :is-collapsed="(element as any).isCollapsed"
            :visibility-tree="visibilityTree.findChild?.((element as any).id)!"
            @edit-flow="$emit('editFlow', $event)"
            @set-nested-sort="$emit('setNestedSort', $event)"
            @toggle-collapse="$emit('toggleCollapse', $event)"
            @update-flow="$emit('updateFlow', $event)"
            @delete-flow="$emit('deleteFlow', $event)"
          />
        </template>
      </draggable>
    </transition-expand>
  </div>
</template>

<style scoped lang="scss">
.flow-item {
  margin-bottom: -2px;
  .v-list-item {
    --v-list-item-min-height: 48px;
    --v-list-item-padding: 0 8px;
    margin-bottom: 2px;
    padding-left: 8px;
    border-radius: 4px;
    .drag-handle {
      cursor: grab;
      margin-right: 8px;
      &.disabled { cursor: default; }
    }
    .expand-toggle {
      --v-icon-color: var(--theme--foreground-subdued);
      margin-right: 8px;
      cursor: pointer;
      transition: color var(--fast) var(--transition);
      &:hover { --v-icon-color: var(--theme--foreground); }
    }
    .flow-name {
      flex-grow: 1;
      margin-right: 12px;
      margin-left: 10px;
    }
  }
  & :deep(.v-list-item.hidden) { --v-list-item-color: var(--theme--foreground-subdued); }
  .spacer { flex-grow: 1; }
  .nested { margin-left: 20px; }
}

.draggable-list :deep(.sortable-ghost) {
  .v-list-item {
    --v-list-item-background-color: var(--theme--primary-background);
    --v-list-item-border-color: var(--theme--primary);
    --v-list-item-background-color-hover: var(--theme--primary-background);
    --v-list-item-border-color-hover: var(--theme--primary);
    > * { opacity: 0; }
  }
}
</style>


