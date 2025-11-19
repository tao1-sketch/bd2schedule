document.addEventListener("DOMContentLoaded", () => {
    loadAllSchedules();
});

let allScheduleData = [];
let currentFilter = { start: null, end: null };

window.setDateFilter = function (start, end) {
    currentFilter.start = start || null;
    currentFilter.end = end || null;
    renderWithCurrentFilter();
};

const groupNames = {
    1: "픽업 일정",
    2: "상점 및 캐릭터 패스",
    3: "PVE",
    4: "PVP"
};

function loadAllSchedules() {
    const main = document.getElementById("main-view");
    fetch("schedule_dirs.json?v=" + Date.now())
        .then(res => {
            if (!res.ok) throw new Error("schedule_dirs.json not found");
            return res.json();
        })
        .then(list => {
            if (!Array.isArray(list) || list.length === 0) {
                main.innerHTML += `
                    <h2 id="schedule-title">일정</h2>
                    <p>schedule_dirs.json 에 이벤트 json 파일 이름을 추가해 주세요.</p>
                `;
                return;
            }

            const promises = list.map(name =>
                fetch(`events/${name}?v=${Date.now()}`)
                    .then(r => {
                        if (!r.ok) throw new Error(`events/${name} 로딩 실패`);
                        return r.json();
                    })
            );

            return Promise.all(promises).then(allArrays => {
                allScheduleData = allArrays.flat().map((item, idx) => ({
                    ...item,
                    __id: idx
                }));;
                const maxEndTime = Math.max(
                    ...allScheduleData
                        .map(item => new Date(item.end))
                        .filter(d => !isNaN(d))
                        .map(d => d.getTime())
                );
                const maxEndDate = new Date(maxEndTime);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const defaultStart = new Date(today);
                defaultStart.setDate(defaultStart.getDate() - 14);
                currentFilter.start = defaultStart.toISOString().slice(0, 10);
                currentFilter.end = maxEndDate.toISOString().slice(0, 10);
                /*if (typeof window._updateDateFilterInputs === "function") {
                    window._updateDateFilterInputs();
                }*/
                renderWithCurrentFilter();
            });
        })
        .catch(err => {
            console.error(err);
            main.innerHTML += `
                <h2 id="schedule-title">일정</h2>
                <p style="color:red;">이벤트 json 목록 또는 내용 로딩에 실패했습니다.</p>
            `;
        });
}

function renderWithCurrentFilter() {
    if (!allScheduleData.length) return;
    let dataToRender = allScheduleData;
    const { start, end } = currentFilter;
    if (start && end) {
        dataToRender = clampAndFilterByDateRange(allScheduleData, start, end);
    }
    renderScheduler(dataToRender, "통합 일정");
}

function clampAndFilterByDateRange(data, startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start) || isNaN(end) || start > end) {
        return data;
    }
    const result = [];
    for (const item of data) {
        const itemStart = new Date(item.start);
        const itemEnd = new Date(item.end);
        if (isNaN(itemStart) || isNaN(itemEnd)) continue;
        if (itemEnd < start || itemStart > end) continue;

        const clampedStart = (itemStart < start ? start : itemStart);
        const clampedEnd = (itemEnd > end ? end : itemEnd);

        result.push({
            ...item,
            start: clampedStart.toISOString().slice(0, 10),
            end: clampedEnd.toISOString().slice(0, 10)
        });
    }
    return result;
}

function dateRange(start, end) {
    const out = [];
    const cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
        out.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}

function allDates(data) {
    const set = new Set();
    data.forEach(i => dateRange(i.start, i.end).forEach(d => set.add(d)));
    return [...set].sort();
}

function renderScheduler(scheduleData, dirName) {
    function getRealColumnWidth() {
        const sample = document.createElement("div");
        sample.className = "schedule-block";
        document.body.appendChild(sample);

        const style = getComputedStyle(sample);
        const w = parseFloat(style.width);
        const ml = parseFloat(style.marginLeft);
        const mr = parseFloat(style.marginRight);

        document.body.removeChild(sample);

        const grid = document.querySelector(".scheduler-grid");
        const gap = grid ? parseFloat(getComputedStyle(grid).columnGap) : 0;

        return w + ml + mr + gap;
    }
    const REAL_COL_WIDTH = getRealColumnWidth();
    document.documentElement.style.setProperty("--col-width", REAL_COL_WIDTH + "px");
    const main = document.getElementById("main-view");
    const oldWrapper = document.getElementById("schedule-wrapper");
    if (oldWrapper) oldWrapper.remove();

    let title = document.getElementById("schedule-title");
    if (!title) {
        title = document.createElement("h2");
        title.id = "schedule-title";
        main.appendChild(title);
    }
    title.textContent = dirName;
    const wrapper = document.createElement("div");
    wrapper.id = "schedule-wrapper";
    wrapper.style.background = "RGB(250,250,250,0.05)";
    wrapper.style.borderRadius = "10px";
    wrapper.style.position = "relative";
    main.appendChild(wrapper);
    if (!scheduleData.length) {
        const msg = document.createElement("p");
        msg.textContent = "선택한 기간에 해당하는 일정이 없습니다.";
        msg.style.padding = "10px 15px";
        wrapper.appendChild(msg);
        return;
    }
    const grouped = {};
    scheduleData.forEach(item => {
        const g = item.group || 1;
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(item);
    });

    const groupIds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    const groupWidths = {};
    groupIds.forEach(g => {
        let maxL = 1;
        grouped[g].forEach(item => {
            if (item.line_index && item.line_index > maxL) maxL = item.line_index;
        });
        groupWidths[g] = maxL;
    });

    let colTemplate = "110px ";
    groupIds.forEach(g => {
        for (let i = 0; i < groupWidths[g]; i++) {
            colTemplate += `${REAL_COL_WIDTH}px `;
        }
    });

    const titleRow = document.createElement("div");
    titleRow.style.display = "grid";
    titleRow.style.gridTemplateColumns = colTemplate;
    titleRow.style.height = "100px";
    titleRow.style.position = "sticky";
    titleRow.style.top = "0";
    titleRow.style.zIndex = "999";

    const dateCell = document.createElement("div");
    dateCell.className = "group-title-cell";
    titleRow.appendChild(dateCell);

    groupIds.forEach((g, idx) => {
        const span = groupWidths[g];
        const cell = document.createElement("div");
        cell.className = "group-title-cell";

        let colStart = 2;
        for (let i = 0; i < idx; i++) {
            colStart += groupWidths[groupIds[i]];
        }
        cell.style.gridColumn = `${colStart} / span ${span}`;
        cell.style.width = (REAL_COL_WIDTH * span) + "px";

        const img = document.createElement("img");
        img.src = `source/group_${g}.png?v=${Date.now()}`;
        img.width = "50";
        img.style.padding = "5px";
        cell.appendChild(img);

        const h2 = document.createElement("h2");
        h2.textContent = groupNames[g] || `Group ${g}`;
        cell.appendChild(h2);

        titleRow.appendChild(cell);
    });
    wrapper.appendChild(titleRow);
    const grid = document.createElement("div");
    grid.className = "scheduler-grid";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = colTemplate;

    const dates = allDates(scheduleData);
    const rowHeight = 40;
    let colnum = 0;

    dates.forEach(d => {
        const dt = new Date(d);
        const dCell = document.createElement("div");
        dCell.className = "date-cell";
        if (dt.getDate() == 1) { dCell.textContent = `${dt.getFullYear()}/`; }
        dCell.textContent += `${dt.getMonth() + 1}/${dt.getDate()}`;

        const today = new Date();
        today.setHours(9, 0, 0, 0);
        const dow = new Date(d).getDay();
        let dtoday = dt.getTime() === today.getTime();

        if (dtoday) {
            dCell.classList.add("today");
        } else if (dow === 6) {
            dCell.classList.add("saturday");
        } else if (dow === 0) {
            dCell.classList.add("sunday");
        } else {
            dCell.classList.add("day");
        }

        grid.appendChild(dCell);

        groupIds.forEach(g => {
            for (let i = 1; i <= groupWidths[g]; i++) {
                const cell = document.createElement("div");
                cell.className = "timeline-area";
                cell.dataset.group = g;
                cell.dataset.line = i;
                if (dtoday) { cell.style.backgroundColor = "#489600"; }
                else if (!(colnum % 2)) { cell.style.backgroundColor = "RGB(55,65,81,0.25)"; }
                grid.appendChild(cell);
            }
        });
        colnum++;
    });
    wrapper.appendChild(grid);
    scheduleData.forEach(item => {
        const startIndex = dates.indexOf(item.start);
        const endIndex = dates.indexOf(item.end);
        if (startIndex === -1 || endIndex === -1) return;

        const length = endIndex - startIndex + 1;
        const g = item.group;
        const line = item.line_index || 1;

        const selector = `.timeline-area[data-group="${g}"][data-line="${line}"]`;
        const cells = grid.querySelectorAll(selector);
        const targetCell = cells[startIndex];
        if (!targetCell) return;
        const block = document.createElement("div");
        block.className = "schedule-block";
        block.textContent = item.title + " " + (item.character || "");
        block.dataset.id = item.__id;
        block.addEventListener("click", (e) => {
            e.stopPropagation();
            openScheduleModal(item.__id);
        });
        const lim = document.createElement("img");
        lim.className = "limited";
        lim.src = "source/limited.png";
        const rer = document.createElement("img");
        rer.className = "rerun";
        rer.src = "source/rerun.png";
        const pow = document.createElement("img");
        pow.className = "powder";
        pow.src = "source/powder.png";
        const gld = document.createElement("img");
        gld.className = "silk";
        gld.src = "source/goldensilk.png";
        const mir = document.createElement("img");
        mir.className = "medal";
        mir.src = "source/mirrormedal.png";
        const pss = document.createElement("img");
        pss.className = "ticket";
        pss.src = "source/passticket.png";
        if (item.limited) {
            block.appendChild(lim);
        }
        if (item.rerun) {
            block.appendChild(rer);
        }
        if (item.background_img) {
            block.style.backgroundImage = `url("source/${item.background_img}?v=${Date.now()}")`;
        } else {
            block.style.backgroundColor = "#374151ce";
        }
        /*if (item.link) {
            block.onclick = () => {
                location.href = item.link;
            };
        }*/
        if (item.contents == "powder") {
            block.appendChild(pow);
        } else if (item.contents == "golden") {
            block.appendChild(gld);
        } else if (item.contents == "mirror") {
            block.appendChild(mir);
        } else if (item.contents == "pass") {
            block.appendChild(pss);
        }

        targetCell.appendChild(block);
        const style = getComputedStyle(block);
        const mt = parseInt(style.marginTop) || 0;
        const mb = parseInt(style.marginBottom) || 0;
        const extra = mt + mb;
        block.style.height = (length * rowHeight - extra) + "px";
    });
}
/* ============================
   모달 보조 함수들
============================ */

// 텍스트 안전하게 표시용
function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 모달 DOM이 없으면 생성, 있으면 재사용
function ensureScheduleModal() {
    let overlay = document.getElementById("schedule-modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "schedule-modal-overlay";
    overlay.className = "schedule-modal-overlay";
    overlay.innerHTML = `
      <div class="schedule-modal-backdrop"></div>
      <div class="schedule-modal-dialog">
        <button type="button" class="schedule-modal-close">×</button>
        <div class="schedule-modal-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
        overlay.classList.remove("is-open");
    };

    overlay.querySelector(".schedule-modal-backdrop").addEventListener("click", close);
    overlay.querySelector(".schedule-modal-close").addEventListener("click", close);

    return overlay;
}

function openScheduleModal(globalId) {
    if (!Array.isArray(allScheduleData) || !allScheduleData.length) return;

    const clicked = allScheduleData.find(ev => ev.__id === globalId);
    if (!clicked) return;

    const ch = clicked.character || "";
    const related = ch
        ? allScheduleData.filter(ev => ev.character === ch)
        : [clicked];
    const overlay = ensureScheduleModal();
    const body = overlay.querySelector(".schedule-modal-body");
    let html = "";
    const titleText = ch || clicked.title || "일정 상세";
    html += `<h2 class="schedule-modal-title">${escapeHtml(titleText)}</h2>`;

    const groups = [
        { key: "",        label: "픽업" },
        { key: "powder",  label: "희망의 가루 상점" },
        { key: "golden",  label: "황금의 실 상점" },
        { key: "mirror",  label: "거울전쟁 상점" }
    ];

    let hasAny = false;

    groups.forEach(({ key, label }) => {
        const list = related.filter(ev => (ev.contents || "") === key);
        if (!list.length) return;
        hasAny = true;
        let tbimg = "";
        if (key == ""){tbimg = "group_1";} else if(key == "powder"){tbimg="powder";}else if(key == "golden"){tbimg="goldensilk";}else if(key == "mirror"){tbimg="mirrormedal";}
        html += `<div style="display: flex; justify-content: center; align-items: center;"><img src="source/${tbimg}.png?v=${Date.now()}" width="30px" height="30px" style="padding: 0 10px 0 0;">`;
        html += `<h2 style="padding: 0 10px 0 0;">${escapeHtml(label)}</h3></div>`;
        html += `
        <table class="schedule-modal-table" width="100%" style="text-align: center;">
            <thead>
            <tr style="border-bottom: 1px solid #E5E7EB; border-top: 1px solid #E5E7EB;">
                <th>일정</th>
                <th>기간</th>
                <th>비고</th>
            </tr>
            </thead>
            <tbody>
        `;

        list.forEach(ev => {
            const isCurrent = ev.__id === clicked.__id;
            const rowClass = isCurrent ? "is-current" : "";
            const name = `${ev.title ? escapeHtml(ev.title) : ""}` + `${ev.character ? " " + escapeHtml(ev.character) : ""}`;
            const period = `${escapeHtml(ev.start || "")} ~ ${escapeHtml(ev.end || "")}`;
            let note = "";
            if ((ev.contents || "") === "") {
                const tags = [];
                if (ev.limited) tags.push("한정");
                if (ev.rerun)  tags.push("복각");
                note = tags.join(", ");
            } /*else {
                note = escapeHtml(ev.contents);
            }*/
            html += `
            <tr class="${rowClass}">
                <td>${name}</td>
                <td>${period}</td>
                <td>${note}</td>
            </tr>
            `;
        });

        html += `
            </tbody>
        </table><br>
        `;
    });

    if (!hasAny) {
        html += `<p>관련 일정이 없습니다.</p>`;
    }
    if (clicked.link) {
        html += `<div class="schedule-modal-section">
                   <button type="button" class="schedule-modal-link-btn">
                     관련 링크(arca.live)
                   </button>
                 </div>`;
    }
    body.innerHTML = html;
    if (clicked.link) {
        const btn = body.querySelector(".schedule-modal-link-btn");
        if (btn) {
            btn.addEventListener("click", () => {
                window.open(clicked.link, "_blank");
            });
        }
    }
    overlay.classList.add("is-open");
}
