let players = ["First Player", "Second Player", "Third Player"];
let impostors = 1;
let roles = {};
let cardsToShow = [];
let gameState = "options";
let categories = [
    {name: "Minecraft Blocks", file: "blocks", enabled: true, words: undefined},
    {name: "Minecraft Effects", file: "effects", enabled: true, words: undefined},
    {name: "Minecraft Entities", file: "entities", enabled: true, words: undefined},
    {name: "Minecraft Items", file: "items", enabled: true, words: undefined},
];
let word = "";

function escapeForHTML(str) {
    return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function updateOptions() {
    document.querySelector("#categories-count").innerText = `${categories.filter(category => category.enabled).length}/${categories.length}`;
    document.querySelector("#categories-list").innerHTML = categories.map(category => `
<span class="category" onclick="toggleCategory(this);">
    <a class="checkmark"${category.enabled ? " checked" : ""}>${category.enabled ? `
        <svg viewBox="0 0 20 20">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M6 10L9 14L14 6"></path>
        </svg>
` : ""}</a>
    <a class="category-name">${escapeForHTML(category.name)}</a>
</span>`).join("");
    document.querySelector("#player-count").innerText = players.length;
    document.querySelector("#players-list").innerHTML = players.map(player => `
<span class="player">
    <a class="player-name">${escapeForHTML(player)}</a>
    <button class="player-remove" onclick="removePlayer(this);"${players.length > 3 ? "" : " disabled"}>
        <svg viewBox="0 0 20 20">
            <path stroke="currentColor" stroke-linecap="round" stroke-width="1.2" d="M6 6L14 14M6 14L14 6"></path>
        </svg>
    </button>
    <button class="player-rename" onclick="renamePlayer(this);">
        <svg viewBox="0 0 20 20">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M5.5 14.5L6.5 11.5L12.5 5.5C14 4 16 6 14.5 7.5L8.5 13.5ZM11.5 6.5L13.5 8.5"></path>
        </svg>
    </button>
</span>`).join("");
    document.querySelector("#impostor-count").innerText = impostors;
    document.querySelector("#impostor-add").toggleAttribute("disabled", impostors > players.length - 3);
    document.querySelector("#impostor-remove").toggleAttribute("disabled", impostors < 2);
    document.querySelector("#start").toggleAttribute("disabled", !categories.filter(category => category.enabled).length);
}

let freeListSizeTimeouts = [];
function toggleList(button) {
    button.toggleAttribute("toggled");
    let listBox = button.closest("options > *").querySelector(".list-box");
    listBox.setAttribute("style", `height: ${button.hasAttribute("toggled") ? 0 : listBox.querySelector(":scope > *").scrollHeight}px;`);
    listBox.offsetHeight;
    listBox.setAttribute("style", `height: ${button.hasAttribute("toggled") ? `${listBox.querySelector(":scope > *").scrollHeight}px` : 0};`);
    if (freeListSizeTimeouts[listBox.id]) {
        clearTimeout(freeListSizeTimeouts[listBox.id]);
    }
    if (button.hasAttribute("toggled")) {
        freeListSizeTimeouts[listBox.id] = setTimeout(() => {
            delete freeListSizeTimeouts[listBox.id];
            listBox.setAttribute("style", "");
        }, 200);
    }
}

function toggleCategory(button) {
    let category = categories[categories.findIndex(category => category.name == button.closest(".category").querySelector(".category-name").innerText)];
    if ((category.enabled = !category.enabled) && !category.words) {
        category.words = [];
        fetch(`categories/${category.file}`).then(r => r.text()).then(words => category.words = words.split("\n").map(word => word.trim()).filter(word => word));
    }
    updateOptions();
}

function addPlayer() {
    players.push("New Player");
    updateOptions();
    document.querySelector("#players-list").lastElementChild.querySelector(".player-rename").click();
    let toggleButton = document.querySelector("#players .toggle-list");
    if (!toggleButton.hasAttribute("toggled")) {
        toggleButton.click();
    }
}
function removePlayer(button) {
    players.splice([...button.closest("#players-list").children].indexOf(button.closest(".player")), 1);
    impostors = Math.max(1, Math.min(impostors, players.length - 2));
    updateOptions();
}
function renamePlayer(button) {
    let element = button.closest(".player");
    let index = [...button.closest("#players-list").children].indexOf(element);
    element.querySelector(".player-name").innerHTML = `<input type="text" value="${escapeForHTML(players[index])}">`;
    let input = element.querySelector("input");
    input.focus();
    input.selectionStart = 0;
    input.selectionEnd = input.value.length;
    let confirm = () => {
        confirm = () => {};
        if (input.isConnected) {
            players[index] = input.value;
            element.querySelector(".player-name").innerHTML = escapeForHTML(players[index]);
        }
    };
    input.onblur = () => confirm();
    input.onkeydown = e => {
        if (e.key == "Enter") {
            confirm();
        }
    };
}

function addImpostor() {
    impostors++;
    updateOptions();
}
function removeImpostor() {
    impostors--;
    updateOptions();
}

function start() {
    let words = categories.map(category => category.enabled && category.words ? category.words : []).flat();
    if (words.length) {
        word = words[Math.floor(Math.random() * words.length)];
        roles = {};
        let crew = [...players].map((player, index) => index);
        for (let i = 0; i < impostors; i++) {
            roles[crew.splice(Math.floor(Math.random() * crew.length), 1)[0]] = "impostor";
        }
        crew.forEach(player => roles[player] = "crew");
        cardsToShow = [...players].map((player, index) => index);
        gameState = "roles";
        continueGame();
    } else {
        document.querySelector("#card").toggleAttribute("hidden", true);
        document.querySelector("#info").toggleAttribute("hidden", false);
        document.querySelector("#info").innerHTML = `None of your selected categories are loaded yet.<br>This could be caused by your internet connection.<br>Try checking it or re-selecting the categories.`;
        document.querySelector("#continue").innerText = `Back`;
        gameState = "failed";
    }
    document.querySelector("game").toggleAttribute("hidden", false);
    document.querySelector("options").toggleAttribute("hidden", true);
}
function continueGame() {
    if (cardsToShow.length) {
        let player = cardsToShow.splice(Math.floor(Math.random() * cardsToShow.length), 1)[0];
        document.querySelector("#card").toggleAttribute("hidden", false);
        document.querySelector("#info").toggleAttribute("hidden", true);
        document.querySelector("#card-front").innerHTML = `<a class="card-name">${escapeForHTML(players[player])}</a>Drag up to reveal word or role.<br>Don't let anyone see it.`;
        document.querySelector("#card-back").innerHTML = roles[player] == "impostor" ? `You are ${impostors > 1 ? "an" : "the"} impostor.` : `The word is ${escapeForHTML(word)}.`;
        document.querySelector("#continue").toggleAttribute("disabled", true);
        document.querySelector("#continue").innerText = cardsToShow.length ? "Next" : "Start";
        document.querySelector("html").setAttribute("style", "overflow: hidden; overscroll-behavior: none;");
    } else {
        document.querySelector("#card").toggleAttribute("hidden", true);
        document.querySelector("#info").toggleAttribute("hidden", false);
        document.querySelector("html").removeAttribute("style");
        if (gameState == "roles") {
            document.querySelector("#info").innerHTML = `First up is ${escapeForHTML(players[Math.floor(Math.random() * players.length)])}.`;
            document.querySelector("#continue").innerText = `Reveal ${impostors > 1 ? "impostors" : "impostor"}`;
            gameState = "play";
        } else if (gameState == "play") {
            document.querySelector("#info").innerHTML = `The word was ${escapeForHTML(word)}.<br>The ${impostors > 1 ? "impostors were" : "impostor was"} ${players.filter((name, index) => roles[index] == "impostor").map(name => escapeForHTML(name)).reduce((str, name, index) => str + (index ? (index + 1 < impostors ? ", " : " and ") : "") + name)}.`;
            document.querySelector("#continue").innerText = `Done`;
            gameState = "reveal";
        } else {
            document.querySelector("options").toggleAttribute("hidden", false);
            document.querySelector("game").toggleAttribute("hidden", true);
            gameState = "options";
        }
    }
}

function grabCard(e) {
    let card = document.querySelector("#card-front");
    let cardDragOffset = e.clientY - card.offsetTop;
    let dragCard = e => {
        let card = document.querySelector("#card-front");
        card.setAttribute("style", `top: ${Math.min(0, Math.max(e.clientY - cardDragOffset, 40 - card.offsetHeight))}px; cursor: grabbing; transition: none;`);
        if (cardDragOffset - e.clientY > 100) {
            document.querySelector("#continue").toggleAttribute("disabled", false);
        }
    };
    let dropCard = () => {
        let card = document.querySelector("#card-front");
        card.removeAttribute("style");
        document.removeEventListener("pointermove", dragCard);
        document.removeEventListener("pointerup", dropCard);
        document.removeEventListener("blur", dropCard);
    };
    document.addEventListener("pointermove", dragCard);
    document.addEventListener("pointerup", dropCard);
    document.addEventListener("blur", dropCard);
}

document.addEventListener("DOMContentLoaded", () => {
    updateOptions();
    categories.filter(category => category.enabled).forEach(category => fetch(`categories/${category.file}`).then(r => r.text()).then(words => category.words = words.split("\n").map(word => word.trim()).filter(word => word)));
});
