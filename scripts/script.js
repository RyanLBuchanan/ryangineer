/* global document, window, localStorage */

// Code for heading changer
// var myHeading = document.querySelector('h1')
//
// myHeading.textContent = 'Living the Dream!';

// Code for image onclick event
// document.querySelector("html").onclick = function() {
//   alert("Ouch, Stop poking me!");
// }

// Code for image switcher
var splashImage = document.querySelector('img');

splashImage.onclick = function() {
  var myImages = splashImage.getAttribute('src');
  if (myImages === 'images/blue_kit.jpg') {
    splashImage.setAttribute('src', 'images/curi_kit.jpg');
  } else {
    splashImage.setAttribute('src', 'images/blue_kit.jpg');
  }

}


// // Personalized welcome message Code
// var nameButton = document.querySelector('button');
// var myHeading = document.querySelector('h1');
//
// function setUserName() {
//   'use strict';
//   var myName = window.prompt('Please enter your name');
//   localStorage.setItem('name', myName);
//   myHeading.textContent = 'Have a lovely day, ' + myName;
// }
// if (!localStorage.getItem('name')) {
//   setUserName();
// } else {
//   var storedName = localStorage.getItem('name');
//   myHeading.textContent = 'Have a lovely day, ' + storedName;
// }
// nameButton.onclick = function() {
//   'use strict';
//   setUserName();
// };
