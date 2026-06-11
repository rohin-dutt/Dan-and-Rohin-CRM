type RouterLike = {
  back: () => void
  replace: (href: string) => void
  canGoBack?: () => boolean
}

export function safeBack(router: RouterLike, fallbackHref: string) {
  if (typeof router.canGoBack === "function" && router.canGoBack()) {
    router.back()
    return
  }

  router.replace(fallbackHref)
}
