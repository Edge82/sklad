declare module 'naive-ui'
declare module 'jsonwebtoken'
declare module 'bcrypt'
declare module 'better-sqlite3' {
  export default class Database {
    constructor(filename: string, options?: any)
    prepare(sql: string): any
    exec(sql: string): void
    pragma(pragma: string): void
    close(): void
  }
}
declare module 'h3' {
  export function defineEventHandler(handler: any): any
  export function readBody(event: any): any
  export function createError(options: any): any
  export function getHeader(event: any, name: string): string | undefined
  export function getQuery(event: any): any
  export function getMethod(event: any): string
  export function proxyRequest(event: any, target: string, options?: any): any
  export function getClientAddress(event: any): string
}
declare module '#imports' {
  export function useRuntimeConfig(): any
}
declare module '#app' {
  export function defineNuxtPlugin(handler: any): any
  export function definePageMeta(metadata: any): any
  export { useRouter, useRoute } from 'vue-router'
}

