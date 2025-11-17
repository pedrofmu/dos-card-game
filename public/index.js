"use strict";

function setCookie(name, value, seconds) {
  let date = new Date();
  date.setTime(date.getTime() + seconds * 1000);
  let expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  name += "=";
  let cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) == " ") {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) == 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}

if (getCookie("roomName") === null) {
  setCookie("roomName", "default_room", 24 * 3600);
}

document.getElementById("play_online_btn").addEventListener("click", () => {
  location.href = "/game/game.html";
});

document
  .getElementById("play_with_robots_btn")
  .addEventListener("click", () => {
    alert("En construcción");
  });
