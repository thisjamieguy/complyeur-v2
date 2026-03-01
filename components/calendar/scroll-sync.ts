interface ScrollElement {
  scrollTop: number
}

/**
 * Synchronize vertical scroll from source to target.
 * Returns true when target changed, false when already aligned.
 */
export function syncVerticalScroll(
  source: ScrollElement,
  target: ScrollElement
): boolean {
  if (source.scrollTop === target.scrollTop) {
    return false
  }

  target.scrollTop = source.scrollTop
  return true
}

