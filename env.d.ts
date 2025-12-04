declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Naive UI global types
declare global {
  interface Window {
    $message: import('naive-ui').MessageApi
    $notification: import('naive-ui').NotificationApi
    $dialog: import('naive-ui').DialogApi
    $loadingBar: import('naive-ui').LoadingBarApi
  }
}

export {}
