// ==== DỮ LIỆU ====
let people = JSON.parse(localStorage.getItem('people')) || [];
// Cấu trúc meals mới: { "2024-45": [ {món ăn...} ], "2024-46": [ ... ] }
let allMeals = JSON.parse(localStorage.getItem('allMeals')) || {};
let currentWeekId = getWeekId(new Date()); // Biến để theo dõi tuần đang xem

// ==== HÀM QUẢN LÝ TUẦN (MỚI) ====

/**
 * Lấy định danh của tuần từ một ngày. Ví dụ: "2024-45"
 * @param {Date} date - Ngày cần kiểm tra
 * @returns {string} Định danh của tuần
 */
function getWeekId(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Đặt ngày về thứ Năm của tuần đó để đảm bảo tính đúng theo chuẩn ISO 8601
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Ngày đầu tiên của năm
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Tính số tuần
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}


/**
 * Hiển thị thông tin tuần hiện tại và cập nhật dữ liệu
 */
function renderCurrentWeek() {
    const [year, week] = currentWeekId.split('-W');
    document.getElementById('currentWeekDisplay').textContent = `Tuần ${week}, ${year}`;
    updateDailyExpenses();
    updateSummary();
}

/**
 * Chuyển tới tuần trước hoặc tuần sau
 * @param {number} offset - -1 để lùi, 1 để tiến
 */
function changeWeek(offset) {
    const [year, week] = currentWeekId.split('-W').map(Number);
    // Tính toán ngày hiện tại dựa trên năm và tuần
    const currentDay = new Date(year, 0, 1 + (week - 1) * 7); 
    // Thay đổi ngày bằng cách cộng/trừ 7 ngày
    currentDay.setDate(currentDay.getDate() + offset * 7);
    currentWeekId = getWeekId(currentDay);
    renderCurrentWeek();
}


// ==== HÀM CẬP NHẬT LOCAL STORAGE ====
function saveData() {
    localStorage.setItem('people', JSON.stringify(people));
    localStorage.setItem('allMeals', JSON.stringify(allMeals));
}

// ==== THÊM NGƯỜI (Không đổi) ====
function addPerson() {
    const nameInput = document.getElementById("personName");
    const name = nameInput.value.trim();
    if (!name) { alert("Vui lòng nhập tên."); return; }
    if (people.includes(name)) { alert("Người này đã tồn tại."); return; }
    people.push(name);
    saveData();
    nameInput.value = '';
    updatePeopleList();
    updatePersonSelect();
    updateSummary();
}

// ==== CẬP NHẬT DANH SÁCH NGƯỜI (Không đổi) ====
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

// ==== HÀM HỖ TRỢ GIÁ (Không đổi) ====
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

    // Nếu tuần này chưa có dữ liệu, tạo một mảng rỗng
    if (!allMeals[currentWeekId]) {
        allMeals[currentWeekId] = [];
    }

    allMeals[currentWeekId].push({ id: Date.now(), day, person, food, price });
    saveData();
    clearFoodInputs();
    updateDailyExpenses();
    updateSummary();
}

function clearFoodInputs() {
    document.getElementById("foodItem").value = '';
    document.getElementById("foodPrice").value = '';
}

// ==== HIỂN THỊ CHI TIÊU THEO NGÀY (CẬP NHẬT) ====
function updateDailyExpenses() {
    const container = document.getElementById("daily-expenses");
    container.innerHTML = '';
    
    // Lấy dữ liệu của tuần đang xem
    const mealsThisWeek = allMeals[currentWeekId] || [];
    if (mealsThisWeek.length === 0) return; // Nếu tuần này không có dữ liệu thì không hiển thị gì

    const grouped = {};
    mealsThisWeek.forEach(item => {
        if (!grouped[item.day]) grouped[item.day] = [];
        grouped[item.day].push(item);
    });

    const dayOrder = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    dayOrder.forEach(day => {
        if (grouped[day]) {
            const section = document.createElement("div");
            section.classList.add("day-section");

            const titleContainer = document.createElement("div");
            titleContainer.classList.add("day-title-container");
            const title = document.createElement("h3");
            title.textContent = `📅 ${day}`;
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
                const deleteItemBtn = document.createElement("button");
                deleteItemBtn.textContent = "x";
                deleteItemBtn.classList.add("delete-item-btn");
                deleteItemBtn.onclick = () => deleteMealItem(item.id);
                li.appendChild(text);
                li.appendChild(deleteItemBtn);
                ul.appendChild(li);
            });
            section.appendChild(ul);
            container.appendChild(section);
        }
    });
}

// ==== HÀM XÓA (CẬP NHẬT) ====
function deleteMealItem(mealId) {
    if (confirm("Bạn có chắc muốn xóa món ăn này?")) {
        // Lọc ra món ăn cần xóa trong tuần hiện tại
        allMeals[currentWeekId] = allMeals[currentWeekId].filter(item => item.id !== mealId);
        saveData();
        renderCurrentWeek();
    }
}

function deleteDay(dayName) {
    if (confirm(`Bạn có chắc muốn xóa toàn bộ dữ liệu của ${dayName} trong tuần này?`)) {
        // Lọc ra các món không thuộc ngày cần xóa trong tuần hiện tại
        allMeals[currentWeekId] = allMeals[currentWeekId].filter(item => item.day !== dayName);
        saveData();
        renderCurrentWeek();
    }
}

// ==== TỔNG KẾT (CẬP NHẬT) ====
function updateSummary() {
    const tbody = document.querySelector("#summaryTable tbody");
    tbody.innerHTML = '';

    // Lấy dữ liệu của tuần đang xem
    const mealsThisWeek = allMeals[currentWeekId] || [];
    const summary = {};

    mealsThisWeek.forEach(item => {
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
        row.innerHTML = `<td>${person}</td><td>${count}</td><td>${total.toLocaleString()} VNĐ</td>`;
        tbody.appendChild(row);
    });
    document.getElementById("grandTotal").textContent = `Tổng chi phí cả tuần: ${grandTotal.toLocaleString()} VNĐ`;
}

// ==== XÓA TOÀN BỘ DỮ LIỆU (KHÔNG ĐỔI) ====
function clearAllData() {
    if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ DỮ LIỆU CỦA TẤT CẢ CÁC TUẦN?")) {
        people = [];
        allMeals = {};
        saveData();
        updatePeopleList();
        updatePersonSelect();
        renderCurrentWeek();
    }
}

// ==== KHỞI ĐỘNG TRANG (CẬP NHẬT) ====
window.onload = () => {
    updatePeopleList();
    updatePersonSelect();
    // Hiển thị tuần hiện tại khi tải trang
    renderCurrentWeek();
};
