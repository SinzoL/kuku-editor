<template>
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    :class="className"
  >
    <!-- 对角线箭头 -->
    <path 
      d="M21 3L3 21" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round"
    />
    <!-- 左上角箭头 -->
    <path 
      d="M8 3H21V16" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
    <!-- 右下角箭头 -->
    <path 
      d="M16 21H3V8" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  className?: string
}

withDefaults(defineProps<Props>(), {
  className: ''
})
</script>