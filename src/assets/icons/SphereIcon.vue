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
      r="10" 
      stroke="currentColor" 
      stroke-width="2"
    />
    <path 
      d="M2 12H22" 
      stroke="currentColor" 
      stroke-width="2"
    />
    <path 
      d="M12 2C14.5 6.5 14.5 17.5 12 22C9.5 17.5 9.5 6.5 12 2Z" 
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