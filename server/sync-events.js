/**
 * SSE-брокер для уведомлений о синхронизации
 * Хранит подписчиков и рассылает события
 */

const subscribers = new Set()

export function onSyncEvent(subscriber) {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

export function broadcastSyncEvent(event) {
  for (const sub of subscribers) {
    try {
      sub(event)
    } catch (err) {
      console.error('Sync event subscriber error:', err)
    }
  }
}
