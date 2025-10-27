<template>
  <footer class="status-bar">
    <span>就绪</span>
    <span>{{ selectedInfo }}</span>
    <span style="margin-left: auto;">FPS: {{ fps }}</span>
    <span>对象数: {{ objectCount }}</span>
  </footer>
</template>

<script setup lang="ts">
// 定义 Props
interface Props {
  selectedInfo: string
  fps: number
  objectCount: number
}

defineProps<Props>()
</script>

<style scoped>
.status-bar {
  grid-column: 1 / -1;
  background: #2d2d2d;
  border-top: 1px solid #444;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 12px;
  gap: 20px;
}
</style>