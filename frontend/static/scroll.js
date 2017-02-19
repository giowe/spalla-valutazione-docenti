function scrollZhou(eID, speed) {
  var windowObject = window;
  var windowPos = windowObject.pageYOffset;
  //var pointer = toElement.getAttribute('href').slice(1);
  var elem = document.getElementById(eID);
  var elemOffset = elem.offsetTop;

  if (windowPos > elemOffset) {
    speed = (windowPos - elemOffset) / speed;
  }
  if (windowPos < elemOffset) {
    speed = (elemOffset - windowPos) / speed;
  }
  var counter = setInterval(function () {
    windowPos;

    if (windowPos > elemOffset) { // from bottom to top
      windowObject.scrollTo(0, windowPos);
      windowPos -= speed;

      if (windowPos <= elemOffset) { // scrolling until elemOffset is higher than scrollbar position, cancel interval and set scrollbar to element position
        clearInterval(counter);
        windowObject.scrollTo(0, elemOffset);
      }
    } else { // from top to bottom
      windowObject.scrollTo(0, windowPos);
      windowPos += speed;

      if (windowPos >= elemOffset) { // scroll until scrollbar is lower than element, cancel interval and set scrollbar to element position
        clearInterval(counter);
        windowObject.scrollTo(0, elemOffset);
      }
    }

  }, 1
  );
}

function navbarScroll(elem) {
  var docID = elem.getAttribute("href")
  docID = docID.substr(1);
  scrollZhou(docID, 100);
  return false;
}
var userHasScrolled = false;
var ArraySection = [];
var ArraySectionLength;
window.onload = getNavbarAncor();

function getNavbarAncor() {
  var navbarLinks = document.getElementsByClassName('static-navbar-link');
  var navbarLinksLength = navbarLinks.length;
  for (var navbarLinksIndex = 0; navbarLinksIndex < navbarLinksLength; navbarLinksIndex++) {
    ArraySection.push(navbarLinks[navbarLinksIndex].hash.substr(1));
  }
  ArraySectionLength = ArraySection.length;
}
window.onload = loopIsInViewport();
window.onscroll = function (e) {
  userHasScrolled = true;
  if (userHasScrolled) {
    loopIsInViewport();
    userHasScrolled = false;
  }
}
function loopIsInViewport(){
  for (var navbarLinksIndex = 0; navbarLinksIndex < ArraySectionLength; navbarLinksIndex++) {
    var isInViewportElem = ArraySection[navbarLinksIndex];
    var aNavLink = document.getElementById('idNav' + isInViewportElem);
    if (isInViewport(isInViewportElem)) {
      if (navbarLinksIndex !== 0) {
        var aPrevElem = document.getElementById('idNav' + ArraySection[navbarLinksIndex - 1]);
        aPrevElem.classList.remove('active');
      }
      if (navbarLinksIndex !== (ArraySectionLength - 1)) {
        var aNextElem = document.getElementById('idNav' + ArraySection[navbarLinksIndex + 1]);
        aNextElem.classList.remove('active');
      }
      aNavLink.classList.add('active');
    }
  }
}
function isInViewport(element) {
  element = document.getElementById(element);
  var rect = element.getBoundingClientRect();
  var html = document.documentElement;
  return (
    rect.top <= 10 &&
    rect.bottom >= 0
    /*&&
       rect.left >= 0  &&
       rect.bottom <= (window.innerHeight || html.clientHeight) &&
     rect.right <= (window.innerWidth || html.clientWidth)*/
  );
}
