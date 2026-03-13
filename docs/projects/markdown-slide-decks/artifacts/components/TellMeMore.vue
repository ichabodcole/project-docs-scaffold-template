<template>
  <span
    :class="['tell-more-btn', active ? 'active' : '']"
    @click="toggle"
    :title="active ? 'Click to remove' : 'Click to flag for follow-up'"
  >
    <span class="icon">{{ active ? "✓" : "+" }}</span>
    <span class="text">{{ active ? "Flagged: " : "Tell me more: " }}<em>{{ topic }}</em></span>
  </span>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
  id: { type: String, required: true },
  topic: { type: String, required: true },
});

const storageKey = `slidev-tellmore-${props.id}`;
const active = ref(false);

onMounted(() => {
  active.value = localStorage.getItem(storageKey) === "1";
});

function toggle() {
  active.value = !active.value;
  if (active.value) {
    localStorage.setItem(storageKey, "1");
    localStorage.setItem(
      `${storageKey}-meta`,
      JSON.stringify({ id: props.id, topic: props.topic })
    );
  } else {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}-meta`);
  }
}
</script>

<style>
:root {
  --tm-bg: #f1f5f9;
  --tm-border: #cbd5e1;
  --tm-color: #475569;
  --tm-hover-bg: #e2e8f0;
  --tm-active-bg: #fefce8;
  --tm-active-border: #ca8a04;
  --tm-active-color: #92400e;
}
:root.dark {
  --tm-bg: #1e293b;
  --tm-border: #334155;
  --tm-color: #94a3b8;
  --tm-hover-bg: #273549;
  --tm-active-bg: #422006;
  --tm-active-border: #ca8a04;
  --tm-active-color: #fde68a;
}
</style>

<style scoped>
.tell-more-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--tm-border);
  background: var(--tm-bg);
  color: var(--tm-color);
  font-size: 0.8rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  margin-bottom: 0.5rem;
  width: fit-content;
}
.tell-more-btn:hover {
  background: var(--tm-hover-bg);
}
.tell-more-btn.active {
  border-color: var(--tm-active-border);
  background: var(--tm-active-bg);
  color: var(--tm-active-color);
}
.icon {
  font-weight: 700;
  font-size: 0.9rem;
}
em {
  font-style: normal;
  font-weight: 600;
}
</style>
