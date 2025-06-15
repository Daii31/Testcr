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

function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

// Watch list with folders and search
function getWatchFolders() {
    const user = getLoggedInUser();
    return JSON.parse(localStorage.getItem('watch_folders_' + user) || '[]');
}

function saveWatchFolders(folders) {
    const user = getLoggedInUser();
    localStorage.setItem('watch_folders_' + user, JSON.stringify(folders));
}

function addWatchFolder() {
    const input = document.getElementById('folder-name-input');
    const name = input.value.trim();
    if (!name) return;
    const folders = getWatchFolders();
    folders.push({ name, coins: [] });
    saveWatchFolders(folders);
    input.value = '';
    loadWatchList();
}

function moveWatchItem(coinId, fromIndex, toIndex) {
    const folders = getWatchFolders();
    if (!folders[fromIndex] || !folders[toIndex]) return;
    const idx = folders[fromIndex].coins.indexOf(coinId);
    if (idx !== -1) {
        folders[fromIndex].coins.splice(idx, 1);
        if (!folders[toIndex].coins.includes(coinId)) {
            folders[toIndex].coins.push(coinId);
        }
        saveWatchFolders(folders);
        loadWatchList();
    }
}

function addWatchFromSearch(id) {
    let folders = getWatchFolders();
    if (folders.length === 0) {
        folders.push({ name: 'Default', coins: [] });
    }
    if (!folders[0].coins.includes(id)) {
        folders[0].coins.push(id);
        saveWatchFolders(folders);
        loadWatchList();
    }
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('watch-search-input').value = '';
}

function getWatchAliases() {
    const user = getLoggedInUser();
    return JSON.parse(localStorage.getItem('watch_aliases_' + user) || '{}');
}

function saveWatchAliases(aliases) {
    const user = getLoggedInUser();
    localStorage.setItem('watch_aliases_' + user, JSON.stringify(aliases));
}

function renameWatchItem(coinId) {
    const aliases = getWatchAliases();
    const current = aliases[coinId] || '';
    const name = prompt('Custom name', current);
    if (name !== null) {
        if (name.trim() === '') {
            delete aliases[coinId];
        } else {
            aliases[coinId] = name.trim();
        }
        saveWatchAliases(aliases);
        loadWatchList();
    }
}

function removeWatchItem(coinId, folderIndex) {
    const folders = getWatchFolders();
    const idx = folders[folderIndex].coins.indexOf(coinId);
    if (idx !== -1) {
        folders[folderIndex].coins.splice(idx, 1);
        saveWatchFolders(folders);
        loadWatchList();
    }
}

function loadWatchList() {
    const container = document.getElementById('watch-folders');
    if (!container) return;
    const folders = getWatchFolders();
    container.innerHTML = '';

    folders.forEach((folder, fIndex) => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        const title = document.createElement('div');
        title.className = 'folder-title';
        title.textContent = folder.name;
        folderDiv.appendChild(title);

        const chainMap = {};
        folder.coins.forEach(id => {
            chainMap[id] = null; // placeholder
        });

        Promise.all(folder.coins.map(id => fetch(`https://api.coingecko.com/api/v3/coins/${id}`)
            .then(r => r.json())
            .then(data => ({ id, data }))
            .catch(() => null)))
            .then(results => {
                results.forEach(res => {
                    if (!res) return;
                    const chain = Object.keys(res.data.platforms)[0] || 'Unknown';
                    if (!chainMap[chain]) chainMap[chain] = [];
                    chainMap[chain].push(res);
                });

                Object.keys(chainMap).forEach(chain => {
                    const chainTitle = document.createElement('div');
                    chainTitle.textContent = chain;
                    chainTitle.className = 'chain-title';
                    folderDiv.appendChild(chainTitle);

                    chainMap[chain].forEach(res => {
                        const item = document.createElement('div');
                        item.className = 'watch-item';
                        const img = document.createElement('img');
                        img.src = res.data.image.thumb;
                        item.appendChild(img);

                        const span = document.createElement('span');
                        const price = res.data.market_data.current_price.usd;
                        const aliases = getWatchAliases();
                        const alias = aliases[res.id];
                        const name = alias ? `${alias} (${res.data.name})` : res.data.name;
                        span.textContent = `${name} - $${price}`;
                        item.appendChild(span);

                        item.onclick = () => loadPriceHistoryModule(res.id);

                        const select = document.createElement('select');
                        folders.forEach((f, idx) => {
                            const opt = document.createElement('option');
                            opt.value = idx;
                            opt.textContent = f.name;
                            if (idx === fIndex) opt.selected = true;
                            select.appendChild(opt);
                        });
                        select.onchange = () => moveWatchItem(res.id, fIndex, parseInt(select.value));
                        item.appendChild(select);

                        const renameBtn = document.createElement('button');
                        renameBtn.textContent = 'Rename';
                        renameBtn.onclick = e => { e.stopPropagation(); renameWatchItem(res.id); };
                        item.appendChild(renameBtn);

                        const removeBtn = document.createElement('button');
                        removeBtn.textContent = 'Remove';
                        removeBtn.onclick = e => { e.stopPropagation(); removeWatchItem(res.id, fIndex); };
                        item.appendChild(removeBtn);

                        folderDiv.appendChild(item);
                    });
                });
            });

        container.appendChild(folderDiv);
    });
}

function searchCoins(query) {
    const resultsDiv = document.getElementById('search-results');
    if (!resultsDiv) return;
    if (!query) {
        resultsDiv.innerHTML = '';
        return;
    }

    fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`)
        .then(resp => {
            if (!resp.ok) throw new Error('search api error');
            return resp.json();
        })
        .then(data => {
            const ids = data.coins.map(c => c.id);
            if (ids.length === 0) {
                resultsDiv.innerHTML = 'No results';
                return;
            }
            return fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`)
                .then(r => {
                    if (!r.ok) throw new Error('price api error');
                    return r.json();
                })
                .then(priceData => {
                    resultsDiv.innerHTML = '';
                    data.coins.forEach(c => {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        const img = document.createElement('img');
                        img.src = c.thumb;
                        div.appendChild(img);
                        const span = document.createElement('span');
                        const price = priceData[c.id] ? priceData[c.id].usd : 'N/A';
                        span.textContent = `${c.name} - $${price}`;
                        div.appendChild(span);
                        div.onclick = () => addWatchFromSearch(c.id);
                        resultsDiv.appendChild(div);
                    });
                });
        })
        .catch(err => {
            console.error(err);
            resultsDiv.innerHTML = 'Search failed';
        });
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
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        if (document.body.classList.contains('login-page')) {
            if (getLoggedInUser()) {
                window.location.href = 'index.html';
            } else {
                showLoginForm();
            }
        } else {
            requireAuth();
            document.getElementById('current-user').textContent = getLoggedInUser();
            const searchInput = document.getElementById('watch-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', e => searchCoins(e.target.value));
            }
            loadWatchList();
        }
    });
}

// Export functions for testing in Node
if (typeof module !== 'undefined') {
    module.exports = { searchCoins };
}
