declare module 'h3' {
  export function defineEventHandler(handler: any): any
  export function readBody(event: any): Promise<any>
  export function createError(options: any): Error
  export function getHeader(event: any, name: string): string | undefined
  export function getQuery(event: any): Record<string, any>
  export function getMethod(event: any): string
  export function proxyRequest(event: any, target: string, options?: any): any
  export function getClientAddress(event: any): string
  interface H3EventContext {
    [key: string]: any
  }
  interface H3Event {
    node: {
      req: any
      res: any
    }
    context: H3EventContext
    [key: string]: any
  }
}

declare module '#imports' {
  export function useRuntimeConfig(): any
}
