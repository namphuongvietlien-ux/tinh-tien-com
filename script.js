// ==== BƯỚC 1: DÁN FIREBASE CONFIG CỦA BẠN VÀO ĐÂY ====
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "comtruathuymoc-01060520.firebaseapp.com",
    databaseURL: "https://comtruathuymoc-default-rtdb.firebaseio.com",
    projectId: "comtruathuymoc-01060520",
    storageBucket: "comtruathuymoc-01060520.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};
// ======================================================

// Khởi chạy Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==== THÔNG TIN TÀI KHOẢN NGÂN HÀNG ====
const BANK_BIN = '970407'; 
const ACCOUNT_NO = '19027952512028'; 
const QR_TEMPLATE = 'print';
const BASE_QR_URL = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NO}-${QR_TEMPLATE}.png`;


// ==== DỮ LIỆU ====
let allData = {}; // Sẽ được tải từ Firebase
let currentWeekId = ''; 
let viewingWeekId = ''; 

let people = [];
let meals = [];
let currentGrandTotal = 0; 

let currentWeekListener = null; // Biến lưu trữ "tai nghe" Firebase

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
    // Lưu 'people' và 'meals' vào tuần đang xem (viewingWeekId)
    // Nếu tuần này chưa có trên Firebase, nó sẽ tự động được tạo
    const ref = database.ref(`weeks/${viewingWeekId}`);
    ref.set({
        people: people,
        meals: meals
    });
}

// ==== BỘ CHỌN TUẦN (CẬP NHẬT) ====
function populateWeekPicker() {
    const weekPicker = document.getElementById("weekPicker");
    weekPicker.innerHTML = '';
    
    // Lấy ID các tuần từ 'allData' (giờ đã bao gồm các tuần ảo)
    const sortedWeeks = Object.keys(allData).sort().reverse();

    // Lô-gic 'if' đã bị xóa vì 'allData' giờ luôn chứa 'currentWeekId'

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

    // 1. Tắt "tai nghe" của tuần cũ (nếu có)
    if (currentWeekListener) {
        currentWeekListener.off();
    }

    // 2. Tạo một "tai nghe" mới cho tuần đã chọn
    const weekRef = database.ref(`weeks/${viewingWeekId}`);
    currentWeekListener = weekRef.on('value', (snapshot) => {
        const weekData = snapshot.val() || { people: [], meals: [] };
        
        // 3. Cập nhật biến tạm (lấy từ 'allData' nếu là tuần ảo chưa có trên FB)
        people = weekData.people || allData[viewingWeekId].people || [];
        meals = weekData.meals || allData[viewingWeekId].meals || [];

        // 4. Vẽ lại toàn bộ giao diện
        updatePeopleList();
        updatePersonSelect();
        updateDailyExpenses();
        updateSummary();
        
        // Cập nhật thông báo
        const notice = document.getElementById("weekNotice");
        notice.textContent = `Bạn đang xem tuần: ${getWeekRangeString(weekId)}`;
        notice.style.color = (weekId === currentWeekId) ? "green" : "blue";
    });

    // Cập nhật các phần không đổi
    document.getElementById('qrPaymentImage').src = BASE_QR_URL;
    document.getElementById("addPersonCard").classList.remove('hidden');
    document.getElementById("addMealCard").classList.remove('hidden');
    const btn = document.getElementById("manageDataBtn");
    btn.textContent = "🗑️ Xóa dữ liệu tuần này";
    btn.onclick = clearSelectedWeekData; 
    
    // Cập nhật lại bộ chọn tuần (phòng trường hợp tuần mới được tạo)
    populateWeekPicker();
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
        alert("Người này đã tồn tại trong tuần này.");
        return;
    }
    
    people.push(name);
    syncDataToFirebase(); // Đẩy mảng 'people' mới lên Firebase
    
    nameInput.value = '';
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
    const day = document.getElementById("daySelect").value;
    const person = document.getElementById("personSelect").value;
    const food = document.getElementById("foodItem").value.trim();
    const price = parseFloat(document.getElementById("foodPrice").value);

    if (!person || !food || isNaN(price) || price <= 0) {
        alert("Vui lòng nhập đầy đủ và chính xác thông tin món ăn.");
        return;
    }
    
    meals.push({ id: Date.now(), day, person, food, price });
    syncDataToFirebase(); // Đẩy mảng 'meals' mới lên Firebase
    
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
        meals = meals.filter(item => item.id !== mealId);
        syncDataToFirebase(); 
    }
}

function deleteDay(dayName) {
    if (confirm(`Bạn có chắc muốn xóa toàn bộ dữ liệu của ${dayName}?`)) {
        meals = meals.filter(item => item.day !== dayName);
        syncDataToFirebase(); 
    }
}

// ==== TỔNG KẾT ====
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


// ==== XÓA DỮ LIỆU ====
function clearSelectedWeekData() {
    const weekName = getWeekRangeString(viewingWeekId);
    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu (người và món) của tuần ${weekName}?`)) {
        people = [];
        meals = [];
        syncDataToFirebase(); 
    }
}

// ==== KHỞI ĐỘNG TRANG (CẬP NHẬT) ====
function init() {
    currentWeekId = getWeekId(new Date());
    viewingWeekId = currentWeekId; // Mặc định xem tuần hiện tại

    document.getElementById('qrPaymentImage').src = BASE_QR_URL;

    // 1. Tải toàn bộ danh sách các tuần đã có
    const allWeeksRef = database.ref('weeks');
    allWeeksRef.once('value', (snapshot) => {
        const existingWeeks = snapshot.val() || {};
        allData = existingWeeks; // Gán tuần đã có vào allData

        // 2. Tự động THÊM (ảo) tuần hiện tại, tuần trước, tuần sau vào allData NẾU CHƯA CÓ
        // Điều này đảm bảo chúng luôn có trong dropdown để chọn
        
        // Tuần hiện tại
        if (!allData[currentWeekId]) {
            allData[currentWeekId] = { people: [], meals: [] }; // Tạo ảo
        }
        
        // Tuần trước
        let lastWeekDate = new Date();
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const lastWeekId = getWeekId(lastWeekDate);
        if (!allData[lastWeekId]) {
            allData[lastWeekId] = { people: [], meals: [] }; // Tạo ảo
        }

        // Tuần sau
        let nextWeekDate = new Date();
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        const nextWeekId = getWeekId(nextWeekDate);
        if (!allData[nextWeekId]) {
            allData[nextWeekId] = { people: [], meals: [] }; // Tạo ảo
        }

        // 3. Tự động sao chép 'people' cho tuần hiện tại (nếu nó MỚI TINH)
        if (!existingWeeks[currentWeekId]) { // Chỉ chạy nếu tuần này mới được tạo
            const sortedWeeks = Object.keys(existingWeeks).sort().reverse();
            let lastWeekPeople = [];
            if (sortedWeeks.length > 0) {
                // Lấy 'people' từ tuần có thật, gần nhất
                lastWeekPeople = existingWeeks[sortedWeeks[0]].people || [];
            }
            allData[currentWeekId].people = lastWeekPeople;
            
            // LƯU tuần hiện tại này lên Firebase (với danh sách people)
            database.ref(`weeks/${currentWeekId}`).set(allData[currentWeekId]);
        }
        
        // 4. Tải dữ liệu tuần hiện tại (sẽ kích hoạt listener)
        // Hàm này sẽ tự động gọi populateWeekPicker()
        loadWeekData(currentWeekId);
    });
}

// Chạy hàm init khi tải trang
window.onload = init;

