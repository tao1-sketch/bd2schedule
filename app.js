const mainView = document.getElementById("main-view");
const sidebarItems = document.querySelectorAll("#sidebar li");

// 네비게이션 포커스 효과
sidebarItems.forEach(li => {
    li.addEventListener("click", () => {
        sidebarItems.forEach(x => x.classList.remove("active"));
        li.classList.add("active");
    });
});

// 페이지 이동 처리
function loadPage(page) {
    if (page === "home") {
        mainView.innerHTML = `<h2>홈</h2><p>여기는 메인 페이지입니다.</p>`;
    }
    if (page === "notice") {
        mainView.innerHTML = `<h2>공지</h2><p>공지 내용이 들어갑니다.</p>`;
    }
    if (page === "settings") {
        mainView.innerHTML = `<h2>설정</h2><p>설정 페이지입니다.</p>`;
    }
    if (page === "schedule") {
        location.href = "schedule/index.html";
    }
}
