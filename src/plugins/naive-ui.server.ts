import { setup } from '@css-render/vue3-ssr'

export default (nuxtApp: any) => {
  if (typeof window === 'undefined') {
    const { collect } = setup(nuxtApp.vueApp)
    const originalRenderMeta = nuxtApp.ssrContext?.renderMeta as any
    nuxtApp.ssrContext!.renderMeta = async () => {
      const result = originalRenderMeta ? await originalRenderMeta() : {}
      return {
        ...result,
        headTags: (result.headTags || '') + collect()
      }
    }
  }
}
