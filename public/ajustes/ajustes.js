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

document.getElementById("aplly_settings_btn").addEventListener("click", () => {
  setCookie(
    "roomName",
    document.getElementById("room_name_input").value,
    24 * 3600,
  );
  setCookie(
    "playerName",
    document.getElementById("player_name_input").value,
    24 * 3600,
  );
  alert("Se han aplicado los ajustes");
});

let playerName = getCookie("playerName");
document.getElementById("player_name_input").value = playerName;

let roomName = getCookie("roomName");
document.getElementById("room_name_input").value = roomName;
