// ==== DỮ LIỆU ====
let people = JSON.parse(localStorage.getItem('people')) || [];
let meals = JSON.parse(localStorage.getItem('meals')) || [];

// ==== HÀM CẬP NHẬT LOCAL STORAGE ====
function saveData() {
    localStorage.setItem('people', JSON.stringify(people));
    localStorage.setItem('meals', JSON.stringify(meals));
}

// ==== THÊM NGƯỜI ====
function addPerson() {
    const nameInput = document.getElementById("personName");
    const name = nameInput.value.trim();

    if (!name) {
        alert("Vui lòng nhập tên.");
        return;
    }

    if (people.includes(name)) {
        alert("Người này đã tồn tại.");
        return;
    }

    people.push(name);
    saveData();
    nameInput.value = '';
    updatePeopleList();
    updatePersonSelect();
    updateSummary();
}

// ==== CẬP NHẬT DANH SÁCH NGƯỜI ====
function updatePeopleList() {
    const ul = document.getElementById("peopleList");
    ul.innerHTML = '';
    people.forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
    });
}

function updatePersonSelect() {
    const select = document.getElementById("personSelect");
    select.innerHTML = '<option value="">-- Chọn người --</option>';
    people.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

// ==== HÀM HỖ TRỢ GIÁ (MỚI) ====
function setPrice(price) {
    document.getElementById("foodPrice").value = price;
}

// ==== THÊM MÓN ĂN (CẬP NHẬT) ====
function addFood() {
    const day = document.getElementById("daySelect").value;
    const person = document.getElementById("personSelect").value;
    const food = document.getElementById("foodItem").value.trim();
    const price = parseFloat(document.getElementById("foodPrice").value);

    if (!person || !food || isNaN(price) || price <= 0) {
        alert("Vui lòng nhập đầy đủ và chính xác thông tin món ăn.");
        return;
    }

    // Thêm id duy nhất để dễ dàng xóa
    meals.push({ id: Date.now(), day, person, food, price });
    saveData();
    clearFoodInputs();
    updateDailyExpenses();
    updateSummary();
}

function clearFoodInputs() {
    document.getElementById("foodItem").value = '';
    document.getElementById("foodPrice").value = '';
    // Tùy chọn: quay về chọn người đầu tiên
    // document.getElementById("personSelect").selectedIndex = 0; 
}

// ==== HIỂN THỊ CHI TIÊU THEO NGÀY (CẬP NHẬT) ====
function updateDailyExpenses() {
    const container = document.getElementById("daily-expenses");
    container.innerHTML = '';

    const grouped = {};

    meals.forEach(item => {
        if (!grouped[item.day]) {
            grouped[item.day] = [];
        }
        grouped[item.day].push(item);
    });

    // Sắp xếp các ngày theo thứ tự trong <select>
    const dayOrder = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

    dayOrder.forEach(day => {
        if (grouped[day]) {
            const section = document.createElement("div");
            section.classList.add("day-section");

            const titleContainer = document.createElement("div");
            titleContainer.classList.add("day-title-container");

            const title = document.createElement("h3");
            title.textContent = `📅 ${day}`;

            // Nút xóa ngày (MỚI)
            const deleteDayBtn = document.createElement("button");
            deleteDayBtn.textContent = "Xóa ngày";
            deleteDayBtn.classList.add("delete-day-btn");
            deleteDayBtn.onclick = () => deleteDay(day);

            titleContainer.appendChild(title);
            titleContainer.appendChild(deleteDayBtn);
            section.appendChild(titleContainer);

            const ul = document.createElement("ul");

            grouped[day].forEach(item => {
                const li = document.createElement("li");
                
                const text = document.createElement("span");
                text.textContent = `${item.person} ăn ${item.food} - ${item.price.toLocaleString()} VNĐ `;
                li.appendChild(text);

                // Nút xóa món (MỚI)
                const deleteItemBtn = document.createElement("button");
                deleteItemBtn.textContent = "x";
                deleteItemBtn.classList.add("delete-item-btn");
                deleteItemBtn.onclick = () => deleteMealItem(item.id);

                li.appendChild(deleteItemBtn);
                ul.appendChild(li);
            });

            section.appendChild(ul);
            container.appendChild(section);
        }
    });
}

// ==== HÀM XÓA MỚI ====

/**
 * Xóa một món ăn cụ thể bằng ID
 * @param {number} mealId - ID (timestamp) của món ăn
 */
function deleteMealItem(mealId) {
    if (confirm("Bạn có chắc muốn xóa món ăn này?")) {
        meals = meals.filter(item => item.id !== mealId);
        saveData();
        updateDailyExpenses();
        updateSummary();
    }
}

/**
 * Xóa tất cả các món ăn của một ngày
 * @param {string} dayName - Tên của ngày (ví dụ: "Thứ 2")
 */
function deleteDay(dayName) {
    if (confirm(`Bạn có chắc muốn xóa toàn bộ dữ liệu của ${dayName}?`)) {
        meals = meals.filter(item => item.day !== dayName);
        saveData();
        updateDailyExpenses();
        updateSummary();
    }
}


// ==== TỔNG KẾT ====
function updateSummary() {
    const tbody = document.querySelector("#summaryTable tbody");
    tbody.innerHTML = '';

    const summary = {};

    meals.forEach(item => {
        if (!summary[item.person]) {
            summary[item.person] = { count: 0, total: 0 };
        }
        summary[item.person].count += 1;
        summary[item.person].total += item.price;
    });

    let grandTotal = 0;

    people.forEach(person => {
        const row = document.createElement("tr");
        const count = summary[person]?.count || 0;
        const total = summary[person]?.total || 0;
        grandTotal += total;

        row.innerHTML = `
            <td>${person}</td>
            <td>${count}</td>
            <td>${total.toLocaleString()} VNĐ</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById("grandTotal").textContent = `Tổng chi phí cả tuần: ${grandTotal.toLocaleString()} VNĐ`;
}

// ==== XÓA TOÀN BỘ DỮ LIỆU ====
function clearAllData() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?")) {
        people = [];
        meals = [];
        saveData();
        updatePeopleList();
        updatePersonSelect();
        updateDailyExpenses();
        updateSummary();
    }
}

// ==== KHỞI ĐỘNG TRANG ====
window.onload = () => {
    updatePeopleList();
    updatePersonSelect();
    updateDailyExpenses();
    updateSummary();
};