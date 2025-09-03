<script setup lang="ts">
import { Role } from '@directus/types';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Draggable from 'vuedraggable';
import RoleOptions from './role-options.vue';

export interface RoleTree {
  id: string;
  visible: boolean;
  children: RoleTree[];
  search: string | null;
  findChild(id: string): RoleTree | undefined;
}

const props = defineProps<{
  role: Role & { isCollapsed?: boolean; userCount?: number };
  roles: (Role & { isCollapsed?: boolean; userCount?: number })[];
  isCollapsed: boolean;
  visibilityTree: RoleTree;
  disableDrag?: boolean;
}>();

const emit = defineEmits(['setNestedSort', 'editRole', 'toggleCollapse', 'updateRole', 'deleteRole']);

const { t } = useI18n();

const toggleCollapse = () => {
  emit('toggleCollapse', (props.role as any).id);
};

const nestedRoles = computed(() =>
  props.roles.filter((role) => (role as any).parent === (props.role as any).id),
);

const hasChildren = computed(() => nestedRoles.value.length > 0);

function onGroupSortChange(roles: Role[]) {
  const updates = roles.map((role) => ({
    id: (role as any).id,
    parent: (props.role as any).id,
  }));

  emit('setNestedSort', updates);
}
</script>

<template>
  <div v-show="visibilityTree.visible" class="role-item">
    <v-list-item
      block
      dense
      clickable
      :class="{ hidden: (role as any).hidden }"
      :to="(role as any).folder_at ? undefined : `/settings/roles/${(role as any).id}`"
      @click.self="(role as any).folder_at ? $emit('editRole', role) : null"
    >
      <v-list-item-icon class="drag-handle" :class="{ disabled: disableDrag }">
        <v-icon name="drag_handle" />
      </v-list-item-icon>

      <v-list-item-icon>
        <v-icon :name="hasChildren ? 'folder' : ((role as any).icon || 'group')" :color="(role as any).color" />
      </v-list-item-icon>

      <div class="role-name">
        <v-text-overflow :text="(role as any).name" />
      </div>

      <div class="spacer" />

      <div v-if="hasChildren && (role as any).collapse !== 'locked'" class="expand-toggle" @click.stop.prevent="toggleCollapse">
        <v-icon v-tooltip="!isCollapsed ? t('collapse') : t('expand')" :name="!isCollapsed ? 'unfold_less' : 'unfold_more'" />
      </div>

      <role-options
        v-if="(role as any).folder_at !== null && (role as any).folder_at !== undefined"
        :role="role"
        :has-nested-roles="hasChildren"
        @delete="$emit('deleteRole', role)"
        @update="$emit('updateRole', { id: (role as any).id, ...$event })"
      />
    </v-list-item>

    <transition-expand>
      <draggable
        v-if="!isCollapsed"
        tag="v-list"
        :model-value="nestedRoles"
        :group="{ name: 'roles' }"
        :swap-threshold="0.3"
        class="nested draggable-list"
        item-key="id"
        handle=".drag-handle:not(.disabled)"
        v-bind="{ 'force-fallback': true }"
        @update:model-value="onGroupSortChange"
      >
        <template #item="{ element }">
          <role-item
            :role="element"
            :roles="roles"
            :is-collapsed="(element as any).isCollapsed"
            :visibility-tree="visibilityTree.findChild?.((element as any).id)!"
            @edit-role="$emit('editRole', $event)"
            @set-nested-sort="$emit('setNestedSort', $event)"
            @toggle-collapse="$emit('toggleCollapse', $event)"
            @update-role="$emit('updateRole', $event)"
            @delete-role="$emit('deleteRole', $event)"
          />
        </template>
      </draggable>
    </transition-expand>
  </div>
  
</template>

<style lang="scss" scoped>
.role-item {
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

    .role-name {
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
    > * { opacity: 0; }
  }
}
</style>


