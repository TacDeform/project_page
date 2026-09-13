"use strict";

// Without scripting, every gallery panel stays visible and figures open as plain links.
document.documentElement.classList.add("js");

/* Experiment gallery tabs */
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

function selectTab(tab, moveFocus) {
  tabs.forEach((other, index) => {
    const active = other === tab;
    other.setAttribute("aria-selected", String(active));
    other.tabIndex = active ? 0 : -1;
    panels[index].hidden = !active;
  });
  if (moveFocus) tab.focus();
}

if (tabs.length) {
  selectTab(tabs[0], false);
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab, false));
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step) {
        event.preventDefault();
        selectTab(tabs[(index + step + tabs.length) % tabs.length], true);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        selectTab(event.key === "Home" ? tabs[0] : tabs[tabs.length - 1], true);
      }
    });
  });
}

/* Video slot: show the placeholder until an actual file is in place */
const video = document.getElementById("overview-video");
const videoFigure = document.getElementById("video-figure");
const videoEmpty = document.getElementById("video-empty");
if (video && videoFigure && videoEmpty) {
  const source = video.querySelector("source");
  const showPlaceholder = () => {
    videoFigure.classList.add("is-empty");
    videoEmpty.hidden = false;
  };
  // preload="metadata" makes a missing file surface as an error on load.
  if (source) source.addEventListener("error", showPlaceholder);
  video.addEventListener("error", showPlaceholder);
}
