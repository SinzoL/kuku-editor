<template>
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    :class="className"
  >
    <circle 
      cx="12" 
      cy="12" 
      r="3" 
      stroke="currentColor" 
      stroke-width="2"
    />
    <circle 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-dasharray="3 3"
    />
    <path 
      d="M12 2C16 6 16 18 12 22" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round"
    />
    <path 
      d="M12 2C8 6 8 18 12 22" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round"
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