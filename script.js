// ==== THÔNG TIN TÀI KHOẢN NGÂN HÀNG (MỚI) ====
// Lấy từ mã QR bạn cung cấp: Techcombank, 19027952512028
const BANK_BIN = '970407'; // Mã BIN của Techcombank
const ACCOUNT_NO = '19027952512028'; // Số tài khoản của bạn
const QR_TEMPLATE = 'print'; // Mẫu QR ('print' hoặc 'compact2')

// URL cơ bản của VietQR API
const BASE_QR_URL = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NO}-${QR_TEMPLATE}.png`;


// ==== DỮ LIỆU ====
let allData = JSON.parse(localStorage.getItem('weeklyMealData')) || {};
let currentWeekId = ''; 
let viewingWeekId = ''; 

let people = [];
let meals = [];
let currentGrandTotal = 0; // (MỚI) Biến lưu tổng tiền của tuần đang xem

// ==== HÀM LẤY ID TUẦN ====
function getWeekId(date) {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); 
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));

    const y = monday.getFullYear();
    const m = (monday.getMonth() + 1).toString().padStart(2, '0');
    const da = monday.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${da}`;
}

// ==== HÀM LẤY DẢI NGÀY ====
function getWeekRangeString(weekId) {
    const monday = new Date(weekId + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); 

    const monDay = monday.getDate().toString().padStart(2, '0');
    const monMonth = (monday.getMonth() + 1).toString().padStart(2, '0');
    const sunDay = sunday.getDate().toString().padStart(2, '0');
    const sunMonth = (sunday.getMonth() + 1).toString().padStart(2, '0');
    const sunYear = sunday.getFullYear();
    return `${monDay}/${monMonth} - ${sunDay}/${sunMonth}/${sunYear}`;
}


// ==== HÀM CẬP NHẬT LOCAL STORAGE ====
function saveData() {
    if (viewingWeekId !== currentWeekId) return;
    allData[currentWeekId] = { people, meals };
    localStorage.setItem('weeklyMealData', JSON.stringify(allData));
}

// ==== BỘ CHỌN TUẦN ====
function populateWeekPicker() {
    const weekPicker = document.getElementById("weekPicker");
    weekPicker.innerHTML = '';
    const sortedWeeks = Object.keys(allData).sort().reverse();

    sortedWeeks.forEach(weekId => {
        const option = document.createElement("option");
        option.value = weekId;
        option.textContent = getWeekRangeString(weekId);
        weekPicker.appendChild(option);
    });
    weekPicker.value = viewingWeekId;
}


function handleWeekChange() {
    const newWeekId = document.getElementById("weekPicker").value;
    loadWeekData(newWeekId);
}

// ==== TẢI DỮ LIỆU TUẦN (CẬP NHẬT) ====
function loadWeekData(weekId) {
    viewingWeekId = weekId;
    const weekData = allData[weekId] || { people: [], meals: [] };

    people = weekData.people;
    meals = weekData.meals;

    updatePeopleList();
    updatePersonSelect();
    updateDailyExpenses();
    updateSummary(); 

    // (MỚI) Reset mã QR về mặc định khi đổi tuần
    document.getElementById('qrPaymentImage').src = BASE_QR_URL;

    const isCurrent = (weekId === currentWeekId);
    toggleInputForms(isCurrent);

    const btn = document.getElementById("manageDataBtn");
    const notice = document.getElementById("weekNotice");

    if (isCurrent) {
        btn.textContent = "🗑️ Xóa dữ liệu tuần này";
        btn.onclick = clearCurrentWeekData;
        notice.textContent = "Bạn đang xem tuần hiện tại (Có thể sửa).";
        notice.style.color = "green";
    } else {
        btn.textContent = "🗑️ Xóa dữ liệu tuần cũ này";
        btn.onclick = deleteOldWeekData;
        notice.textContent = "Bạn đang xem tuần cũ (Chế độ chỉ xem).";
        notice.style.color = "red";
    }
}

function toggleInputForms(isCurrent) {
    const addPersonCard = document.getElementById("addPersonCard");
    const addMealCard = document.getElementById("addMealCard");
    
    if (isCurrent) {
        addPersonCard.classList.remove('hidden');
        addMealCard.classList.remove('hidden');
    } else {
        addPersonCard.classList.add('hidden');
        addMealCard.classList.add('hidden');
    }
}


// ==== THÊM NGƯỜI ====
function addPerson() {
    if (viewingWeekId !== currentWeekId) {
        alert("Chỉ có thể thêm người vào tuần hiện tại!");
        return;
    }
    const nameInput = document.getElementById("personName");
    const name = nameInput.value.trim();
    if (!name) {
        alert("Vui lòng nhập tên.");
        return;
    }
    if (people.includes(name)) {
        alert("Người này đã tồn tại trong tuần này.");
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

// ==== HÀM HỖ TRỢ GIÁ ====
function setPrice(price) {
    document.getElementById("foodPrice").value = price;
}

// ==== THÊM MÓN ĂN ====
function addFood() {
    if (viewingWeekId !== currentWeekId) {
        alert("Chỉ có thể thêm món vào tuần hiện tại!");
        return;
    }
    const day = document.getElementById("daySelect").value;
    const person = document.getElementById("personSelect").value;
    const food = document.getElementById("foodItem").value.trim();
    const price = parseFloat(document.getElementById("foodPrice").value);

    if (!person || !food || isNaN(price) || price <= 0) {
        alert("Vui lòng nhập đầy đủ và chính xác thông tin món ăn.");
        return;
    }
    meals.push({ id: Date.now(), day, person, food, price });
    saveData();
    clearFoodInputs();
    updateDailyExpenses();
    updateSummary();
}

function clearFoodInputs() {
    document.getElementById("foodItem").value = '';
    document.getElementById("foodPrice").value = '';
}

// ==== HIỂN THỊ CHI TIÊU THEO NGÀY ====
function updateDailyExpenses() {
    const container = document.getElementById("daily-expenses");
    container.innerHTML = '';
    const grouped = {};
    meals.forEach(item => {
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
            titleContainer.appendChild(title);
            if (viewingWeekId === currentWeekId) {
                const deleteDayBtn = document.createElement("button");
                deleteDayBtn.textContent = "Xóa ngày";
                deleteDayBtn.classList.add("delete-day-btn");
                deleteDayBtn.onclick = () => deleteDay(day);
                titleContainer.appendChild(deleteDayBtn);
            }
            section.appendChild(titleContainer);
            const ul = document.createElement("ul");
            grouped[day].forEach(item => {
                const li = document.createElement("li");
                const text = document.createElement("span");
                text.textContent = `${item.person} ăn ${item.food} - ${item.price.toLocaleString()} VNĐ `;
                li.appendChild(text);
                if (viewingWeekId === currentWeekId) {
                    const deleteItemBtn = document.createElement("button");
                    deleteItemBtn.textContent = "x";
                    deleteItemBtn.classList.add("delete-item-btn");
                    deleteItemBtn.onclick = () => deleteMealItem(item.id);
                    li.appendChild(deleteItemBtn);
                }
                ul.appendChild(li);
            });
            section.appendChild(ul);
            container.appendChild(section);
        }
    });
}

// ==== HÀM XÓA ====
function deleteMealItem(mealId) {
    if (viewingWeekId !== currentWeekId) return; 
    if (confirm("Bạn có chắc muốn xóa món ăn này?")) {
        meals = meals.filter(item => item.id !== mealId);
        saveData();
        updateDailyExpenses();
        updateSummary();
    }
}

function deleteDay(dayName) {
    if (viewingWeekId !== currentWeekId) return; 
    if (confirm(`Bạn có chắc muốn xóa toàn bộ dữ liệu của ${dayName}?`)) {
        meals = meals.filter(item => item.day !== dayName);
        saveData();
        updateDailyExpenses();
        updateSummary();
    }
}

// ==== TỔNG KẾT (CẬP NHẬT) ====
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

        // (MỚI) Thêm checkbox vào hàng
        row.innerHTML = `
            <td>
                <input 
                    type="checkbox" 
                    class="person-qr-check" 
                    data-name="${person}" 
                    data-amount="${total}" 
                    onchange="handlePersonQRCheck(this)">
            </td>
            <td>${person}</td>
            <td>${count}</td>
            <td>${total.toLocaleString()} VNĐ</td>
        `;
        tbody.appendChild(row);
    });

    currentGrandTotal = grandTotal; // (MỚI) Lưu tổng tiền vào biến toàn cục
    document.getElementById("grandTotal").textContent = `Tổng chi phí cả tuần: ${grandTotal.toLocaleString()} VNĐ`;
}

// ==== CÁC HÀM XỬ LÝ QR (MỚI) ====

/**
 * Tạo mã QR cho TỔNG TIỀN của tuần
 */
function generateTotalWeekQR() {
    // Bỏ check tất cả các checkbox
    document.querySelectorAll('.person-qr-check').forEach(cb => cb.checked = false);

    const weekStr = getWeekRangeString(viewingWeekId);
    // encodeURIComponent để mã hóa dấu cách, dấu / thành %20, %2F
    const message = encodeURIComponent(` tu ${weekStr}`);
    
    const qrUrl = `${BASE_QR_URL}?amount=${currentGrandTotal}&addInfo=${message}`;
    document.getElementById('qrPaymentImage').src = qrUrl;
}

/**
 * Xử lý khi tick vào checkbox của một người
 * @param {HTMLInputElement} checkbox - Hộp checkbox được tick
 */
function handlePersonQRCheck(checkbox) {
    const qrImage = document.getElementById('qrPaymentImage');

    // Nếu bỏ tick, reset về QR mặc định
    if (!checkbox.checked) {
        qrImage.src = BASE_QR_URL;
        return;
    }

    // Nếu tick, bỏ tick tất cả những người khác (chỉ cho chọn 1)
    document.querySelectorAll('.person-qr-check').forEach(cb => {
        if (cb !== checkbox) {
            cb.checked = false;
        }
    });

    // Lấy dữ liệu từ data attributes
    const name = checkbox.dataset.name;
    const amount = checkbox.dataset.amount;
    const weekStr = getWeekRangeString(viewingWeekId);
    
    const message = encodeURIComponent(`${name} tu ${weekStr}`);
    const qrUrl = `${BASE_QR_URL}?amount=${amount}&addInfo=${message}`;
    
    qrImage.src = qrUrl;
}


// ==== XÓA DỮ LIỆU ====
function clearCurrentWeekData() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của TUẦN NÀY?")) {
        people = [];
        meals = [];
        saveData(); 
        loadWeekData(currentWeekId); 
    }
}

function deleteOldWeekData() {
    if (confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN dữ liệu của tuần ${getWeekRangeString(viewingWeekId)}?`)) {
        delete allData[viewingWeekId]; 
        localStorage.setItem('weeklyMealData', JSON.stringify(allData)); 
        init();
    }
}

// ==== KHỞI ĐỘNG TRANG (CẬP NHẬT) ====
function init() {
    currentWeekId = getWeekId(new Date());
    viewingWeekId = currentWeekId; 

    if (!allData[currentWeekId]) {
        const sortedWeeks = Object.keys(allData).sort().reverse();
        let lastWeekPeople = [];
        if (sortedWeeks.length > 0) {
            lastWeekPeople = allData[sortedWeeks[0]].people || [];
        }
        allData[currentWeekId] = { people: lastWeekPeople, meals: [] };
    }

    populateWeekPicker();
    loadWeekData(currentWeekId); // Tải dữ liệu tuần hiện tại

    // (MỚI) Đặt mã QR mặc định khi tải trang
    document.getElementById('qrPaymentImage').src = BASE_QR_URL;
}

window.onload = init;



