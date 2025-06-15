// Utilities
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '{}');
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function setLoggedInUser(username) {
    localStorage.setItem('loggedInUser', username);
}

function getLoggedInUser() {
    return localStorage.getItem('loggedInUser');
}

function requireAuth() {
    if (!getLoggedInUser()) {
        window.location.href = 'login.html';
    }
}

// Authentication
function login() {
    const users = getUsers();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (users[username] && users[username] === password) {
        setLoggedInUser(username);
        window.location.href = 'index.html';
    } else {
        alert('Invalid credentials');
    }
}

function register() {
    const users = getUsers();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    if (username && password) {
        if (users[username]) {
            alert('User already exists');
            return;
        }
        users[username] = password;
        saveUsers(users);
        alert('Registered successfully');
    } else {
        alert('Enter username and password');
    }
}

function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

// Favorites
function loadFavorites() {
    const user = getLoggedInUser();
    const favorites = JSON.parse(localStorage.getItem('favorites_' + user) || '[]');
    const list = document.getElementById('favorite-list');
    if (!list) return;
    list.innerHTML = '';
    favorites.forEach(fav => {
        const item = document.createElement('div');
        item.textContent = fav;
        item.className = 'favorite-item';
        item.onclick = () => loadPriceHistoryModule(fav);
        list.appendChild(item);
    });
}

function addFavorite() {
    const input = document.getElementById('add-favorite-input');
    const coin = input.value.trim();
    if (!coin) return;
    const user = getLoggedInUser();
    const key = 'favorites_' + user;
    const favorites = JSON.parse(localStorage.getItem(key) || '[]');
    if (!favorites.includes(coin)) {
        favorites.push(coin);
        localStorage.setItem(key, JSON.stringify(favorites));
        loadFavorites();
    }
    input.value = '';
}

// Modules
function clearModuleContainer() {
    const container = document.getElementById('module-container');
    container.innerHTML = '';
}

function loadPriceHistoryModule(coinId) {
    requireAuth();
    clearModuleContainer();
    const container = document.getElementById('module-container');
    const coin = coinId || 'bitcoin';

    const title = document.createElement('h3');
    title.textContent = 'Price History for ' + coin;
    container.appendChild(title);

    const list = document.createElement('ul');
    container.appendChild(list);

    fetch(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=7`)
        .then(resp => resp.json())
        .then(data => {
            list.innerHTML = '';
            data.prices.forEach(point => {
                const li = document.createElement('li');
                const date = new Date(point[0]);
                li.textContent = `${date.toLocaleDateString()} : $${point[1].toFixed(2)}`;
                list.appendChild(li);
            });
        })
        .catch(err => {
            list.innerHTML = 'Failed to load data';
            console.error(err);
        });
}

function loadNewsModule() {
    requireAuth();
    clearModuleContainer();
    const container = document.getElementById('module-container');
    const title = document.createElement('h3');
    title.textContent = 'Crypto News';
    container.appendChild(title);

    const list = document.createElement('ul');
    container.appendChild(list);

    fetch('https://api.coingecko.com/api/v3/search/trending')
        .then(resp => resp.json())
        .then(data => {
            list.innerHTML = '';
            data.coins.forEach(c => {
                const li = document.createElement('li');
                li.textContent = `${c.item.name} (${c.item.symbol}): rank ${c.item.market_cap_rank}`;
                list.appendChild(li);
            });
        })
        .catch(err => {
            list.innerHTML = 'Failed to load news';
            console.error(err);
        });
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('login-page')) {
        if (getLoggedInUser()) {
            window.location.href = 'index.html';
        }
    } else {
        requireAuth();
        document.getElementById('current-user').textContent = getLoggedInUser();
        loadFavorites();
    }
});
