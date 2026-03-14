<template>
  <div class="multi-choice">
    <p class="question">{{ question }}</p>
    <div class="options">
      <button
        v-for="(option, i) in options"
        :key="i"
        :class="['option-btn', selected === i ? 'selected' : '']"
        @click="select(i)"
      >
        <span class="letter">{{ letters[i] }}</span>
        <span class="text">{{ option }}</span>
      </button>
    </div>
    <p v-if="selected !== null" class="confirmed">
      ✓ Recorded: <strong>{{ options[selected] }}</strong>
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
  id: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: Array, required: true },
});

const letters = ["A", "B", "C", "D", "E"];
const selected = ref(null);

function deckSlug() {
  return (
    (document.title || "deck")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "deck"
  );
}

let storageKey;

onMounted(() => {
  storageKey = `slidev-${deckSlug()}-feedback-${props.id}`;
  const saved = localStorage.getItem(storageKey);
  if (saved !== null) selected.value = parseInt(saved);
});

function select(i) {
  selected.value = i;
  localStorage.setItem(storageKey, String(i));
  localStorage.setItem(
    `${storageKey}-meta`,
    JSON.stringify({
      id: props.id,
      question: props.question,
      answer: props.options[i],
      letter: letters[i],
    })
  );
}
</script>

<style>
/* Light mode defaults */
:root {
  --mc-border: #cbd5e1;
  --mc-btn-bg: #f8fafc;
  --mc-btn-color: #334155;
  --mc-btn-hover-border: #3b82f6;
  --mc-btn-hover-bg: #eff6ff;
  --mc-btn-hover-color: #1e3a5f;
  --mc-selected-border: #3b82f6;
  --mc-selected-bg: #1e40af;
  --mc-selected-color: #fff;
  --mc-letter-bg: rgba(0, 0, 0, 0.1);
  --mc-question-color: #0f172a;
  --mc-confirmed-color: #16a34a;
}
/* Dark mode overrides */
:root.dark {
  --mc-border: #334155;
  --mc-btn-bg: #1e293b;
  --mc-btn-color: #cbd5e1;
  --mc-btn-hover-border: #3b82f6;
  --mc-btn-hover-bg: #1e3a5f;
  --mc-btn-hover-color: #f1f5f9;
  --mc-selected-border: #3b82f6;
  --mc-selected-bg: #1e40af;
  --mc-selected-color: #fff;
  --mc-letter-bg: rgba(255, 255, 255, 0.15);
  --mc-question-color: #f1f5f9;
  --mc-confirmed-color: #86efac;
}
</style>

<style scoped>
.multi-choice {
  margin-top: 1.5rem;
}
.question {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--mc-question-color);
  margin-bottom: 1rem;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.option-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--mc-border);
  background: var(--mc-btn-bg);
  color: var(--mc-btn-color);
  cursor: pointer;
  text-align: left;
  font-size: 0.95rem;
  transition: all 0.15s ease;
}
.option-btn:hover {
  border-color: var(--mc-btn-hover-border);
  background: var(--mc-btn-hover-bg);
  color: var(--mc-btn-hover-color);
}
.option-btn.selected {
  border-color: var(--mc-selected-border);
  background: var(--mc-selected-bg);
  color: var(--mc-selected-color);
}
.letter {
  font-weight: 700;
  font-size: 0.85rem;
  background: var(--mc-letter-bg);
  border-radius: 4px;
  padding: 0.1rem 0.45rem;
  flex-shrink: 0;
}
.confirmed {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--mc-confirmed-color);
}
</style>
