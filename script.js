// ==== DỮ LIỆU ====
// 'allData' là đối tượng chứa TOÀN BỘ dữ liệu, được lưu trong localStorage
// Cấu trúc: { "2025-11-03": { people: [], meals: [] }, "2025-10-27": { ... } }
let allData = JSON.parse(localStorage.getItem('weeklyMealData')) || {};

let currentWeekId = ''; // ID của tuần hiện tại (ví dụ: "2025-11-03")
let viewingWeekId = ''; // ID của tuần đang xem (có thể là tuần cũ)

// 'people' và 'meals' CHỈ là biến tạm, chứa dữ liệu của tuần đang xem
let people = [];
let meals = [];

// ==== HÀM LẤY ID TUẦN (MỚI) ====
/**
 * Lấy ID của tuần (ngày Thứ 2) từ một ngày bất kỳ
 * @param {Date} date - Ngày để tính
 * @returns {string} - Chuỗi YYYY-MM-DD của ngày Thứ 2
 */
function getWeekId(date) {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lùi về Thứ 2
    const monday = new Date(d.setDate(diff));

    // Format về YYYY-MM-DD
    const y = monday.getFullYear();
    const m = (monday.getMonth() + 1).toString().padStart(2, '0');
    const da = monday.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${da}`;
}

/**
 * Lấy chuỗi hiển thị Dải ngày (Từ T2-CN)
 * @param {string} weekId - ID của tuần (ngày T2, "YYYY-MM-DD")
 * @returns {string} - Chuỗi "DD/MM - DD/MM/YYYY"
 */
function getWeekRangeString(weekId) {
    // Thêm 'T00:00:00' để đảm bảo tính toán múi giờ chính xác
    const monday = new Date(weekId + 'T00:00:00');
    
    // Sao chép ngày Thứ 2 để tính ngày Chủ Nhật
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Chủ nhật là 6 ngày sau Thứ 2

    // Lấy thông tin ngày/tháng của Thứ 2
    const monDay = monday.getDate().toString().padStart(2, '0');
    const monMonth = (monday.getMonth() + 1).toString().padStart(2, '0');

    // Lấy thông tin ngày/tháng/năm của Chủ Nhật
    const sunDay = sunday.getDate().toString().padStart(2, '0');
    const sunMonth = (sunday.getMonth() + 1).toString().padStart(2, '0');
    const sunYear = sunday.getFullYear();

    // Trả về chuỗi theo định dạng "DD/MM - DD/MM/YYYY"
    return `${monDay}/${monMonth} - ${sunDay}/${sunMonth}/${sunYear}`;
}


// ==== HÀM CẬP NHẬT LOCAL STORAGE (CẬP NHẬT) ====
function saveData() {
    // Chỉ lưu khi đang ở tuần hiện tại
    if (viewingWeekId !== currentWeekId) return;

    // Cập nhật dữ liệu tuần hiện tại vào 'allData'
    allData[currentWeekId] = { people, meals };
    localStorage.setItem('weeklyMealData', JSON.stringify(allData));
}

// ==== BỘ CHỌN TUẦN (CẬP NHẬT MỚI NHẤT) ====
function populateWeekPicker() {
    const weekPicker = document.getElementById("weekPicker");
    weekPicker.innerHTML = '';

    // Lấy tất cả các tuần đã lưu và sắp xếp mới nhất lên trước
    // 'allData' được đảm bảo có ít nhất 'currentWeekId' từ hàm init()
    const sortedWeeks = Object.keys(allData).sort().reverse();

    sortedWeeks.forEach(weekId => {
        const option = document.createElement("option");
        option.value = weekId;

        // Lấy dải ngày T2-CN (ví dụ: "03/11 - 09/11/2025")
        option.textContent = getWeekRangeString(weekId);

        weekPicker.appendChild(option);
    });

    // Đặt giá trị là tuần đang xem
    weekPicker.value = viewingWeekId;
}


function handleWeekChange() {
    const newWeekId = document.getElementById("weekPicker").value;
    loadWeekData(newWeekId);
}

// ==== TẢI DỮ LIỆU TUẦN (MỚI) ====
/**
 * Tải dữ liệu của một tuần cụ thể vào các biến tạm và cập nhật UI
 * @param {string} weekId - ID của tuần để tải
 */
function loadWeekData(weekId) {
    viewingWeekId = weekId;
    const weekData = allData[weekId] || { people: [], meals: [] };

    // Tải dữ liệu vào biến tạm
    people = weekData.people;
    meals = weekData.meals;

    // Cập nhật toàn bộ UI
    updatePeopleList();
    updatePersonSelect();
    updateDailyExpenses();
    updateSummary();

    // Ẩn/hiện form nhập liệu và cập nhật nút Xóa
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

/**
 * Ẩn/hiện các form nhập liệu
 * @param {boolean} isCurrent - True nếu là tuần hiện tại
 */
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


// ==== THÊM NGƯỜI (CẬP NHẬT) ====
function addPerson() {
    // Kiểm tra xem có đang ở tuần hiện tại không
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

// ==== CẬP NHẬT DANH SÁCH NGƯỜI (CẬP NHẬT) ====
// Các hàm update giờ không cần tham số, chúng dùng biến 'people' và 'meals' toàn cục
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
    // Kiểm tra xem có đang ở tuần hiện tại không
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

            // Nút xóa ngày (chỉ cho tuần hiện tại)
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

                // Nút xóa món (chỉ cho tuần hiện tại)
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

// ==== HÀM XÓA (CẬP NHẬT) ====
function deleteMealItem(mealId) {
    if (viewingWeekId !== currentWeekId) return; // An toàn
    if (confirm("Bạn có chắc muốn xóa món ăn này?")) {
        meals = meals.filter(item => item.id !== mealId);
        saveData();
        updateDailyExpenses();
        updateSummary();
    }
}

function deleteDay(dayName) {
    if (viewingWeekId !== currentWeekId) return; // An toàn
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

    // Dùng 'people' (danh sách tuần) để đảm bảo ai 0 suất cũng hiện
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

// ==== XÓA DỮ LIỆU (CẬP NHẬT) ====
function clearCurrentWeekData() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của TUẦN NÀY?")) {
        people = [];
        meals = [];
        saveData(); // Lưu lại mảng rỗng cho tuần này
        loadWeekData(currentWeekId); // Tải lại UI
    }
}

function deleteOldWeekData() {
    if (confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN dữ liệu của tuần ${getWeekRangeString(viewingWeekId)}?`)) {
        delete allData[viewingWeekId]; // Xóa tuần cũ khỏi 'allData'
        localStorage.setItem('weeklyMealData', JSON.stringify(allData)); // Lưu thay đổi
        
        // Tải lại từ đầu, sẽ tự động về tuần hiện tại
        init();
    }
}

// ==== KHỞI ĐỘNG TRANG (CẬP NHẬT) ====
function init() {
    currentWeekId = getWeekId(new Date());
    viewingWeekId = currentWeekId; // Mặc định xem tuần hiện tại

    // Nếu tuần hiện tại chưa có trong dữ liệu, hãy tạo một mục rỗng
    if (!allData[currentWeekId]) {
        // Tự động sao chép danh sách người từ tuần gần nhất (nếu có)
        const sortedWeeks = Object.keys(allData).sort().reverse();
        let lastWeekPeople = [];
        if (sortedWeeks.length > 0) {
            lastWeekPeople = allData[sortedWeeks[0]].people || [];
        }
        
        allData[currentWeekId] = { people: lastWeekPeople, meals: [] };
    }

    populateWeekPicker();
    loadWeekData(currentWeekId); // Tải dữ liệu tuần hiện tại
}

// Chạy hàm init khi tải trang
window.onload = init;
