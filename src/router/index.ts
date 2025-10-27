import { createRouter, createWebHistory } from 'vue-router'
import Editor from '@/views/Editor.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Editor',
      component: Editor
    }
  ]
})

export default router