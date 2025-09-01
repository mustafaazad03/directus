import { useLocalStorage } from '@vueuse/core';
import { computed } from 'vue';

export function useExpandCollapse() {
  const collapsedIds = useLocalStorage<string[]>('collapsed-role-ids', []);

  const hasExpandableRoles = computed(() => true);

  return { collapsedIds, hasExpandableRoles, expandAll, collapseAll, toggleCollapse };

  function expandAll() {
    collapsedIds.value = [];
  }

  function collapseAll() {
    // Collapse all by convention: we store a sentinel that the view respects
    collapsedIds.value = Array.from(new Set([...(collapsedIds.value ?? []), '__ALL__']));
  }

  function toggleCollapse(id: string) {
    const isCollapsed = collapsedIds.value.includes(id);

    if (isCollapsed) {
      collapsedIds.value = collapsedIds.value.filter((v) => v !== id);
    } else {
      collapsedIds.value = [...collapsedIds.value, id];
    }
  }
}


