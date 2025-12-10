// ==== BƯỚC 1: NHỚ DÁN FIREBASE CONFIG CỦA BẠN VÀO ĐÂY ====
const firebaseConfig = {
    apiKey: "AIzaSy...", // DÁN KEY CỦA BẠN VÀO
    authDomain: "comtruathuymoc-01060520.firebaseapp.com",
    databaseURL: "https://comtruathuymoc-default-rtdb.firebaseio.com", // URL CỦA BẠN
    projectId: "comtruathuymoc-01060520",
    storageBucket: "comtruathuymoc-01060520.appspot.com",
    messagingSenderId: "...", // DÁN CỦA BẠN VÀO
    appId: "..." // DÁN CỦA BẠN VÀO
};
// ======================================================

// Khởi chạy Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase Init Error:", e);
}
const database = firebase.database();

// ==== THÔNG TIN TÀI KHOẢN NGÂN HÀNG ====
const BANK_BIN = '970407'; 
const QR_TEMPLATE = 'print';

// STK Cũ (Trần Thị Thảo Nguyên)
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

// ==== HÀM CHUẨN HÓA TÊN ====
function normalizeName(name) {
    const normalizationMap = {
        "a tuân": "A Tuân", "phương": "Phương", "phụng": "Phương", 
        "phung": "Phương", "nguyên": "Nguyên", "c trúc": "C Trúc", 
        "trúc": "C Trúc", "c thuỷ": "C Thuỷ", "c thuý": "C Thuý"
    };
    if (!name) return 'Không tên';
    let normalizedName = name.trim();
    let nameLower = normalizedName.toLowerCase();
    return normalizationMap[nameLower] || normalizedName;
}

// ==== HÀM LẤY ID TUẦN (Chuẩn ISO) ====
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

// ==== HÀM HIỂN THỊ DẢI NGÀY ====
function getWeekRangeString(weekId) {
    if (!weekId) return "Đang tải...";
    try {
        const monday = new Date(weekId + 'T00:00:00');
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6); 
        const monDay = monday.getDate().toString().padStart(2, '0');
        const monMonth = (monday.getMonth() + 1).toString().padStart(2, '0');
        const sunDay = sunday.getDate().toString().padStart(2, '0');
        const sunMonth = (sunday.getMonth() + 1).toString().padStart(2, '0');
        const sunYear = sunday.getFullYear();
        return `${monDay}/${monMonth} - ${sunDay}/${sunMonth}/${sunYear}`;
    } catch (e) {
        return weekId;
    }
}

function getWeekDateCode(weekId) {
    if (!weekId) return "";
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


// ==== CẬP NHẬT FIREBASE ====
function syncDataToFirebase() {
    if (!viewingWeekId) return;
    const ref = database.ref(`weeks/${viewingWeekId}`);
    ref.set({
        people: people || [],
        meals: meals || []
    }).catch(err => alert("Lỗi lưu dữ liệu: " + err.message));
}

// ==== BỘ CHỌN TUẦN ====
function populateWeekPicker() {
    const weekPicker = document.getElementById("weekPicker");
    weekPicker.innerHTML = '';
    
    if (!allData) return;

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
    if (newWeekId) loadWeekData(newWeekId);
}

// ==== TẢI DỮ LIỆU TUẦN ====
function loadWeekData(weekId) {
    if (!weekId) return;
    viewingWeekId = weekId;

    if (currentWeekListener && currentWeekRef) {
        currentWeekRef.off('value', currentWeekListener); 
    }

    currentWeekRef = database.ref(`weeks/${viewingWeekId}`); 
    currentWeekListener = currentWeekRef.on('value', (snapshot) => { 
        const weekData = snapshot.val() || { people: [], meals: [] };
        
        // AN TOÀN: Luôn đảm bảo là mảng, tránh crash
        let rawPeople = weekData.people || (allData[viewingWeekId] && allData[viewingWeekId].people) || [];
        let rawMeals = weekData.meals || (allData[viewingWeekId] && allData[viewingWeekId].meals) || [];
        
        // Chuẩn hóa tên người và loại bỏ trùng lặp
        const normalizedPeopleSet = new Set();
        rawPeople.forEach(person => {
            normalizedPeopleSet.add(normalizeName(person));
        });
        people = Array.from(normalizedPeopleSet).sort();
        
        // Chuẩn hóa tên người trong meals
        meals = rawMeals.map(meal => ({
            ...meal,
            person: normalizeName(meal.person)
        }));
        
        // Nếu có thay đổi, lưu lại
        if (JSON.stringify(rawPeople) !== JSON.stringify(people) || 
            JSON.stringify(rawMeals) !== JSON.stringify(meals)) {
            syncDataToFirebase();
        }

        try {
            updatePeopleList();
            updatePersonSelect();
            updateDailyExpenses();
            updateSummary();
        } catch (e) {
            console.error("Lỗi hiển thị dữ liệu tuần:", e);
        }
        
        const notice = document.getElementById("weekNotice");
        if(notice) {
            notice.textContent = `Bạn đang xem tuần: ${getWeekRangeString(weekId)}`;
            notice.style.color = (weekId === currentWeekId) ? "green" : "blue";
        }
    });

    const qrImg = document.getElementById('qrPaymentImage');
    if(qrImg) qrImg.src = MAIN_QR_URL;
    
    document.getElementById("addPersonCard").classList.remove('hidden');
    document.getElementById("addMealCard").classList.remove('hidden');
    
    const btn = document.getElementById("manageDataBtn");
    if(btn) {
        btn.textContent = "🗑️ Xóa dữ liệu tuần này";
        btn.onclick = clearSelectedWeekData; 
    }
    
    populateWeekPicker();
}


// ==== THÊM NGƯỜI ====
function addPerson() {
    const nameInput = document.getElementById("personName");
    const name = nameInput.value.trim();
    if (!name) { alert("Vui lòng nhập tên."); return; }
    if (!people) people = [];
    const normalizedName = normalizeName(name);
    // Kiểm tra xem tên đã chuẩn hóa đã tồn tại chưa
    const normalizedPeople = people.map(p => normalizeName(p));
    if (normalizedPeople.includes(normalizedName)) { 
        alert("Người này đã tồn tại trong tuần này."); 
        return; 
    }
    people.push(normalizedName);
    syncDataToFirebase(); 
    nameInput.value = '';
}

// ==== CẬP NHẬT UI NGƯỜI ====
function updatePeopleList() {
    const ul = document.getElementById("peopleList");
    if(!ul) return;
    ul.innerHTML = '';
    (people || []).forEach(name => { 
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
    });
}

function updatePersonSelect() {
    const select = document.getElementById("personSelect");
    if(!select) return;
    select.innerHTML = '<option value="">-- Chọn người --</option>';
    (people || []).forEach(name => { 
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

function setPrice(price) {
    document.getElementById("foodPrice").value = price;
}

// ==== THÊM MÓN ĂN ====
function addFood() {
    const daySelect = document.getElementById("daySelect");
    const personSelect = document.getElementById("personSelect");
    const foodInput = document.getElementById("foodItem");
    const priceInput = document.getElementById("foodPrice");

    if(!daySelect || !personSelect || !foodInput || !priceInput) return;

    const day = daySelect.value;
    const person = personSelect.value;
    const food = foodInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (!person || !food || isNaN(price) || price <= 0) {
        alert("Vui lòng nhập đầy đủ và chính xác thông tin món ăn."); return;
    }
    if (!meals) meals = []; 
    // Chuẩn hóa tên người khi thêm món
    const normalizedPerson = normalizeName(person);
    meals.push({ id: Date.now(), day, person: normalizedPerson, food, price });
    syncDataToFirebase(); 
    
    foodInput.value = '';
    priceInput.value = '';
}

// ==== HIỂN THỊ CHI TIÊU ====
function updateDailyExpenses() {
    const container = document.getElementById("daily-expenses");
    if(!container) return;
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

// ==== TỔNG KẾT ====
function updateSummary() {
    const tbody = document.querySelector("#summaryTable tbody");
    if(!tbody) return;
    tbody.innerHTML = '';
    const summary = {};
    // Tính tổng theo tên đã chuẩn hóa để gộp các tên trùng
    (meals || []).forEach(item => { 
        const normalizedPerson = normalizeName(item.person);
        if (!summary[normalizedPerson]) {
            summary[normalizedPerson] = { count: 0, total: 0 };
        }
        summary[normalizedPerson].count += 1;
        summary[normalizedPerson].total += item.price;
    });
    
    // Lấy danh sách người duy nhất (đã chuẩn hóa)
    const uniquePeople = new Set();
    (people || []).forEach(person => {
        uniquePeople.add(normalizeName(person));
    });
    
    // Cập nhật lại mảng people để loại bỏ trùng lặp
    const deduplicatedPeople = Array.from(uniquePeople).sort();
    if (JSON.stringify(people) !== JSON.stringify(deduplicatedPeople)) {
        people = deduplicatedPeople;
        syncDataToFirebase();
    }
    
    let grandTotal = 0;
    deduplicatedPeople.forEach(person => { 
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
    const grandTotalEl = document.getElementById("grandTotal");
    if(grandTotalEl) grandTotalEl.textContent = `Tổng chi phí cả tuần: ${grandTotal.toLocaleString()} VNĐ`;
}


// ==== THỐNG KÊ THỜI GIAN ====
function generateRangeSummary() {
    try {
        const startEl = document.getElementById('startDate');
        const endEl = document.getElementById('endDate');
        if(!startEl || !endEl) return;

        const startDate = new Date(startEl.value + 'T00:00:00');
        const endDate = new Date(endEl.value + 'T23:59:59');

        if (isNaN(startDate) || isNaN(endDate)) {
            alert("Vui lòng chọn ngày bắt đầu và kết thúc hợp lệ.");
            return;
        }

        const totalSummary = {};
        let rangeGrandTotal = 0;
        const allPeopleSet = new Set();
        
        // Sử dụng hàm normalizeName toàn cục

        if (allData) {
            Object.values(allData).forEach(week => {
                (week.people || []).forEach(person => allPeopleSet.add(normalizeName(person)));
                (week.meals || []).forEach(meal => allPeopleSet.add(normalizeName(meal.person)));
            });
            
            const allPeopleList = Array.from(allPeopleSet);
            allPeopleList.forEach(person => totalSummary[person] = 0);

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
        }

        const tbody = document.querySelector("#rangeSummaryTable tbody");
        if(tbody) {
            tbody.innerHTML = '';
            const sortedPeople = Object.keys(totalSummary).sort();
            for (const person of sortedPeople) {
                const total = totalSummary[person];
                if (total > 0) { 
                    const row = document.createElement("tr");
                    row.innerHTML = `<td>${person}</td><td>${total.toLocaleString()} VNĐ</td>`;
                    tbody.appendChild(row);
                }
            }
        }
        const rangeTotalEl = document.getElementById("rangeGrandTotal");
        if(rangeTotalEl) rangeTotalEl.textContent = `${rangeGrandTotal.toLocaleString()} VNĐ`;
        
    } catch (e) {
        console.error("Lỗi tính tổng thời gian:", e);
        alert("Có lỗi khi tính toán: " + e.message);
    }
}


// ==== QR CODE ====
function generateTotalWeekQR() {
    document.querySelectorAll('.person-qr-check').forEach(cb => cb.checked = false);
    const dateCode = getWeekDateCode(viewingWeekId); 
    const message = encodeURIComponent(`Tong com tu ${dateCode}`);
    const qrUrl = `${TOTAL_QR_URL}?amount=${currentGrandTotal}&addInfo=${message}`;
    const img = document.getElementById('qrPaymentImage');
    if(img) img.src = qrUrl;
}

function handlePersonQRCheck(checkbox) {
    const qrImage = document.getElementById('qrPaymentImage');
    if (!checkbox.checked) {
        if(qrImage) qrImage.src = MAIN_QR_URL;
        return;
    }
    document.querySelectorAll('.person-qr-check').forEach(cb => {
        if (cb !== checkbox) cb.checked = false;
    });
    const name = checkbox.dataset.name;
    const amount = checkbox.dataset.amount;
    const dateCode = getWeekDateCode(viewingWeekId); 
    const message = encodeURIComponent(`${name} tu ${dateCode}`);
    const qrUrl = `${MAIN_QR_URL}?amount=${amount}&addInfo=${message}`;
    if(qrImage) qrImage.src = qrUrl;
}

function clearSelectedWeekData() {
    const weekName = getWeekRangeString(viewingWeekId);
    if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu (người và món) của tuần ${weekName}?`)) {
        people = [];
        meals = [];
        syncDataToFirebase(); 
    }
}

// ==== HIỂN THỊ MODAL CHỌN NGƯỜI TỪ TUẦN TRƯỚC ====
function showPeopleSelectionModal(previousWeekPeople) {
    const modal = document.getElementById("selectPeopleModal");
    const listContainer = document.getElementById("previousWeekPeopleList");
    
    if (!modal || !listContainer) return;
    
    listContainer.innerHTML = '';
    
    if (!previousWeekPeople || previousWeekPeople.length === 0) {
        listContainer.innerHTML = '<p style="color: #999; font-style: italic;">Không có danh sách từ tuần trước.</p>';
    } else {
        // Loại bỏ trùng lặp và chuẩn hóa tên
        const uniquePeople = [];
        const seen = new Set();
        previousWeekPeople.forEach(person => {
            const normalized = normalizeName(person);
            if (!seen.has(normalized)) {
                seen.add(normalized);
                uniquePeople.push(normalized);
            }
        });
        
        uniquePeople.forEach(person => {
            const label = document.createElement("label");
            label.style.display = "block";
            label.innerHTML = `
                <input type="checkbox" value="${person}" checked>
                <span>${person}</span>
            `;
            listContainer.appendChild(label);
        });
    }
    
    modal.style.display = "block";
}

// ==== XÁC NHẬN CHỌN NGƯỜI TỪ TUẦN TRƯỚC ====
function confirmPeopleSelection() {
    const modal = document.getElementById("selectPeopleModal");
    const checkboxes = document.querySelectorAll("#previousWeekPeopleList input[type='checkbox']:checked");
    
    const selectedPeople = Array.from(checkboxes).map(cb => cb.value);
    
    // Chuẩn hóa và loại bỏ trùng lặp
    const normalizedPeople = [];
    const seen = new Set();
    selectedPeople.forEach(person => {
        const normalized = normalizeName(person);
        if (!seen.has(normalized)) {
            seen.add(normalized);
            normalizedPeople.push(normalized);
        }
    });
    
    people = normalizedPeople;
    syncDataToFirebase();
    
    if (modal) modal.style.display = "none";
    
    // Cập nhật UI
    updatePeopleList();
    updatePersonSelect();
}

// ==== BỎ QUA CHỌN NGƯỜI (TẠO MỚI) ====
function skipPeopleSelection() {
    const modal = document.getElementById("selectPeopleModal");
    if (modal) modal.style.display = "none";
    // Giữ people = [] (danh sách mới)
    people = [];
    syncDataToFirebase();
    updatePeopleList();
    updatePersonSelect();
}

// ==== KHỞI ĐỘNG (AN TOÀN) ====
function init() {
    try {
        currentWeekId = getWeekId(new Date());
        viewingWeekId = currentWeekId; 
        
        const qrImg = document.getElementById('qrPaymentImage');
        if(qrImg) qrImg.src = MAIN_QR_URL;

        const allWeeksRef = database.ref('weeks');
        
        // Hiện thông báo đang tải...
        const notice = document.getElementById("weekNotice");
        if(notice) notice.textContent = "Đang kết nối dữ liệu...";

        allWeeksRef.once('value', (snapshot) => {
            const existingWeeks = snapshot.val() || {};
            allData = existingWeeks; 

            // Logic tạo tuần ảo (tránh lỗi nếu data rỗng)
            if (!allData[currentWeekId]) allData[currentWeekId] = { people: [], meals: [] };
            
            // Tính toán tuần trước/sau để tránh lỗi
            let lastWeekDate = new Date();
            lastWeekDate.setDate(lastWeekDate.getDate() - 7);
            const lastWeekId = getWeekId(lastWeekDate);
            if (!allData[lastWeekId]) allData[lastWeekId] = { people: [], meals: [] };
            
            let nextWeekDate = new Date();
            nextWeekDate.setDate(nextWeekDate.getDate() + 7);
            const nextWeekId = getWeekId(nextWeekDate);
            if (!allData[nextWeekId]) allData[nextWeekId] = { people: [], meals: [] };

            // Logic hiển thị modal chọn người từ tuần cũ khi tạo tuần mới
            if (!existingWeeks[currentWeekId] || (existingWeeks[currentWeekId].people && existingWeeks[currentWeekId].people.length === 0)) { 
                const sortedWeeks = Object.keys(existingWeeks).sort().reverse();
                let lastWeekPeople = [];
                // Kiểm tra kỹ xem tuần cũ có tồn tại và có 'people' không
                if (sortedWeeks.length > 0 && existingWeeks[sortedWeeks[0]]) {
                    lastWeekPeople = existingWeeks[sortedWeeks[0]].people || [];
                }
                
                // Nếu có danh sách từ tuần trước, hiển thị modal để chọn
                if (lastWeekPeople.length > 0) {
                    showPeopleSelectionModal(lastWeekPeople);
                } else {
                    // Không có tuần trước, tạo danh sách mới
                    people = [];
                }
                
                // Lưu ngay tuần mới lên Firebase để giữ chỗ
                database.ref(`weeks/${currentWeekId}`).set(allData[currentWeekId]);
            }
            
            loadWeekData(currentWeekId);
            
            // Đặt ngày cho bộ lọc
            const today = new Date().toISOString().split('T')[0];
            const sortedWeekIds = Object.keys(existingWeeks).sort(); 
            const oldestWeek = sortedWeekIds.length > 0 ? sortedWeekIds[0] : today;

            const startEl = document.getElementById('startDate');
            const endEl = document.getElementById('endDate');
            if(startEl) startEl.value = oldestWeek;
            if(endEl) endEl.value = today;

        }, (error) => {
            console.error("Lỗi Firebase:", error);
            alert("Không thể tải dữ liệu: " + error.message);
        });
    } catch (e) {
        console.error("Critical Error in Init:", e);
        alert("Có lỗi nghiêm trọng khi khởi động: " + e.message);
    }
}

window.onload = init;
