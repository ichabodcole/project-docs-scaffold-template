<template>
  <div class="feedback-summary">
    <div v-if="answers.length === 0 && tellMore.length === 0" class="empty">
      No feedback recorded yet — go back and make selections or flag topics for
      follow-up.
    </div>
    <div v-else>
      <div v-if="answers.length > 0" class="answer-list">
        <p class="section-label">Decisions</p>
        <div v-for="a in answers" :key="a.id" class="answer-row">
          <span class="label">{{ a.question }}</span>
          <span class="answer"
            ><strong>{{ a.letter }}.</strong> {{ a.answer }}</span
          >
        </div>
      </div>
      <div v-if="tellMore.length > 0" class="answer-list">
        <p class="section-label">Want to Know More</p>
        <div v-for="t in tellMore" :key="t.id" class="answer-row">
          <span class="answer">→ {{ t.topic }}</span>
        </div>
      </div>
      <div class="report-block">
        <pre>{{ reportMarkdown }}</pre>
      </div>
      <div class="btn-row">
        <button class="copy-btn" @click="copy">
          {{ copied ? "✓ Copied!" : "Copy to clipboard" }}
        </button>
        <button class="save-btn" @click="saveFile">
          {{ saved ? "✓ Saved!" : "Save feedback.md" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useNav } from "@slidev/client";

const answers = ref([]);
const copied = ref(false);
const saved = ref(false);
const { currentPage } = useNav();

const tellMore = ref([]);

function deckSlug() {
  return (
    (document.title || "deck")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "deck"
  );
}

function loadAnswers() {
  const slug = deckSlug();
  const feedbackPrefix = `slidev-${slug}-feedback-`;
  const tellMorePrefix = `slidev-${slug}-tellmore-`;
  const results = [];
  const more = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(feedbackPrefix) && key.endsWith("-meta")) {
      try { results.push(JSON.parse(localStorage.getItem(key))); } catch {}
    }
    if (key.startsWith(tellMorePrefix) && key.endsWith("-meta")) {
      try { more.push(JSON.parse(localStorage.getItem(key))); } catch {}
    }
  }
  answers.value = results;
  tellMore.value = more;
}

onMounted(loadAnswers);

// Re-read whenever the user navigates to any slide (picks up new selections)
watch(currentPage, loadAnswers);

const reportMarkdown = computed(() => {
  if (answers.value.length === 0 && tellMore.value.length === 0) return "";
  const lines = ["## Slide Deck Feedback\n"];
  if (answers.value.length > 0) {
    lines.push("### Decisions\n");
    for (const a of answers.value) {
      lines.push(`**${a.question}**`);
      lines.push(`→ ${a.letter}. ${a.answer}\n`);
    }
  }
  if (tellMore.value.length > 0) {
    lines.push("### Want to Know More\n");
    for (const t of tellMore.value) {
      lines.push(`- ${t.topic}`);
    }
  }
  return lines.join("\n");
});

async function copy() {
  await navigator.clipboard.writeText(reportMarkdown.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

async function saveFile() {
  const filename = `feedback-${new Date().toISOString().slice(0, 10)}.md`;
  const content = reportMarkdown.value;

  // File System Access API (Chrome/Arc/Edge) — lets user pick save location
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "Markdown", accept: { "text/markdown": [".md"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      saved.value = true;
      setTimeout(() => (saved.value = false), 2500);
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // user cancelled
    }
  }

  // Fallback: trigger download to Downloads folder
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  saved.value = true;
  setTimeout(() => (saved.value = false), 2500);
}
</script>

<style>
:root {
  --fs-label-color: #64748b;
  --fs-answer-color: #1e293b;
  --fs-empty-color: #94a3b8;
  --fs-pre-bg: #f1f5f9;
  --fs-pre-border: #e2e8f0;
  --fs-pre-color: #0369a1;
  --fs-copy-border: #cbd5e1;
  --fs-copy-bg: #f8fafc;
  --fs-copy-color: #64748b;
  --fs-copy-hover-border: #94a3b8;
  --fs-copy-hover-color: #334155;
  --fs-save-border: #3b82f6;
  --fs-save-bg: #eff6ff;
  --fs-save-color: #1d4ed8;
  --fs-save-hover-bg: #1e40af;
  --fs-save-hover-color: #fff;
}
:root.dark {
  --fs-label-color: #94a3b8;
  --fs-answer-color: #e2e8f0;
  --fs-empty-color: #64748b;
  --fs-pre-bg: #0f172a;
  --fs-pre-border: #334155;
  --fs-pre-color: #7dd3fc;
  --fs-copy-border: #334155;
  --fs-copy-bg: #1e293b;
  --fs-copy-color: #94a3b8;
  --fs-copy-hover-border: #475569;
  --fs-copy-hover-color: #e2e8f0;
  --fs-save-border: #3b82f6;
  --fs-save-bg: #1e3a5f;
  --fs-save-color: #93c5fd;
  --fs-save-hover-bg: #1e40af;
  --fs-save-hover-color: #fff;
}
</style>

<style scoped>
.feedback-summary {
  margin-top: 1rem;
}
.empty {
  color: var(--fs-empty-color);
  font-style: italic;
}
.answer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.answer-row {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fs-label-color);
  margin: 0 0 0.4rem;
}
.label {
  font-size: 0.8rem;
  color: var(--fs-label-color);
}
.answer {
  font-size: 0.95rem;
  color: var(--fs-answer-color);
}
.report-block {
  background: var(--fs-pre-bg);
  border: 1px solid var(--fs-pre-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  max-height: 180px;
  overflow-y: auto;
}
pre {
  font-size: 0.78rem;
  color: var(--fs-pre-color);
  white-space: pre-wrap;
  margin: 0;
}
.btn-row {
  display: flex;
  gap: 0.75rem;
}
.copy-btn,
.save-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s ease;
}
.copy-btn {
  border: 1px solid var(--fs-copy-border);
  background: var(--fs-copy-bg);
  color: var(--fs-copy-color);
}
.copy-btn:hover {
  border-color: var(--fs-copy-hover-border);
  color: var(--fs-copy-hover-color);
}
.save-btn {
  border: 1px solid var(--fs-save-border);
  background: var(--fs-save-bg);
  color: var(--fs-save-color);
}
.save-btn:hover {
  background: var(--fs-save-hover-bg);
  color: var(--fs-save-hover-color);
}
</style>
