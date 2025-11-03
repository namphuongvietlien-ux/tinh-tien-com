// ==== THÔNG TIN TÀI KHOẢN NGÂN HÀNG ====
const BANK_BIN = '970407'; // Mã BIN của Techcombank
const ACCOUNT_NO = '19027952512028'; // Số tài khoản của bạn
const QR_TEMPLATE = 'print'; // Mẫu QR ('print' hoặc 'compact2')
const BASE_QR_URL = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NO}-${QR_TEMPLATE}.png`;


// ==== DỮ LIỆU ====
let allData = JSON.parse(localStorage.getItem('weeklyMealData')) || {};
let currentWeekId = ''; // ID của tuần hiện tại (ví dụ: "2025-11-03")
let viewingWeekId = ''; // ID của tuần đang xem (có thể là tuần cũ)

let people = [];
let meals = [];
let currentGrandTotal = 0; 

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

/**
 * Lấy chuỗi mã ngày cho nội dung CK (VD: "0311 09112025")
 * @param {string} weekId - ID của tuần (ngày T2, "YYYY-MM-DD")
 * @returns {string} - Chuỗi "DDMM DDMMYYYY"
 */
function getWeekDateCode(weekId) {
    const monday = new Date(weekId + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monDay = monday.getDate().toString().padStart(2, '0');
    const monMonth = (monday.getMonth() + 1).toString().padStart(2, '0');
    const monCode = `${monDay}${monMonth}`;

    const sunDay = sunday.getDate().toString().padStart(2, '0');
    const sunMonth = (sunday.getMonth() + 1).toString().padStart(2, '0');
    const sunYear = sunday.getFullYear();
    const sunCode = `${sunDay}${sunMonth}${sunYear}`;

    return `${monCode} ${sunCode}`;
}


// ==== HÀM CẬP NHẬT LOCAL STORAGE (CẬP NHẬT) ====
function saveData() {
    // THAY ĐỔI: Lưu vào tuần đang xem (viewingWeekId), không phải tuần hiện tại (currentWeekId)
    // Bỏ kiểm tra if (viewingWeekId !== currentWeekId)
    allData[viewingWeekId] = { people, meals };
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

    document.getElementById('qrPaymentImage').src = BASE_QR_URL;

    // THAY ĐỔI: Gỡ bỏ giới hạn. Luôn hiển thị các form nhập liệu
    document.getElementById("addPersonCard").classList.remove('hidden');
    document.getElementById("addMealCard").classList.remove('hidden');
    
    // THAY ĐỔI: Cập nhật lại nút xóa và thông báo
    const btn = document.getElementById("manageDataBtn");
    const notice = document.getElementById("weekNotice");

    btn.textContent = "🗑️ Xóa dữ liệu tuần này";
    // Đổi hàm: clearCurrentWeekData/deleteOldWeekData -> clearSelectedWeekData
    btn.onclick = clearSelectedWeekData; 
    
    notice.textContent = `Bạn đang xem tuần: ${getWeekRangeString(weekId)}`;
    // Vẫn tô màu xanh lá nếu là tuần hiện tại, màu xanh dương nếu là tuần cũ
    notice.style.color = (weekId === currentWeekId) ? "green" : "blue";
}

// (XÓA BỎ) Hàm toggleInputForms(isCurrent) đã bị gỡ bỏ vì không cần nữa


// ==== THÊM NGƯỜI (CẬP NHẬT) ====
function addPerson() {
    // THAY ĐỔI: Gỡ bỏ kiểm tra if (viewingWeekId !== currentWeekId)
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
    saveData(); // Sẽ lưu vào tuần đang chọn (viewingWeekId)
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

// ==== THÊM MÓN ĂN (CẬP NHẬT) ====
function addFood() {
    // THAY ĐỔI: Gỡ bỏ kiểm tra if (viewingWeekId !== currentWeekId)
    const day = document.getElementById("daySelect").value;
    const person = document.getElementById("personSelect").value;
    const food = document.getElementById("foodItem").value.trim();
    const price = parseFloat(document.getElementById("foodPrice").value);

    if (!person || !food || isNaN(price) || price <= 0) {
        alert("Vui lòng nhập đầy đủ và chính xác thông tin món ăn.");
        return;
    }
    meals.push({ id: Date.now(), day, person, food, price });
    saveData(); // Sẽ lưu vào tuần đang chọn (viewingWeekId)
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
            
            // THAY ĐỔI: Gỡ bỏ kiểm tra if (viewingWeekId === currentWeekId)
            // Luôn hiển thị nút "Xóa ngày"
            const deleteDayBtn = document.createElement("button");
            deleteDayBtn.textContent = "Xóa ngày";
            deleteDayBtn.classList.add("delete-day-btn");
            deleteDayBtn.onclick = () => deleteDay(day);
            titleContainer.appendChild(deleteDayBtn);
            
            section.appendChild(titleContainer);
            const ul = document.createElement("ul");
            grouped[day].forEach(item => {
                const li = document.createElement("li");
                const text = document.createElement("span");
                text.textContent = `${item.person} ăn ${item.food} - ${item.price.toLocaleString()} VNĐ `;
                li.appendChild(text);
                
                // THAY ĐỔI: Gỡ bỏ kiểm tra if (viewingWeekId === currentWeekId)
                // Luôn hiển thị nút "x" (xóa món)
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

// ==== HÀM XÓA (CẬP NHẬT) ====
function deleteMealItem(mealId) {
    // THAY ĐỔI: Gỡ bỏ kiểm tra if (viewingWeekId !== currentWeekId)
    if (confirm("Bạn có chắc muốn xóa món ăn này?")) {
        meals = meals.filter(item => item.id !== mealId);
        saveData();
        updateDailyExpenses();
        updateSummary();
    }
}

function deleteDay(dayName) {
    // THAY ĐỔI: Gỡ bỏ kiểm tra if (viewingWeekId !== currentWeekId)
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

    currentGrandTotal = grandTotal; 
    document.getElementById("grandTotal").textContent = `Tổng chi phí cả tuần: ${grandTotal.toLocaleString()} VNĐ`;
}

// ==== CÁC HÀM XỬ LÝ QR ====
function generateTotalWeekQR() {
    document.querySelectorAll('.person-qr-check').forEach(cb => cb.checked = false);
    const dateCode = getWeekDateCode(viewingWeekId); 
    const message = encodeURIComponent(`Tong com tu ${dateCode}`);
    const qrUrl = `${BASE_QR_URL}?amount=${currentGrandTotal}&addInfo=${message}`;
    document.getElementById('qrPaymentImage').src = qrUrl;
}

function handlePersonQRCheck(checkbox) {
    const qrImage = document.getElementById('qrPaymentImage');
    if (!checkbox.checked) {
        qrImage.src = BASE_QR_URL;
        return;
    }
    document.querySelectorAll('.person-qr-check').forEach(cb => {
        if (cb !== checkbox) {
            cb.checked = false;
        }
    });

    const name = checkbox.dataset.name;
    const amount = checkbox.dataset.amount;
    const dateCode = getWeekDateCode(viewingWeekId); 
    const message = encodeURIComponent(`${name} tu ${dateCode}`);
    const qrUrl = `${BASE_QR_URL}?amount=${amount}&addInfo=${message}`;
    qrImage.src = qrUrl;
}


// ==== XÓA DỮ LIỆU (CẬP NHẬT) ====

// Đổi tên hàm thành 'clearSelectedWeekData'
function clearSelectedWeekData() {
    const weekName = getWeekRangeString(viewingWeekId);
    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu (người và món) của tuần ${weekName}?`)) {
        people = [];
        meals = [];
        saveData(); // Lưu lại mảng rỗng cho tuần đang xem
        loadWeekData(viewingWeekId); // Tải lại UI
    }
}

// Gộp hàm deleteOldWeekData vào hàm trên (đơn giản hóa)
// Giờ đây nút "Xóa" chỉ xóa nội dung tuần, không xóa tuần khỏi danh sách.


// ==== KHỞI ĐỘNG TRANG ====
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
    loadWeekData(currentWeekId); 

    document.getElementById('qrPaymentImage').src = BASE_QR_URL;
}

window.onload = init;
