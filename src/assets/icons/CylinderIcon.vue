<template>
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    :class="className"
  >
    <ellipse 
      cx="12" 
      cy="5" 
      rx="9" 
      ry="3" 
      stroke="currentColor" 
      stroke-width="2"
    />
    <path 
      d="M21 12V5" 
      stroke="currentColor" 
      stroke-width="2"
    />
    <path 
      d="M3 12V5" 
      stroke="currentColor" 
      stroke-width="2"
    />
    <ellipse 
      cx="12" 
      cy="19" 
      rx="9" 
      ry="3" 
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