function scrollToItem(itemId) {
  var diff = (itemId.offsetTop - window.scrollY) / 20
  if (Math.abs(diff) > 1) {
    window.scrollTo(0, (window.scrollY + diff))
    clearTimeout(window._TO)
    window._TO = setTimeout(scrollToItem, 30, itemId)
  } else {
    window.scrollTo(0, itemId.offsetTop)
  }
}
