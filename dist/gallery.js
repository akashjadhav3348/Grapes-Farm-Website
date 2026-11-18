const groups = [
  {
    label: "नवी पालवी",
    description: "द्राक्षवेलीची नवी पालवी",
    ids: [28, 19, 30, 21, 44, 25],
  },
  {
    label: "वेलींची वाढ",
    description: "द्राक्षबागेतल्या वेलींच्या रांगा",
    ids: [22, 57, 72, 13, 17, 20, 27, 58, 62, 63, 66, 69, 71],
  },
  {
    label: "वेलीवरचे घड",
    description: "वेलीवरचे द्राक्षांचे घड",
    ids: [67, 45, 56, 42, 51, 70, 6, 7, 11, 14, 15, 18, 31, 34, 36, 37, 38, 40, 46, 47, 48, 49, 50, 52, 53, 54, 59, 60, 61, 64, 65, 73, 75, 76],
  },
  {
    label: "तोडणी व पॅकिंग",
    description: "तोडलेली द्राक्षं आणि क्रेट्स",
    ids: [55, 8, 43, 10, 68, 74, 4, 5, 9, 16, 23, 24, 26, 29, 33, 35, 39, 41],
  },
  {
    label: "शेताची दृश्यं",
    description: "ऐश्वर्य फार्म्सवरचं इंद्रधनुष्य",
    ids: [78, 77, 79, 80],
  },
  {
    label: "व्हिडिओ",
    description: "शेतातला व्हिडिओ",
    ids: [1, 2, 3, 12, 32],
    video: true,
  },
];

const previewCount = 6;
const controls = document.querySelector(".gallery-controls");
const grid = document.querySelector("#gallery-items");
const more = document.querySelector(".gallery-more");
const statusMessage = document.querySelector("#gallery-status");
const viewer = document.querySelector("#photo-viewer");
const viewerImage = document.querySelector("#viewer-image");
const caption = document.querySelector("#viewer-caption");
let currentGroup = 0;
let currentPhoto = 0;
let expanded = false;

function fileName(id, extension) {
  return String(id).padStart(2, "0") + "." + extension;
}

function mediaLabel(group, index) {
  return group.description + " (" + (index + 1) + "/" + group.ids.length + ")";
}

function updateViewer(index) {
  const group = groups[currentGroup];
  currentPhoto = (index + group.ids.length) % group.ids.length;
  viewerImage.src = "assets/farm/" + fileName(group.ids[currentPhoto], "jpg");
  viewerImage.alt = group.description;
  caption.textContent = mediaLabel(group, currentPhoto);
}

function makePhoto(group, id, index) {
  const name = fileName(id, "jpg");
  const link = document.createElement("a");
  link.className = "photo-tile";
  link.href = "assets/farm/" + name;

  const photo = document.createElement("img");
  photo.src = "assets/thumb/" + name;
  photo.loading = "lazy";
  photo.decoding = "async";
  photo.alt = mediaLabel(group, index);
  link.append(photo);

  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer.showModal) return;
    event.preventDefault();
    updateViewer(index);
    viewer.showModal();
  });
  return link;
}

function makeVideo(group, id, index) {
  const tile = document.createElement("figure");
  tile.className = "video-tile";

  const video = document.createElement("video");
  video.controls = true;
  video.preload = "metadata";
  video.playsInline = true;
  video.src = "assets/farm/" + fileName(id, "mp4");

  const label = document.createElement("figcaption");
  label.id = "video-caption-" + id;
  label.textContent = mediaLabel(group, index);
  video.setAttribute("aria-labelledby", label.id);
  tile.append(video, label);
  return tile;
}

function renderGallery(announce = true) {
  const group = groups[currentGroup];
  const visible = expanded ? group.ids : group.ids.slice(0, previewCount);
  const makeTile = group.video ? makeVideo : makePhoto;
  grid.replaceChildren(...visible.map((id, index) => makeTile(group, id, index)));

  filterButtons.forEach((button, index) => {
    button.setAttribute("aria-pressed", String(index === currentGroup));
  });
  more.hidden = group.ids.length <= previewCount;
  more.setAttribute("aria-expanded", String(expanded));
  more.textContent = expanded ? "कमी फोटो दाखवा ↑" : "सर्व " + group.ids.length + " फोटो पाहा ↓";
  if (announce) {
    statusMessage.textContent = group.label + " · " + visible.length + "/" + group.ids.length;
  }
}

const filterButtons = groups.map((group, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = group.label;
  button.setAttribute("aria-controls", grid.id);
  button.addEventListener("click", () => {
    if (currentGroup === index) return;
    currentGroup = index;
    expanded = false;
    renderGallery();
  });
  return button;
});

more.setAttribute("aria-controls", grid.id);
more.addEventListener("click", () => {
  expanded = !expanded;
  renderGallery();
  if (expanded) {
    grid.children[previewCount]?.focus();
  } else {
    more.focus();
    more.scrollIntoView({ block: "nearest" });
  }
});

viewer.querySelector(".viewer-close").addEventListener("click", () => viewer.close());
viewer.querySelector(".viewer-prev").addEventListener("click", () => updateViewer(currentPhoto - 1));
viewer.querySelector(".viewer-next").addEventListener("click", () => updateViewer(currentPhoto + 1));
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) viewer.close();
});
viewer.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    updateViewer(currentPhoto - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    updateViewer(currentPhoto + 1);
  }
});

controls.append(...filterButtons);
controls.hidden = false;
renderGallery(false);
