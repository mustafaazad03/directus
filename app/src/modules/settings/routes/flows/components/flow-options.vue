<script setup lang="ts">
import type { FlowRaw } from '@directus/types';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  flow: FlowRaw & { hidden?: boolean; collapse?: 'open' | 'collapsed' | 'locked' | null };
  hasNestedFlows: boolean;
}>();

const emit = defineEmits(['delete', 'update']);

const { t } = useI18n();

const confirmDelete = ref(false);

function deleteFlow() {
  emit('delete', props.flow);
}
</script>

<template>
  <v-menu placement="left-start" show-arrow>
    <template #activator="{ toggle }">
      <v-icon class="ctx-toggle" name="more_vert" clickable @click.stop.prevent="toggle" />
    </template>

    <v-list>
      <v-list-item
        v-if="(props.flow as any).folder_at !== null && (props.flow as any).folder_at !== undefined"
        :disabled="hasNestedFlows"
        :class="{ danger: !hasNestedFlows }"
        clickable
        v-tooltip="hasNestedFlows ? t('cannot_delete_non_empty_folder') : undefined"
        @click="!hasNestedFlows ? (confirmDelete = true) : null"
      >
        <v-list-item-icon>
          <v-icon name="delete" style="color: var(--theme--danger)" />
        </v-list-item-icon>
        <v-list-item-content style="color: var(--theme--danger)">
          {{ t('delete_folder') }}
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
        <v-button kind="danger" @click="deleteFlow">
          {{ t('delete_label') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.ctx-toggle {
  --v-icon-color: var(--theme--foreground-subdued);
  transition: color var(--fast) var(--transition);
  &:hover { --v-icon-color: var(--theme--foreground); }
}
</style>


