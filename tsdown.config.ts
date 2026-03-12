import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./index.ts'],
  exports: {
    all: true,
  }
})
