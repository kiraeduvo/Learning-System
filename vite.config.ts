/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'
import { defineConfig } from 'vite'

// 相对路径，让 Capacitor（Android app）和浏览器都能正确加载
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
  },
  test: {
    // .claude/worktrees 是 agent 的工作副本，不要重复跑里面的测试
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
