/* script.js - Core Logic & Cute Redesign UI Rendering for YUMMY MEAL SCHOOL */

// Constants
const OFFICE_CODE = "B10"; // 서울특별시교육청
const SCHOOL_CODE = "7021096"; // 서울대학교사범대학부설고등학교 (기본값)
const API_BASE = "https://open.neis.go.kr/hub/mealServiceDietInfo";

// Allergy Map Dictionary (1~19)
const ALLERGY_MAP = {
  "1": "난류 (가금류)",
  "2": "우유",
  "3": "메밀",
  "4": "땅콩",
  "5": "대두 (콩)",
  "6": "밀",
  "7": "고등어",
  "8": "게",
  "9": "새우",
  "10": "돼지고기",
  "11": "복숭아",
  "12": "토마토",
  "13": "아황산류",
  "14": "호두",
  "15": "닭고기",
  "16": "쇠고기",
  "17": "오징어",
  "18": "조개류 (굴, 전복, 홍합 등)",
  "19": "잣"
};

// Meal Calorie Emoji Map
const MEAL_EMOJI_MAP = {
  "조식": "🐰",
  "중식": "🐿️",
  "석식": "🐹"
};

// State
let activeDate = new Date();

// DOM Elements
const schoolNameEl = document.getElementById("school-name");
const currentDateEl = document.getElementById("current-date");
const datepickerInput = document.getElementById("datepicker");
const prevDateBtn = document.getElementById("prev-date-btn");
const nextDateBtn = document.getElementById("next-date-btn");
const goTodayBtn = document.getElementById("go-today-btn");
const mealsGrid = document.getElementById("meals-grid");

// Allergy Guide elements
const allergyGuideHeader = document.getElementById("allergy-guide-header");
const allergyGuideContent = document.getElementById("allergy-guide-content");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  // Sync datepicker with active date
  updateDateUI();
  fetchMealData();
  
  // Set up event listeners
  setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
  // Date Navigation
  prevDateBtn.addEventListener("click", () => navigateDate(-1));
  nextDateBtn.addEventListener("click", () => navigateDate(1));
  
  // Native Datepicker input change
  datepickerInput.addEventListener("change", (e) => {
    if (e.target.value) {
      activeDate = new Date(e.target.value);
      updateDateUI();
      fetchMealData();
    }
  });

  // Go to Today Button
  goTodayBtn.addEventListener("click", () => {
    activeDate = new Date();
    updateDateUI();
    fetchMealData();
  });

  // Allergy Guide Accordion Toggle
  allergyGuideHeader.addEventListener("click", () => {
    allergyGuideHeader.classList.toggle("active");
    allergyGuideContent.classList.toggle("active");
  });
}

// Date Navigation: Add or subtract days
function navigateDate(days) {
  activeDate.setDate(activeDate.getDate() + days);
  updateDateUI();
  fetchMealData();
}

// Update Date-related DOM Elements
function updateDateUI() {
  const yyyy = activeDate.getFullYear();
  const mm = String(activeDate.getMonth() + 1).padStart(2, '0');
  const dd = String(activeDate.getDate()).padStart(2, '0');
  
  // Custom Day of the Week Short formatting
  const dayNamesShort = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = dayNamesShort[activeDate.getDay()];
  
  currentDateEl.textContent = `${yyyy}년 ${mm}월 ${dd}일 (${dayName})`;
  
  // Set datepicker input value (YYYY-MM-DD format)
  datepickerInput.value = `${yyyy}-${mm}-${dd}`;
}

// Format date to YYYYMMDD string for NEIS API
function formatDateToAPIString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// Render cute neobrutalist skeleton screen during loading
function renderSkeleton() {
  mealsGrid.innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton-shimmer"></div>
      <div class="skeleton-header">
        <div class="skeleton-title"></div>
        <div class="skeleton-circle"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>
  `;
}

// Main Fetch and Parse Function
async function fetchMealData() {
  renderSkeleton();
  
  const ymd = formatDateToAPIString(activeDate);
  const url = `${API_BASE}?ATPT_OFCDC_SC_CODE=${OFFICE_CODE}&SD_SCHUL_CODE=${SCHOOL_CODE}&MLSV_YMD=${ymd}&Type=xml`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const xmlText = await response.text();
    
    // Parse XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check if result returned error/empty code
    const resultCodeEl = xmlDoc.querySelector("RESULT CODE");
    const resultCode = resultCodeEl ? resultCodeEl.textContent : "";
    
    if (resultCode && resultCode !== "INFO-000") {
      if (resultCode === "INFO-200") {
        renderEmptyState("급식 정보가 없습니다.", "주말, 공휴일, 혹은 아직 등록되지 않은 날짜입니다.");
      } else {
        const resultMsg = xmlDoc.querySelector("RESULT MESSAGE")?.textContent || "알 수 없는 오류";
        renderEmptyState("정보 로드 실패", `${resultMsg} (${resultCode})`);
      }
      return;
    }
    
    // Extract meal row records
    const rows = xmlDoc.querySelectorAll("row");
    if (rows.length === 0) {
      renderEmptyState("급식 정보가 없습니다.", "해당 날짜에 등록된 식단표가 존재하지 않습니다.");
      return;
    }
    
    const mealDataList = [];
    let schoolName = "급식 정보 서비스";
    
    rows.forEach(row => {
      if (row.querySelector("SCHUL_NM")) {
        schoolName = row.querySelector("SCHUL_NM").textContent;
      }
      
      const mealName = row.querySelector("MMEAL_SC_NM").textContent; // 조식, 중식, 석식
      const rawDish = row.querySelector("DDISH_NM").textContent; // 요리명
      const calorie = row.querySelector("CAL_INFO").textContent; // 칼로리
      const rawNutrient = row.querySelector("NTR_INFO") ? row.querySelector("NTR_INFO").textContent : ""; // 영양정보
      
      mealDataList.push({
        mealName,
        rawDish,
        calorie,
        rawNutrient
      });
    });
    
    // Update school name badge in header
    schoolNameEl.textContent = schoolName;
    
    // Render dynamic cards
    renderMealCards(mealDataList);
    
  } catch (error) {
    console.error("Meal API fetch error:", error);
    renderEmptyState("서버 연결 실패", "인터넷 연결을 확인하거나 나이스 API 서버의 응답 상태를 점검해주세요.");
  }
}

// Parse dish item and extract allergy codes (supports optional trailing parentheses and asterisks)
function parseDishItem(rawItem) {
  let text = rawItem.trim();
  
  // Robust regex for school meal allergy patterns:
  // matches optional '(', then digits and dots, then optional ')', then optional '*' at the end of the line
  const allergyRegex = /(?:\()?([0-9]+(?:\.[0-9]+)*\.?)(?:\)?)\*?$/;
  const match = text.match(allergyRegex);
  
  let dishName = text;
  let allergyNumbers = [];
  
  if (match) {
    const matchedSubstring = match[0]; // e.g. "(5.6)" or "5.6.13."
    const rawNumbers = match[1]; // e.g. "5.6" or "5.6.13."
    
    // Process digits
    allergyNumbers = rawNumbers.split('.')
      .map(n => n.trim())
      .filter(n => n.length > 0 && !isNaN(n));
    
    if (allergyNumbers.length > 0) {
      // Crop dish name by stripping the whole matched allergy substring
      const matchIndex = text.lastIndexOf(matchedSubstring);
      if (matchIndex !== -1) {
        dishName = text.substring(0, matchIndex).trim();
      }
    }
  }
  
  return { dishName, allergyNumbers };
}

// Parse NEIS Nutrient string into a structured Array
function parseNutrientData(rawNutrient) {
  if (!rawNutrient) return [];
  
  let cleanStr = rawNutrient.replace(/&lt;br\s*\/?[a-zA-Z0-9]*&gt;/gi, "\n")
                            .replace(/<br\s*\/?>/gi, "\n")
                            .replace(/&lt;br&gt;/gi, "\n");
                            
  const lines = cleanStr.split("\n");
  const nutrients = [];
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    const parts = line.split(":");
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts[1].trim();
      
      // Select core nutrients for a clean inline display
      if (name.includes("탄수화물") || name.includes("단백질") || name.includes("지방") || 
          name.includes("칼슘") || name.includes("철분") || name.includes("비타민A") ||
          name.includes("티아민") || name.includes("리보플라빈") || name.includes("비타민C")) {
        nutrients.push({ name, val });
      }
    }
  });
  
  return nutrients;
}

// Render dynamic Meal Cards inside meals-grid
function renderMealCards(mealDataList) {
  mealsGrid.innerHTML = "";
  
  // Theme styling configurations
  const mealThemeMap = {
    "조식": { class: "breakfast", icon: "fa-regular fa-sun" },
    "중식": { class: "lunch", icon: "fa-solid fa-utensils" },
    "석식": { class: "dinner", icon: "fa-regular fa-moon" }
  };
  
  const orderMap = { "조식": 1, "중식": 2, "석식": 3 };
  mealDataList.sort((a, b) => (orderMap[a.mealName] || 99) - (orderMap[b.mealName] || 99));

  mealDataList.forEach((meal, index) => {
    const theme = mealThemeMap[meal.mealName] || { class: "lunch", icon: "fa-solid fa-utensils" };
    const emoji = MEAL_EMOJI_MAP[meal.mealName] || "🐿️";
    
    // Process dish list
    let rawDishClean = meal.rawDish.replace(/&lt;br\s*\/?[a-zA-Z0-9]*&gt;/gi, "\n")
                                   .replace(/<br\s*\/?>/gi, "\n")
                                   .replace(/&lt;br&gt;/gi, "\n");
    const dishes = rawDishClean.split("\n").filter(d => d.trim().length > 0);
    
    let dishListHtml = "";
    dishes.forEach(dish => {
      const { dishName, allergyNumbers } = parseDishItem(dish);
      
      let allergyBadgesHtml = "";
      if (allergyNumbers.length > 0) {
        allergyNumbers.forEach(num => {
          const allergyFoodName = ALLERGY_MAP[num] || `알레르기 정보 ${num}`;
          allergyBadgesHtml += `
            <span class="allergy-badge" data-num="${num}">
              ${num}
              <div class="custom-tooltip">${allergyFoodName}</div>
            </span>
          `;
        });
      }
      
      dishListHtml += `
        <li class="dish-item">
          <span class="dish-name">${dishName}</span>
          <div class="allergy-badge-container">
            ${allergyBadgesHtml}
          </div>
        </li>
      `;
    });
    
    // Process nutrient details (Display as inline list separated by commas, matching screenshot)
    const nutrients = parseNutrientData(meal.rawNutrient);
    let footerHtml = "";
    
    if (nutrients.length > 0) {
      // Map name-value pairs to "탄수화물(g) : 84.1, 단백질(g) : 22.5" format
      const nutrientTextString = nutrients.map(n => `${n.name} : ${n.val}`).join(", ");
      
      footerHtml = `
        <div class="meal-footer">
          <div class="nutrient-label">
            <i class="fa-solid fa-circle-info"></i> 영양 성분
          </div>
          <p class="nutrient-text">${nutrientTextString}</p>
        </div>
      `;
    }
    
    // Create neobrutalist card HTML
    const cardHtml = `
      <div class="meal-card ${theme.class}" style="animation: popUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.1}s both;">
        <div class="meal-header">
          <div class="meal-title-group">
            <i class="${theme.icon}"></i>
            <span class="meal-name">${meal.mealName}</span>
          </div>
          <span class="meal-calorie">${meal.calorie} ${emoji}</span>
        </div>
        
        <div class="meal-body">
          <ul class="dish-list">
            ${dishListHtml}
          </ul>
        </div>
        
        ${footerHtml}
      </div>
    `;
    
    mealsGrid.insertAdjacentHTML("beforeend", cardHtml);
  });
}

// Render neobrutalist empty / weekend state
function renderEmptyState(title, subtitle) {
  mealsGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fa-regular fa-face-smile-wink"></i>
      </div>
      <h3>${title}</h3>
      <p>${subtitle}</p>
      <button id="go-next-weekday-btn" class="empty-btn">다음 평일 급식 보기</button>
    </div>
  `;
  
  document.getElementById("go-next-weekday-btn").addEventListener("click", () => {
    const currentDay = activeDate.getDay();
    let daysToShift = 1;
    
    if (currentDay === 5) { // Friday -> shift to Monday
      daysToShift = 3;
    } else if (currentDay === 6) { // Saturday -> shift to Monday
      daysToShift = 2;
    }
    
    navigateDate(daysToShift);
  });
}
