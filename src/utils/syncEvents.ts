// Простой эмиттер событий синхронизации
class SyncEventEmitter {
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: any) => void) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback)
    }
  }

  emit(event: string, data?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(data))
    }
  }
}

export const syncEvents = new SyncEventEmitter()
