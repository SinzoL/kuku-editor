<template>
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    :class="className"
  >
    <path 
      d="M12 2L2 7V17L12 22L22 17V7L12 2Z" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linejoin="round"
    />
    <path 
      d="M2 7L12 12L22 7" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linejoin="round"
    />
    <path 
      d="M12 12V22" 
      stroke="currentColor" 
      stroke-width="2"
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