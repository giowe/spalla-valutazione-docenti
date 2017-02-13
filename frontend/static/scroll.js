//js of ZHOU 
function scrollZhou(eID, speed) {
  var windowObject = window;
  var windowPos = windowObject.pageYOffset;
  //var pointer = toElement.getAttribute('href').slice(1);
  var elem = document.getElementById(eID);
  var elemOffset = elem.offsetTop;

  if (windowPos > elemOffset) {
    speed = (windowPos - elemOffset)/speed;
  } 
  if (windowPos < elemOffset) {
    speed = (elemOffset - windowPos)/speed;
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

  }, 1);
}

function navbarScroll(elem) {
  var docID = elem.getAttribute("href")
  docID = docID.substr(1);
  scrollZhou(docID, 150);
}
//todo se ri riesce a usarlo si puo activare i link della navbar
var userHasScrolled = false;
var ArraySection =[];
var ArraySectionLength;
window.onload = getNavbarAncor();
function getNavbarAncor(){
  var navbarLinks = document.getElementsByClassName('static-navbar-link');
  var navbarLinksLength = navbarLinks.length;
  for (var navbarLinksIndex = 0; navbarLinksIndex < navbarLinksLength; navbarLinksIndex++){
    ArraySection.push(navbarLinks[navbarLinksIndex].hash.substr(1));
  }
  ArraySectionLength = ArraySection.length;
}
window.onscroll = function(e){
  userHasScrolled =true;
  if(userHasScrolled){
    for (var navbarLinksIndex = 0; navbarLinksIndex < ArraySectionLength; navbarLinksIndex++){
      var isInViewportElem = ArraySection[navbarLinksIndex];
      var aNavLink = document.getElementById('idNav'+isInViewportElem);
      if(isInViewport(isInViewportElem)){
        aNavLink.classList.add('active');
      }else{
        aNavLink.classList.remove('active');
      }
    }
    userHasScrolled = false;
  }
}
function isInViewport(element) {//return true if is in viewport
  element = document.getElementById(element);
  var rect = element.getBoundingClientRect();
  var html = document.documentElement;
  return (
    rect.top <= 25 &&
    rect.bottom >= 0 /*&&
    rect.left >= 0  &&
    rect.bottom <= (window.innerHeight || html.clientHeight) &&
  rect.right <= (window.innerWidth || html.clientWidth)*/
  );
}

