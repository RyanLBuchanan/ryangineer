/* global document, window, localStorage */

// Code for heading changer
// var myHeading = document.querySelector('h1')
//
// myHeading.textContent = 'Living the Dream!';

// Code for image onclick event
// document.querySelector("html").onclick = function() {
//   alert("Ouch, Stop poking me!");
// }


''' Dark mode code '''
const options = {
  bottom: '32px', // default: '32px'
  right: '32px', // default: '32px'
  left: 'unset', // default: 'unset'
  time: '0.5s', // default: '0.3s'
  mixColor: '#fff', // default: '#fff'
  backgroundColor: '#fff',  // default: '#fff'
  buttonColorDark: '#100f2c',  // default: '#100f2c'
  buttonColorLight: '#fff', // default: '#fff'
  saveInCookies: true, // default: true,
  label: '🌓', // default: ''
  autoMatchOsTheme: true // default: true
}

const darkmode = new Darkmode(options);
darkmode.showWidget();

// Code for image switcher
var splashImage = document.querySelector('img');

splashImage.onclick = function() {
  var myImages = splashImage.getAttribute('src');
  if (myImages === 'images/blue_kit.jpg') {
    splashImage.setAttribute('src', 'assets/curi_kit.jpg');
  } else {
    splashImage.setAttribute('src', 'assets/blue_kit.jpg');
  }

}

$(document).ready(function() {
  $('#dream').hover(
    function () {
      $(this).css({"background-color":"gray"});
    },
    function () {
      $(this).css({"background-color":"black"});
    });
  $('#dream').dblclick(
    function () {
      $(this).css({"background-color":"white"});
    });
  $('#dream').click(
    function () {
      $(this).css({"background-color":"purple"})
    });
});

// $(document).ready(function(){
//   $("button").click(function(){
//     // $("h2").hide();
//     // $("#vr_video").hide();
//     // $(".para").hide();
//     //$("*").hide();
//     // $("p:first").hide();
//     $(this).hide();
//   });
// });


$(document).ready(function(){
  $("#stretch-btn").click(function(){
    $("#dream").animate({left:'200px'}, "slow");
    $("#dream").animate({fontSize:'5em'}, "slow");
  });
});

$(document).ready(function(){
  $("#show").click(function(){
    $("#dream").show("fast");
  });
  $("#hide").click(function(){
    $("#dream").hide(1000, "swing");
  });
  $("#toggle").click(function(){
    $("#dream").toggle("slow");
  });
});

$(document).ready(function(){
  $("#fade-btn").click(function(){
    $("#box1").fadeOut();
    $("#box2").fadeOut("slow");
    $("#box3").fadeOut(1000);
    $("#box4").fadeOut(3000);
  });
});

// JSON item at bottom of webpage
// var text = '{"myStaff":[' +
//   '{"firstName":"Alita","lastName":"Girl-Cyborg"},' +
//   '{"firstName":"Major","lastName":"Lady-Cyborg"},' +
//   '{"firstName":"Aida","lastName":"Lady-AI" }]}';
//
// obj = JSON.parse(text);
// document.getElementById("mycode").innerHTML =
//   obj.myStaff[0].firstName + " " + obj.myStaff[0].lastName;

// $(document).ready(function() {
//   $("a").click(function(event) {
//     alert("Thanks for playing!!!");
//   });
// });

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

// $(document).ready(function(){
//   $("button").click(function(){
//     // $("h2").hide();
//     // $("#vr_video").hide();
//     // $(".para").hide();
//     //$("*").hide();
//     // $("p:first").hide();
//     $(this).hide();
//   });
// });
