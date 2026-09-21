function script() {
  let pipWindow;
  const pippedElements = new Map();

  const
    canvasElement = document.getElementById("canvas"),
    rightControls = document.getElementById("rightControls"),
    location = document.getElementById("location"),
    nextLocation = document.getElementById("nextLocationContainer"),
    eventsModal = document.getElementById("eventsModal");

  function getElementsFromString(html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const out = temp.children;
    delete temp;
    return out;
  }

  function replaceSearchMethod(funcName) {
    const ogFunc = document[funcName];
    document[funcName] = function () {
      const fallback = ogFunc.call(document, ...arguments);
      if (!fallback && pipWindow) return pipWindow.document[funcName](...arguments);
      return fallback;
    }
  }

  const [filler, enterBtn] = getElementsFromString(`
  <div id="_filler">
    <p style="color: #fff; height: min-content; text-align: center">Picture In Picture<br/>(Press this or close the window to pop back in!)</p>
  </div>
  <button id="pipBtn" class="iconButton">
      <svg fill="none" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 18 18">
        <path d="M-4,2.5 v13 h18 v-13 h-18 z M1,7 l3.5,3.5 m-3.5,0 l3.5,0 m0,-3.5 l0,3.5"></path>
        <path style="fill:var(--svg-base-gradient);" d="M6.5,12.5 v5.2 h9 v-5.2 h-9 z"></path>
    </svg>
  </button>
`);

  filler.style = `
  background-color: black;
  display: none;
  aspect-ratio: 320/240;
  width: 100%;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`;

  document.getElementById("canvasContainer").appendChild(filler);
  rightControls.prepend(enterBtn);
  enterBtn.onclick = () => pipElement(canvasElement);
  filler.onclick = () => unPipElement(canvasElement);

  const ogOpenModal = openModal;
  openModal = function (modalId, theme, lastModalId, modalData) {
    if (modalId === "eventsModal" && pipWindow) {
      const pipDoc = pipWindow.document;
      const modal = pipDoc.getElementById("pipModalContainer");
      modal.classList.remove("hidden");
      eventsModal.classList.remove("hidden");
    } else {
      ogOpenModal(modalId, theme, lastModalId, modalData);
    }
  }

  const ogOpenWikiModal = openWikiModal;
  openWikiModal = function (url, asImg) {
    if (pipWindow && pippedElements.get("canvas")) {
      if (asImg) {
        const pipDoc = pipWindow.document;
        const modal = pipDoc.getElementById("pipModalContainer");
        const wikiFrame = pipDoc.getElementById("pipWikiFrame");
        modal.classList.remove("hidden");
        wikiFrame.classList.remove("hidden");
        if (wikiFrame.src === url) return;
        wikiFrame.style.width = "0px";
        wikiFrame.style.height = "0px";
        //shut
        document.head.appendChild(wikiFrame);
        wikiFrame.src = url;
        wikiFrame.addEventListener("load", () => {
          console.log("loaded");
          wikiFrame.style.width = null;
          wikiFrame.style.height = null;
          modal.appendChild(wikiFrame);
        }, { once: true });
      } else {
        openInPopup(url);
      }
    } else {
      ogOpenWikiModal(url, asImg);
    }
  };

  replaceSearchMethod("getElementById");
  replaceSearchMethod("querySelector");

  function openInPopup(url) {
    const width = 200;
    const height = 150;
    const pipX = pipWindow ? pipWindow.screenX : 0;
    const pipY = pipWindow ? pipWindow.screenY : 0;
    console.log(pipX, pipY);
    window.open(url, 'wikiPopup', `popup=true,width=${width},height=${height},left=${pipX},top=${pipY + 130}`);
  }

  async function pipElement(element) {
    const id = element.id;
    if (pippedElements.get(id)) return;

    const originalParent = element.parentElement;

    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 200,
      height: 150,
    });

    const pipDoc = pipWindow.document, pipBody = pipDoc.body;

    if (id === "canvas") {
      pipWindow.document.head.innerHTML = `
    <style>
      body {
        margin: 0;
        background: black;
        font-family: Helvetica, sans-serif;
        font-size: 16px;
        color: #ffffff8f;
      }

      a, a:visited {
        color: inherit;
      }

      .hidden {
        display: none !important;
      }

      #canvas, #pipModalContainer, #pipWikiFrame, #eventsModal {
        transform: translate(-50%, -50%);
        left: 50%;
        top: 50%;
      }

      #canvas  {
        position: fixed;
        object-fit: contain;
        aspect-ratio: 320 / 240;
        height: auto;
        width: min(100vw, 100vh * (320 / 240));
        outline: none;
        border: none;
      }

      #pipModalContainer {
        position: fixed;
        background: #00000080;
        width: 100%;
        height: 100%;
        z-index: 5;
      }

      #pipWikiFrame, #eventsModal {
        position: fixed;
        width: calc(100vw - 50px);
        height: calc(100vh - 50px);
      }

      #rightControls {
        position: fixed;
        right: 0;
        display: flex;
        background: #00000080;
        justify-content: right;
        flex-direction: row;
        align-items: baseline;
        z-index: 1;
      }

      .iconButton {
        background: transparent;
        border: none;
        cursor: pointer;
        -webkit-appearance: button;
        appearance: button;
      }

      .iconButton path, .icon path, .icon circle {
        stroke: #ffffff4d;
      }

      #locationContainer {
        position: fixed;
        left: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: left;
        z-index: 2;
        background: #00000080;
        padding: 5px;
      }

      #location {
        flex-direction: row-reverse;
        justify-content: right;
      }

      #nextLocationContainer {
        display: flex;
        height: min-content;
      }

      #locationLabel, #nextLocationText {
        height: fit-content;
      }

      #eventsModal {
        position: fixed;
        display: block;
        background: black;
        overflow-y: scroll;
        border: 1px solid #ffffff4d;
        border-radius: 5px;
        padding: 20px;
        box-sizing: border-box;
      }

      #eventsModal *:not(.modalContent, #eventLocationsList, #eventLocationsList *:not(.depthContainer)) {
        display: none;
      }
    </style>
  `;

      const locationContainer = document.createElement("div"),
        modal = document.createElement("div"),
        wikiFrame = document.createElement("iframe");

      locationContainer.id = "locationContainer", modal.id = "pipModalContainer", wikiFrame.id = "pipWikiFrame";
      modal.classList.add("hidden");
      wikiFrame.classList.add("hidden");
      eventsModal.classList.add("hidden");
      filler.style.display = "flex";

      modal.onclick = (e) => {
        if (e.target !== e.currentTarget) return;
        modal.classList.add("hidden");
        wikiFrame.classList.add("hidden");
        eventsModal.classList.add("hidden");
      };

      pipBody.appendChild(locationContainer);
      pipBody.appendChild(modal);
      pipBody.appendChild(rightControls);
      locationContainer.appendChild(location);
      locationContainer.appendChild(nextLocation);
      modal.appendChild(wikiFrame);
      modal.appendChild(eventsModal);

      pipDoc.addEventListener('click', e => {
        const target = e.target.closest('a');
        if (target && target.classList.contains('wikiLink') && openWikiLink(target.href, true)) e.preventDefault();
      });
    }

    pipWindow.addEventListener("pagehide", () => unPipElement(element), { once: true });
    pipWindow.document.body.appendChild(element);

    pippedElements.set(id, {
      element,
      originalParent,
    });
  }

  function unPipElement(element) {
    const id = element.id;
    const pipData = pippedElements.get(id);

    if (!pipData) return;
    pipData.originalParent.appendChild(element);
    pippedElements.delete(id);

    if (id === "canvas") {
      filler.style.display = "none";
      document.getElementById("controls").appendChild(rightControls);
      document.getElementById("chatboxInfo").appendChild(location);
      document.getElementById("chatboxInfo").appendChild(nextLocation);
      document.getElementById("modalContainer").appendChild(eventsModal);
      pipWindow.close();
    }
  }
}

if (document.readyState === 'complete') {
  script();
} else {
  window.addEventListener('load', () => {
    script();
  });
}
