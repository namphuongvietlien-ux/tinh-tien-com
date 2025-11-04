// ==== BƯỚC 1: NHỚ DÁN FIREBASE CONFIG CỦA BẠN VÀO ĐÂY ====
const firebaseConfig = {
    apiKey: "AIzaSy...", // DÁN KEY CỦA BẠN VÀO
    authDomain: "comtruathuymoc-01060520.firebaseapp.com",
    databaseURL: "https://comtruathuymoc-default-rtdb.firebaseio.com", // ĐÂY LÀ URL ĐÚNG
    projectId: "comtruathuymoc-01060520",
    storageBucket: "comtruathuymoc-01060520.appspot.com",
    messagingSenderId: "...", // DÁN CỦA BẠN VÀO
    appId: "..." // DÁN CỦA BẠN VÀO
};
// ======================================================

// Khởi chạy Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==== THÔNG TIN TÀI KHOẢN NGÂN HÀNG (CẬP NHẬT) ====
const BANK_BIN = '970407'; // Mã BIN của Techcombank
const QR_TEMPLATE = 'print';

// STK Cũ (Trần Thị Thảo Nguyên) - Dùng cho tick lẻ
const MAIN_ACCOUNT_NO = '19027952512028';
const MAIN_QR_URL = `https://img.vietqr.io/image/${BANK_BIN}-${MAIN_ACCOUNT_NO}-${QR_TEMPLATE}.png`;

// STK Mới (Nguyễn Thuỷ) - Dùng cho TỔNG TUẦN
const TOTAL_ACCOUNT_NO = '2939799993';
const TOTAL_QR_URL = `https://img.vietqr.io/image/${BANK_BIN}-${TOTAL_ACCOUNT_NO}-${QR_TEMPLATE}.png`;


// ==== DỮ LIỆU ====
let allData = {}; 
let currentWeekId = ''; 
let viewingWeekId = ''; 

let people = [];
let meals = [];
let currentGrandTotal = 0; 

let currentWeekListener = null; 
let currentWeekRef = null; 

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


// ==== HÀM CẬP NHẬT FIREBASE ====
function syncDataToFirebase() {
    const ref = database.ref(`weeks/${viewingWeekId}`);
    ref.set({
        people: people,
        meals: meals
    });
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

// ==== TẢI DỮ LIỆU TUẦN ====
function loadWeekData(weekId) {
    viewingWeekId = weekId;

    if (currentWeekListener && currentWeekRef) {
        currentWeekRef.off('value', currentWeekListener); 
    }

    currentWeekRef = database.ref(`weeks/${viewingWeekId}`); 
    currentWeekListener = currentWeekRef.on('value', (snapshot) => { 
        const weekData = snapshot.val() || { people: [], meals: [] };
        
        people = weekData.people || allData[viewingWeekId]?.people || [];
        meals = weekData.meals || allData[viewingWeekId]?.meals || [];

        updatePeopleList();
        updatePersonSelect();
        updateDailyExpenses();
        updateSummary();
        
        const notice = document.getElementById("weekNotice");
        notice.textContent = `Bạn đang xem tuần: ${getWeekRangeString(weekId)}`;
        notice.style.color = (weekId === currentWeekId) ? "green" : "blue";
    });

    // (CẬP NHẬT) Đặt QR mặc định là STK chính
    document.getElementById('qrPaymentImage').src = MAIN_QR_URL;
    document.getElementById("addPersonCard").classList.remove('hidden');
    document.getElementById("addMealCard").classList.remove('hidden');
    const btn = document.getElementById("manageDataBtn");
    btn.textContent = "🗑️ Xóa dữ liệu tuần này";
    btn.onclick = clearSelectedWeekData; 
    
    populateWeekPicker();
}


// ==== THÊM NGƯỜI ====
function addPerson() {
    const nameInput = document.getElementById("personName");
    const name = nameInput.value.trim();
    if (!name) { alert("Vui lòng nhập tên."); return; }
    if (people.includes(name)) { alert("Người này đã tồn tại trong tuần này."); return; }
    if (!people) people = []; // Khởi tạo nếu 'people' là null
    people.push(name);
    syncDataToFirebase(); 
    nameInput.value = '';
}

// ==== CẬP NHẬT DANH SÁCH NGƯỜI ====
function updatePeopleList() {
    const ul = document.getElementById("peopleList");
    ul.innerHTML = '';
    (people || []).forEach(name => { 
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
    });
}

function updatePersonSelect() {
    const select = document.getElementById("personSelect");
    select.innerHTML = '<option value="">-- Chọn người --</option>';
    (people || []).forEach(name => { 
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
    const day = document.getElementById("daySelect").value;
    const person = document.getElementById("personSelect").value;
    const food = document.getElementById("foodItem").value.trim();
    const price = parseFloat(document.getElementById("foodPrice").value);
    if (!person || !food || isNaN(price) || price <= 0) {
        alert("Vui lòng nhập đầy đủ và chính xác thông tin món ăn."); return;
    }
    if (!meals) meals = []; // Khởi tạo nếu 'meals' là null
    meals.push({ id: Date.now(), day, person, food, price });
    syncDataToFirebase(); 
    clearFoodInputs();
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
    (meals || []).forEach(item => { 
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

// ==== HÀM XÓA ====
function deleteMealItem(mealId) {
    if (confirm("Bạn có chắc muốn xóa món ăn này?")) {
        meals = (meals || []).filter(item => item.id !== mealId);
        syncDataToFirebase(); 
    }
}

function deleteDay(dayName) {
    if (confirm(`Bạn có chắc muốn xóa toàn bộ dữ liệu của ${dayName}?`)) {
        meals = (meals || []).filter(item => item.day !== dayName);
        syncDataToFirebase(); 
    }
}

// ==== TỔNG KẾT TUẦN ====
function updateSummary() {
    const tbody = document.querySelector("#summaryTable tbody");
    tbody.innerHTML = '';
    const summary = {};
    (meals || []).forEach(item => { 
        if (!summary[item.person]) {
            summary[item.person] = { count: 0, total: 0 };
        }
        summary[item.person].count += 1;
        summary[item.person].total += item.price;
    });
    let grandTotal = 0;
    (people || []).forEach(person => { 
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


// ==== TỔNG KẾT THEO THỜI GIAN ====
function generateRangeSummary() {
    const startDate = new Date(document.getElementById('startDate').value + 'T00:00:00');
    const endDate = new Date(document.getElementById('endDate').value + 'T23:59:59');

    if (isNaN(startDate) || isNaN(endDate)) {
        alert("Vui lòng chọn ngày bắt đầu và kết thúc hợp lệ.");
        return;
    }

    const totalSummary = {};
    let rangeGrandTotal = 0;
    const allPeopleSet = new Set();
    
    // Hàm chuẩn hóa tên
    const normalizeName = (name) => {
        const normalizationMap = {
            "a tuân": "A Tuân",
            "phương": "Phương",
            "phụng": "Phương",
            "phung": "Phương",
            "nguyên": "Nguyên",
            "c trúc": "C Trúc",
            "trúc": "C Trúc",
            "c thuỷ": "C Thuỷ",
            "c thuý": "C Thuý"
        };
        if (!name) return 'Không tên';
        let normalizedName = name.trim();
        let nameLower = normalizedName.toLowerCase();
        if (normalizationMap[nameLower]) {
            return normalizationMap[nameLower];
        }
        return normalizedName;
    };

    // 1. Tạo danh sách người đã chuẩn hóa
    Object.values(allData).forEach(week => {
        (week.people || []).forEach(person => {
            allPeopleSet.add(normalizeName(person)); 
        });
        (week.meals || []).forEach(meal => {
             allPeopleSet.add(normalizeName(meal.person));
        });
    });
    
    const allPeopleList = Array.from(allPeopleSet);
    allPeopleList.forEach(person => {
        totalSummary[person] = 0; // Khởi tạo tất cả = 0
    });

    // 2. Lặp qua allData để tính toán
    for (const weekId in allData) {
        const weekDate = new Date(weekId + 'T00:00:00');
        if (weekDate >= startDate && weekDate <= endDate) {
            const weekData = allData[weekId];
            
            (weekData.meals || []).forEach(meal => {
                const normalizedPerson = normalizeName(meal.person); 
                if (totalSummary[normalizedPerson] !== undefined) {
                    totalSummary[normalizedPerson] += meal.price;
                } else {
                     totalSummary[normalizedPerson] = meal.price;
                }
                rangeGrandTotal += meal.price;
            });
        }
    }

    // Hiển thị kết quả lên bảng
    const tbody = document.querySelector("#rangeSummaryTable tbody");
    tbody.innerHTML = '';
    const sortedPeople = Object.keys(totalSummary).sort();
    for (const person of sortedPeople) {
        const total = totalSummary[person];
        if (total > 0) { 
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${person}</td>
                <td>${total.toLocaleString()} VNĐ</td>
            `;
            tbody.appendChild(row);
        }
    }
    document.getElementById("rangeGrandTotal").textContent = `${rangeGrandTotal.toLocaleString()} VNĐ`;
}


// ==== CÁC HÀM XỬ LÝ QR (CẬP NHẬT) ====
function generateTotalWeekQR() {
    document.querySelectorAll('.person-qr-check').forEach(cb => cb.checked = false);
    const dateCode = getWeekDateCode(viewingWeekId); 
    const message = encodeURIComponent(`Tong com tu ${dateCode}`);
    
    // (CẬP NHẬT) Dùng STK TỔNG (Nguyễn Thuỷ)
    const qrUrl = `${TOTAL_QR_URL}?amount=${currentGrandTotal}&addInfo=${message}`;
    document.getElementById('qrPaymentImage').src = qrUrl;
}

function handlePersonQRCheck(checkbox) {
    const qrImage = document.getElementById('qrPaymentImage');
    
    // (CẬP NHẬT) Reset về STK CHÍNH (Thảo Nguyên)
    if (!checkbox.checked) {
        qrImage.src = MAIN_QR_URL;
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
    
    // (CẬP NHẬT) Dùng STK CHÍNH (Thảo Nguyên)
    const qrUrl = `${MAIN_QR_URL}?amount=${amount}&addInfo=${message}`;
    qrImage.src = qrUrl;
}

// ==== XÓA DỮ LIỆU ====
function clearSelectedWeekData() {
    const weekName = getWeekRangeString(viewingWeekId);
    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu (người và món) của tuần ${weekName}?`)) {
        people = [];
        meals = [];
        syncDataToFirebase(); 
    }
}

// ==== KHỞI ĐỘNG TRANG ====
function init() {
    currentWeekId = getWeekId(new Date());
    viewingWeekId = currentWeekId; 
    
    // (CẬP NHẬT) Đặt QR mặc định là STK CHÍNH
    document.getElementById('qrPaymentImage').src = MAIN_QR_URL;

    const allWeeksRef = database.ref('weeks');
    allWeeksRef.once('value', (snapshot) => {
        const existingWeeks = snapshot.val() || {};
        allData = existingWeeks; 

        if (!allData[currentWeekId]) {
            allData[currentWeekId] = { people: [], meals: [] };
        }
        let lastWeekDate = new Date();
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const lastWeekId = getWeekId(lastWeekDate);
        if (!allData[lastWeekId]) {
            allData[lastWeekId] = { people: [], meals: [] };
        }
        let nextWeekDate = new Date();
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        const nextWeekId = getWeekId(nextWeekDate);
        if (!allData[nextWeekId]) {
            allData[nextWeekId] = { people: [], meals: [] };
        }

        if (!existingWeeks[currentWeekId]) { 
            const sortedWeeks = Object.keys(existingWeeks).sort().reverse();
            let lastWeekPeople = [];
            if (sortedWeeks.length > 0) {
                lastWeekPeople = existingWeeks[sortedWeeks[0]].people || [];
            }
            allData[currentWeekId].people = lastWeekPeople;
            database.ref(`weeks/${currentWeekId}`).set(allData[currentWeekId]);
        }
        
        loadWeekData(currentWeekId);
        
        const today = new Date().toISOString().split('T')[0];
        const sortedWeekIds = Object.keys(existingWeeks).sort(); 
        const oldestWeek = sortedWeekIds.length > 0 ? sortedWeekIds[0] : today;

        document.getElementById('startDate').value = oldestWeek;
        document.getElementById('endDate').value = today;
    });
}

window.onload = init;
