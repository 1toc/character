// === グローバル変数 ===
let icfData = [];
let structuredData = {};
let currentSelection = {
    domain: null,
    category: null,
    code: null
};

// === 初期化 ===
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadCSVData();
        structureData();
        initializeNavigation();
        updateStats();
    } catch (error) {
        console.error('初期化エラー:', error);
        showError('データの読み込みに失敗しました: ' + error.message);
    }
});

// === CSVデータ読み込み ===
async function loadCSVData() {
    try {
        const response = await fetch('data.csv');
        if (!response.ok) {
            throw new Error('CSVファイルの読み込みに失敗しました');
        }
        const csvText = await response.text();
        parseCSV(csvText);
    } catch (error) {
        console.error('CSV読み込みエラー:', error);
        throw error;
    }
}

// === CSV解析 ===
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    icfData = [];
    let lastDomain = '';
    let lastCategory = '';
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        if (values.length >= 6) {
            // 空の値を前の行の値で補完
            const domain = values[0].trim() || lastDomain;
            const category = values[1].trim() || lastCategory;
            const code = values[2].trim();
            
            if (domain) lastDomain = domain;
            if (category) lastCategory = category;
            
            const row = {
                domain: domain,
                category: category,
                code: code,
                description: values[3].trim(),
                gameApplication: values[4].trim(),
                gameExample: values[5].trim()
            };
            
            // 空のコードをスキップ、ただしdomainとcategoryは必須
            if (code && domain && category) {
                icfData.push(row);
            }
        }
    }
}

// === CSV行解析（カンマを含む文字列に対応） ===
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// === データ構造化 ===
function structureData() {
    structuredData = {};
    
    icfData.forEach(item => {
        if (!structuredData[item.domain]) {
            structuredData[item.domain] = {};
        }
        
        if (!structuredData[item.domain][item.category]) {
            structuredData[item.domain][item.category] = [];
        }
        
        structuredData[item.domain][item.category].push(item);
    });
}

// === ナビゲーション初期化 ===
function initializeNavigation() {
    renderDomains();
}

// === ドメイン一覧表示 ===
function renderDomains() {
    const domainList = document.getElementById('domain-list');
    if (!domainList) {
        console.error('domain-list要素が見つかりません');
        return;
    }
    
    domainList.innerHTML = '';
    const domains = Object.keys(structuredData);
    
    domains.forEach(domain => {
        const domainItem = createNavItem(domain, () => selectDomain(domain));
        domainList.appendChild(domainItem);
    });
}

// === カテゴリー一覧表示 ===
function renderCategories(domain) {
    const categoryList = document.getElementById('category-list');
    const categorySection = document.getElementById('category-section');
    
    categoryList.innerHTML = '';
    
    if (structuredData[domain]) {
        Object.keys(structuredData[domain]).forEach(category => {
            const categoryItem = createNavItem(category, () => selectCategory(domain, category));
            categoryList.appendChild(categoryItem);
        });
        
        categorySection.style.display = 'block';
    } else {
        categorySection.style.display = 'none';
    }
}

// === コード一覧表示 ===
function renderCodes(domain, category) {
    const codeList = document.getElementById('code-list');
    const codeSection = document.getElementById('code-section');
    
    codeList.innerHTML = '';
    
    if (structuredData[domain] && structuredData[domain][category]) {
        structuredData[domain][category].forEach(item => {
            const codeItem = createNavItem(item.code, () => selectCode(domain, category, item.code));
            codeList.appendChild(codeItem);
        });
        
        codeSection.style.display = 'block';
    } else {
        codeSection.style.display = 'none';
    }
}

// === ナビゲーションアイテム作成 ===
function createNavItem(text, onClick) {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.textContent = text;
    item.addEventListener('click', onClick);
    return item;
}

// === ドメイン選択 ===
function selectDomain(domain) {
    // アクティブ状態をリセット
    clearActiveStates();
    
    // 選択状態を更新
    currentSelection.domain = domain;
    currentSelection.category = null;
    currentSelection.code = null;
    
    // ドメインをアクティブに
    setActiveItem('domain-list', domain);
    
    // カテゴリー表示
    renderCategories(domain);
    
    // コードセクションを非表示
    document.getElementById('code-section').style.display = 'none';
    
    // 詳細エリアをクリア
    clearDetailsPanel();
}

// === カテゴリー選択 ===
function selectCategory(domain, category) {
    // カテゴリーのみアクティブ状態をクリア
    clearActiveStates('category');
    
    // 選択状態を更新
    currentSelection.category = category;
    currentSelection.code = null;
    
    // カテゴリーをアクティブに
    setActiveItem('category-list', category);
    
    // コード表示
    renderCodes(domain, category);
    
    // 詳細エリアをクリア
    clearDetailsPanel();
}

// === コード選択 ===
function selectCode(domain, category, code) {
    // コードのみアクティブ状態をクリア
    clearActiveStates('code');
    
    // 選択状態を更新
    currentSelection.code = code;
    
    // コードをアクティブに
    setActiveItem('code-list', code);
    
    // 詳細情報を表示
    displayCodeDetails(domain, category, code);
}

// === アクティブ状態クリア ===
function clearActiveStates(level = 'all') {
    if (level === 'all' || level === 'domain') {
        document.querySelectorAll('#domain-list .nav-item').forEach(item => {
            item.classList.remove('active');
        });
    }
    
    if (level === 'all' || level === 'category') {
        document.querySelectorAll('#category-list .nav-item').forEach(item => {
            item.classList.remove('active');
        });
    }
    
    if (level === 'all' || level === 'code') {
        document.querySelectorAll('#code-list .nav-item').forEach(item => {
            item.classList.remove('active');
        });
    }
}

// === アクティブアイテム設定 ===
function setActiveItem(listId, text) {
    document.querySelectorAll(`#${listId} .nav-item`).forEach(item => {
        if (item.textContent === text) {
            item.classList.add('active');
        }
    });
}

// === コード詳細表示 ===
function displayCodeDetails(domain, category, code) {
    const detailsContent = document.getElementById('details-content');
    
    // 該当データを検索
    const codeData = icfData.find(item => 
        item.domain === domain && 
        item.category === category && 
        item.code === code
    );
    
    if (!codeData) {
        showError('データが見つかりませんでした。');
        return;
    }
    
    detailsContent.innerHTML = `
        <div class="code-details">
            <div class="code-title">${codeData.code}</div>
            
            <div class="breadcrumb">
                ${domain} > ${category} > ${code}
            </div>
            
            <div class="info-section">
                <div class="info-section-header">
                    <i class="icon">📋</i> コードの解説（医学的・リハビリテーション的視点）
                </div>
                <div class="info-section-content">
                    ${codeData.description}
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-section-header">
                    <i class="icon">🎮</i> ゲームへの応用
                </div>
                <div class="info-section-content">
                    ${codeData.gameApplication}
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-section-header">
                    <i class="icon">🎯</i> ゲームへの応用の具体例
                </div>
                <div class="info-section-content">
                    ${codeData.gameExample}
                </div>
            </div>
        </div>
    `;
}

// === 詳細パネルクリア ===
function clearDetailsPanel() {
    const detailsContent = document.getElementById('details-content');
    detailsContent.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">⚡</div>
            <h3>ICF キャラクター機能パラメータ システム</h3>
            <p>左側のナビゲーションから<br>ドメイン → カテゴリー → コード<br>の順に選択してください</p>
            <div class="welcome-stats">
                <div class="stat-item">
                    <span class="stat-label">総ドメイン数</span>
                    <span class="stat-value" id="total-domains">${Object.keys(structuredData).length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">総カテゴリー数</span>
                    <span class="stat-value" id="total-categories">${getTotalCategories()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">総コード数</span>
                    <span class="stat-value" id="total-codes">${icfData.length}</span>
                </div>
            </div>
        </div>
    `;
}

// === 統計情報更新 ===
function updateStats() {
    const totalDomains = Object.keys(structuredData).length;
    const totalCategories = getTotalCategories();
    const totalCodes = icfData.length;
    
    // 統計要素が存在する場合のみ更新
    const domainsEl = document.getElementById('total-domains');
    const categoriesEl = document.getElementById('total-categories');
    const codesEl = document.getElementById('total-codes');
    
    if (domainsEl) domainsEl.textContent = totalDomains;
    if (categoriesEl) categoriesEl.textContent = totalCategories;
    if (codesEl) codesEl.textContent = totalCodes;
}

// === 総カテゴリー数計算 ===
function getTotalCategories() {
    let total = 0;
    Object.keys(structuredData).forEach(domain => {
        total += Object.keys(structuredData[domain]).length;
    });
    return total;
}

// === エラー表示 ===
function showError(message) {
    const detailsContent = document.getElementById('details-content');
    detailsContent.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon" style="color: #f44336;">⚠️</div>
            <h3 style="color: #f44336;">エラー</h3>
            <p>${message}</p>
        </div>
    `;
}

// === デバッグ用関数 ===
function debugData() {
    console.log('ICF Data:', icfData);
    console.log('Structured Data:', structuredData);
    console.log('Current Selection:', currentSelection);
}