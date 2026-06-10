'use client'

import { useSyncExternalStore } from 'react'
import { isIosWebKitBrowser } from '@/lib/iosSafariViewport'

const IOS_WEBKIT_DIALOG_ATTR = 'data-ios-webkit-dialog'

function readIosWebKitDialogActive(): boolean {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return false
  if (!isIosWebKitBrowser(navigator.userAgent)) return false
  return document.documentElement.hasAttribute(IOS_WEBKIT_DIALOG_ATTR)
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {}

  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [IOS_WEBKIT_DIALOG_ATTR],
  })

  return () => observer.disconnect()
}

/** iOS WebKit dialog layout: `data-ios-webkit-dialog` на `<html>` (см. page.tsx). */
export function useIosWebKitDialogActive(): boolean {
  return useSyncExternalStore(subscribe, readIosWebKitDialogActive, () => false)
}
