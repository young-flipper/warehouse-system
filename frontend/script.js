const API_BASE_URL = 'http://localhost:3000/api/products';

// Глобальные переменные состояния
let currentPage = 1;
const itemsPerPage = 10;
let currentFilters = {};
let totalPages = 1;

// Справочники
let currentReferenceTab = 'manufacturers';

// DOM элементы
const productsTable = document.getElementById('productsTable');
const productsTableBody = document.getElementById('productsTableBody');
const loadingMessage = document.getElementById('loadingMessage');
const paginationControls = document.getElementById('paginationControls');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadFilters();
    loadProducts();
    setupEventListeners();
});

// Загрузка данных для фильтров (производители и типы)
async function loadFilters() {
    try {
        console.log('🔹 Загрузка фильтров...');

        const [manufacturersRes, typesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/filters/manufacturers`),
            fetch(`${API_BASE_URL}/filters/types`)
        ]);

        console.log('🔹 Ответ manufacturers:', manufacturersRes.status);
        console.log('🔹 Ответ types:', typesRes.status);

        if (!manufacturersRes.ok) throw new Error('Ошибка загрузки производителей');
        if (!typesRes.ok) throw new Error('Ошибка загрузки типов товаров');

        const manufacturers = await manufacturersRes.json();
        const types = await typesRes.json();

        console.log('🔹 Производители:', manufacturers);
        console.log('🔹 Типы товаров:', types);

        const manufacturerSelect = document.getElementById('manufacturerFilter');
        const typeSelect = document.getElementById('typeFilter');
        const productManufacturerSelect = document.getElementById('productManufacturer');
        const productTypeSelect = document.getElementById('productType');

        // Заполняем фильтры
        populateSelect(manufacturerSelect, manufacturers, 'name');
        populateSelect(typeSelect, types, 'name');

        // Заполняем селекты в форме
        populateSelect(productManufacturerSelect, manufacturers, 'name', 'id');
        populateSelect(productTypeSelect, types, 'name', 'id');

        console.log('✅ Фильтры загружены успешно');
    } catch (error) {
        console.error('❌ Error loading filters:', error);
        alert('Ошибка при загрузке фильтров: ' + error.message);
    }
}

function populateSelect(selectElement, data, textField, valueField = null) {
    // Очищаем все опции, кроме первой ("Все" или "Выберите...")
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }

    data.forEach(item => {
        const option = document.createElement('option');
        option.value = valueField ? item[valueField] : item[textField];
        option.textContent = item[textField];
        selectElement.appendChild(option);
    });
}

// Загрузка товаров с учетом фильтров и пагинации
async function loadProducts() {
    showLoading();

    try {
        const params = new URLSearchParams({
            page: currentPage - 1,
            size: itemsPerPage
        });

        Object.keys(currentFilters).forEach(key => {
            params.append(key, currentFilters[key]);
        });

        const response = await fetch(`${API_BASE_URL}?${params}`);

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const data = await response.json();

        // Получаем структурированный ответ
        const products = data.products || data;
        const totalElements = data.totalItems || data.totalElements || products.length;

        totalPages = data.totalPages || Math.ceil(totalElements / itemsPerPage);

        console.log('📊 Пагинация:', {
            currentPage,
            totalPages,
            totalElements,
            itemsOnPage: products.length
        });

        displayProducts(products);
        setupPagination();
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Ошибка: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displayProducts(products) {
    productsTableBody.innerHTML = '';

    if (!products || products.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Товары не найдены</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.manufacturer ? product.manufacturer.name : '—'}</td>
            <td>${product.type ? product.type.name : '—'}</td>
            <td>$${product.price ? parseFloat(product.price).toFixed(2) : '0.00'}</td>
            <td>${product.quantity || 0}</td>
            <td>
                <button class="btn btn-outline edit-btn" data-id="${product.id}">Редакт.</button>
                <button class="btn btn-danger delete-btn" data-id="${product.id}">Удалить</button>
            </td>
        `;
        productsTableBody.appendChild(row);
    });

    // Назначаем обработчики событий для кнопок
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
}

// Функция пагинации из вашего файла
function setupPagination(forcePage = null) {
    if (!paginationControls) return;

    paginationControls.innerHTML = '';

    if (totalPages === 0) {
        return;
    }

    function renderPage(page) {
        currentPage = page;
        loadProducts();
    }

    function createButton(label, page, isArrow = false) {
        const button = document.createElement("button");
        button.textContent = label;
        button.classList.add("pagination-btn");
        if (isArrow) button.classList.add("arrow-btn");
        button.addEventListener("click", () => {
            renderPage(page);
            updatePagination(page);
        });
        return button;
    }

    function updatePagination(currentPage) {
        paginationControls.innerHTML = '';

        if (totalPages > 1) {
            if (currentPage > 1) {
                paginationControls.appendChild(createButton("«", currentPage - 1, true));
            }
        }

        if (totalPages === 1) {
            const singleButton = createButton("1", 1);
            singleButton.classList.add("active");
            paginationControls.appendChild(singleButton);
        } else {
            const firstButton = createButton("1", 1);
            if (currentPage === 1) firstButton.classList.add("active");
            paginationControls.appendChild(firstButton);
        }

        if (totalPages > 1) {
            if (currentPage > 3) {
                const dots = document.createElement("span");
                dots.textContent = "...";
                dots.classList.add("dots");
                paginationControls.appendChild(dots);
            }

            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                const button = createButton(i, i);
                if (i === currentPage) button.classList.add("active");
                paginationControls.appendChild(button);
            }

            if (currentPage < totalPages - 2) {
                const dots = document.createElement("span");
                dots.textContent = "...";
                dots.classList.add("dots");
                paginationControls.appendChild(dots);
            }

            const lastButton = createButton(totalPages, totalPages);
            if (currentPage === totalPages) lastButton.classList.add("active");
            paginationControls.appendChild(lastButton);

            if (currentPage < totalPages) {
                paginationControls.appendChild(createButton("»", currentPage + 1, true));
            }
        }
    }

    const targetPage = forcePage !== null
        ? Math.min(forcePage, totalPages)
        : Math.min(currentPage, totalPages);

    updatePagination(targetPage);
}

function showLoading() {
    loadingMessage.style.display = 'block';
    productsTable.style.display = 'none';
}

function hideLoading() {
    loadingMessage.style.display = 'none';
    productsTable.style.display = 'table';
}

// Настройка всех обработчиков событий
function setupEventListeners() {
    // Кнопка добавления товара
    document.getElementById('addProductBtn').addEventListener('click', () => openModal());

    // Кнопки фильтров
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    // Модальное окно
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    // Форма товара
    productForm.addEventListener('submit', handleFormSubmit);

    // Справочники
    document.getElementById('manageReferencesBtn').addEventListener('click', openReferencesModal);
    document.getElementById('closeReferences').addEventListener('click', closeReferencesModal);

    // Вкладки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Добавление производителя
    document.getElementById('addManufacturerBtn').addEventListener('click', addManufacturer);

    // Добавление типа товара
    document.getElementById('addTypeBtn').addEventListener('click', addType);

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (event) => {
        if (event.target === productModal) {
            closeModal();
        }
    });
}

// Работа с фильтрами
function applyFilters() {
    currentFilters = {};
    currentPage = 1;

    const manufacturer = document.getElementById('manufacturerFilter').value;
    const type = document.getElementById('typeFilter').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;

    // Добавляем фильтры только если они не пустые
    if (manufacturer) currentFilters.manufacturer = manufacturer;
    if (type) currentFilters.type = type;
    if (minPrice) currentFilters.minPrice = parseFloat(minPrice);
    if (maxPrice) currentFilters.maxPrice = parseFloat(maxPrice);

    console.log('🔹 Применяем фильтры:', currentFilters);
    loadProducts();
}

function resetFilters() {
    document.getElementById('manufacturerFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';

    currentFilters = {};
    currentPage = 1;
    loadProducts();
}

// Работа с модальным окном
function openModal(product = null) {
    resetForm();

    if (product) {
        modalTitle.textContent = 'Редактировать товар';

        // Заполняем форму
        document.getElementById('productId').value = product.id || '';
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDescription').value = product.description || '';

        document.getElementById('productManufacturer').value = product.manufacturer_id || '';
        document.getElementById('productType').value = product.type_id || '';

        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productQuantity').value = product.quantity || '';
    } else {
        modalTitle.textContent = 'Добавить товар';
    }

    productModal.style.display = 'flex';
}

function closeModal() {
    productModal.style.display = 'none';
    resetForm();
}

function resetForm() {
    productForm.reset();
    clearErrors();
    document.getElementById('productId').value = '';
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

// Валидация формы
function validateForm(formData) {
    let isValid = true;
    clearErrors();

    console.log('🔹 Проверка валидации...');

    // БЕЗОПАСНОЕ получение значений с проверкой на null
    const name = formData.get('name');
    const manufacturer_id = formData.get('manufacturer_id');
    const type_id = formData.get('type_id');
    const price = formData.get('price');
    const quantity = formData.get('quantity');

    console.log('🔹 Поля:', { name, manufacturer_id, type_id, price, quantity });

    // Проверка наименования (безопасно обрабатываем null)
    if (!name || !name.toString().trim()) {
        console.log('❌ Ошибка: пустое наименование');
        document.getElementById('nameError').textContent = 'Наименование обязательно';
        isValid = false;
    }

    // Проверка производителя
    if (!manufacturer_id) {
        console.log('❌ Ошибка: не выбран производитель');
        document.getElementById('manufacturerError').textContent = 'Производитель обязателен';
        isValid = false;
    }

    // Проверка типа товара
    if (!type_id) {
        console.log('❌ Ошибка: не выбран тип товара');
        document.getElementById('typeError').textContent = 'Тип товара обязателен';
        isValid = false;
    }

    // Безопасная проверка цены
    const priceStr = price ? price.toString().replace(',', '.') : '';
    const priceNum = parseFloat(priceStr);
    if (!priceStr || isNaN(priceNum) || priceNum < 0) {
        console.log('❌ Ошибка: неверная цена');
        document.getElementById('priceError').textContent = 'Цена должна быть положительным числом';
        isValid = false;
    }

    // Безопасная проверка количества
    const quantityNum = parseInt(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum < 0) {
        console.log('❌ Ошибка: неверное количество');
        document.getElementById('quantityError').textContent = 'Количество должно быть неотрицательным числом';
        isValid = false;
    }

    console.log(`🔹 Валидация: ${isValid ? 'ПРОЙДЕНА' : 'НЕ ПРОЙДЕНА'}`);
    return isValid;
}

// Обработка отправки формы
async function handleFormSubmit(event) {
    event.preventDefault();
    console.log('🔹 Форма отправляется...');

    const formData = new FormData(productForm);
    const productData = {
        name: formData.get('name') ? formData.get('name').toString().trim() : '',
        description: formData.get('description') ? formData.get('description').toString() : '',
        manufacturer: { id: parseInt(formData.get('manufacturer_id')) },
        type: { id: parseInt(formData.get('type_id')) },
        price: formData.get('price') ? parseFloat(formData.get('price').toString().replace(',', '.')) : 0,
        quantity: formData.get('quantity') ? parseInt(formData.get('quantity')) : 0
    };

    console.log('🔹 Данные формы:', productData);

    if (!validateForm(formData)) {
        console.log('❌ Валидация не пройдена');
        return;
    }

    try {
        const productId = document.getElementById('productId').value;
        let response;
        const url = productId ? `${API_BASE_URL}/${productId}` : `${API_BASE_URL}`;
        const method = productId ? 'PUT' : 'POST';

        console.log(`🔹 Отправка ${method} запроса на: ${url}`);

        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        console.log('🔹 Ответ сервера:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Успех:', result);
            closeModal();
            loadProducts();
            alert(productId ? 'Товар обновлен успешно!' : 'Товар добавлен успешно!');
        } else {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера:', errorText);
            alert(`Ошибка: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Ошибка сети:', error);
        alert('Ошибка при сохранении товара: ' + error.message);
    }
}

// Редактирование товара
async function editProduct(id) {
    try {
        console.log('🔹 Загрузка товара для редактирования, ID:', id);

        // Используем endpoint /dto/{id}
        const response = await fetch(`${API_BASE_URL}/dto/${id}`);

        if (response.ok) {
            const product = await response.json();
            console.log('🔹 Товар (DTO) получен:', product);

            openModal(product);
        } else {
            alert('Ошибка загрузки товара');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Удаление товара
async function deleteProduct(id) {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
        return;
    }

    try {
        console.log('🔹 Удаление товара, ID:', id);

        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });

        console.log('🔹 Ответ сервера при удалении:', response.status, response.statusText);

        if (response.ok) {
            loadProducts(); // Перезагружаем таблицу
            alert('Товар удален успешно!');
        } else {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера при удалении:', errorText);
            alert(`Ошибка при удалении товара: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        alert('Ошибка при удалении товара: ' + error.message);
    }
}

function openReferencesModal() {
    document.getElementById('referencesModal').style.display = 'flex';
    switchTab('manufacturers');
    loadManufacturers();
    loadTypes();
}

function closeReferencesModal() {
    document.getElementById('referencesModal').style.display = 'none';
}

function switchTab(tabName) {
    currentReferenceTab = tabName;

    // Обновляем активные кнопки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Показываем активную вкладку
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    document.getElementById(tabName + 'Tab').style.display = 'block';
}

// Загрузка производителей
async function loadManufacturers() {
    try {
        const response = await fetch(`${API_BASE_URL}/filters/manufacturers`);
        const manufacturers = await response.json();

        const tbody = document.getElementById('manufacturersTableBody');
        tbody.innerHTML = '';

        manufacturers.forEach(manufacturer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${manufacturer.id}</td>
                <td>${manufacturer.name}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteManufacturer(${manufacturer.id})">
                        Удалить
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки производителей:', error);
    }
}

// Загрузка типов товаров
async function loadTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}/filters/types`);
        const types = await response.json();

        const tbody = document.getElementById('typesTableBody');
        tbody.innerHTML = '';

        types.forEach(type => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${type.id}</td>
                <td>${type.name}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteType(${type.id})">
                        Удалить
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки типов:', error);
    }
}

// Добавление производителя
async function addManufacturer() {
    const nameInput = document.getElementById('newManufacturerName');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Введите название производителя');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/manufacturers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });

        if (response.ok) {
            nameInput.value = '';
            await loadManufacturers();  // Обновить таблицу
            await loadFilters();        // Обновить выпадающие списки
            alert('Производитель добавлен!');
        } else {
            alert('Ошибка при добавлении производителя');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Добавление типа товара
async function addType() {
    const nameInput = document.getElementById('newTypeName');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Введите название типа товара');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });

        if (response.ok) {
            nameInput.value = '';
            await loadTypes();     // Обновить таблицу
            await loadFilters();   // Обновить выпадающие списки
            alert('Тип товара добавлен!');
        } else {
            alert('Ошибка при добавлении типа товара');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Удаление производителя
async function deleteManufacturer(id) {
    if (!confirm('Удалить этого производителя?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/manufacturers/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadManufacturers();  // Обновить таблицу
            await loadFilters();        // Обновить выпадающие списки
            alert('Производитель удален!');
        } else {
            alert('Ошибка при удалении производителя');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Удаление типа товара
async function deleteType(id) {
    if (!confirm('Удалить этот тип товара?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/types/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadTypes();     // Обновить таблицу
            await loadFilters();   // Обновить выпадающие списки
            alert('Тип товара удален!');
        } else {
            alert('Ошибка при удалении типа товара');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}
