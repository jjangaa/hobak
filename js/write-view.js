// 호박(Hobak) 중고거래 웹서비스 - 상품 글쓰기 페이지 모듈 (write-view.js)
(function () {
  const DRAFT_STORAGE_KEY = "hobak_write_draft_v1";
  const MAX_IMAGES = 5;

  const SAMPLE_PHOTOS = [
    {
      label: "🛸 드론/전자기기",
      url: "https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=800&q=80"
    },
    {
      label: "👕 의류",
      url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"
    },
    {
      label: "👜 가방",
      url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80"
    },
    {
      label: "🔊 스피커",
      url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80"
    },
    {
      label: "⛺ 캠핑용품",
      url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const QUICK_PHRASES = [
    "실사용 횟수 적어요",
    "택배/직거래 모두 가능해요",
    "쿨거래 시 네고 가능해요"
  ];

  const DEFAULT_PREVIEW_IMG =
    "https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=800&q=80";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNumberWithCommas(val) {
    const digits = String(val || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("ko-KR");
  }

  function parseRawPrice(val) {
    const digits = String(val || "").replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
  }

  function getShortDong(fullLoc) {
    const parts = String(fullLoc || "울산광역시 동구 방어동").trim().split(/\s+/);
    return parts[parts.length - 1] || "방어동";
  }

  function getDisplayLocation(fullLoc) {
    return String(fullLoc || "울산광역시 동구 방어동").replace("울산광역시", "울산");
  }

  window.HobakWriteView = {
    render(containerEl, callbacks = {}, editingProduct = null) {
      if (!containerEl) return;

      const isEditMode = Boolean(editingProduct && editingProduct.id);

      const dataApi = window.HobakData || {};
      const categories = Array.isArray(dataApi.CATEGORIES) && dataApi.CATEGORIES.length > 0
        ? dataApi.CATEGORIES
        : ["디지털기기", "여성의류", "남성의류", "여성잡화", "생활가전", "취미/게임/음반", "유아동", "기타 중고물품"];

      const neighborhoods = Array.isArray(dataApi.NEIGHBORHOODS) && dataApi.NEIGHBORHOODS.length > 0
        ? dataApi.NEIGHBORHOODS
        : [
            "울산광역시 동구 방어동",
            "울산광역시 동구 화정동",
            "울산광역시 동구 대송동",
            "울산광역시 동구 전하동",
            "울산광역시 동구 일산동"
          ];

      const loggedInNickname =
        (window.HobakAuth && typeof window.HobakAuth.getNickname === "function" && window.HobakAuth.getNickname()) ||
        "호박이웃";

      // 초기 폼 상태 (수정 모드일 경우 해당 게시글 정보 로드, 아니면 임시저장/기본값)
      let state = {
        images: [SAMPLE_PHOTOS[0].url],
        title: "",
        category: categories[0],
        isFree: false,
        price: 209000,
        quickBuy: false,
        fullLocation: neighborhoods[0],
        sellerNickname: loggedInNickname,
        mannerTemp: 37.5,
        description: ""
      };

      if (isEditMode) {
        const matchedLoc =
          neighborhoods.find((n) => n.endsWith(editingProduct.location || "방어동")) ||
          editingProduct.fullLocation ||
          neighborhoods[0];
        state = {
          images:
            Array.isArray(editingProduct.images) && editingProduct.images.length > 0
              ? [...editingProduct.images]
              : [SAMPLE_PHOTOS[0].url],
          title: editingProduct.title || "",
          category: editingProduct.category || categories[0],
          isFree: Boolean(editingProduct.isFree || Number(editingProduct.price) === 0),
          price: Number(editingProduct.price) || 0,
          quickBuy: Boolean(editingProduct.quickBuy),
          fullLocation: matchedLoc,
          sellerNickname: editingProduct.seller?.nickname || loggedInNickname,
          mannerTemp: Number(editingProduct.seller?.mannerTemp) || 37.5,
          description: editingProduct.description || ""
        };
      } else {
        try {
          const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            if (parsed && typeof parsed === "object") {
              state = {
                ...state,
                ...parsed,
                sellerNickname: loggedInNickname,
                images: Array.isArray(parsed.images) && parsed.images.length > 0
                  ? parsed.images.slice(0, MAX_IMAGES)
                  : state.images
              };
            }
          }
        } catch (e) {
          console.warn("임시저장 데이터 로드 실패", e);
        }
      }

      containerEl.innerHTML = `
        <div class="hobak-write-wrapper">
          <!-- 상단 헤더 바 -->
          <header class="hobak-write-topbar">
            <button type="button" class="hobak-write-back-btn" id="hobakWriteCancelBtn">
              <span>←</span> 목록으로 돌아가기
            </button>
            <h1 class="hobak-write-topbar-title">
              <span>${isEditMode ? "✏️" : "🎃"}</span> ${
                isEditMode ? "내 게시글 수정하기" : "내 물건 팔기 (상품 등록)"
              }
            </h1>
            <div class="hobak-write-topbar-actions">
              <button type="button" class="hobak-write-draft-btn" id="hobakWriteDraftBtn">
                임시저장
              </button>
              <button type="button" class="hobak-write-submit-btn" id="hobakWriteTopSubmitBtn">
                ${isEditMode ? "수정 완료" : "등록하기"}
              </button>
            </div>
          </header>

          <!-- 안내/검증 토스트 배너 -->
          <div class="hobak-write-toast" id="hobakWriteToast" role="alert">
            <span id="hobakWriteToastMsg"></span>
            <button type="button" id="hobakWriteToastClose" style="background:none;border:none;font-weight:800;cursor:pointer;color:inherit;">✕</button>
          </div>

          <!-- 좌우 2단 레이아웃 -->
          <div class="hobak-write-grid">
            <!-- 좌측: 상품 정보 입력 폼 -->
            <form class="hobak-write-form-card" id="hobakWriteForm" novalidate>
              <!-- 1. 상품 사진 등록 (최대 5장) -->
              <section class="hobak-write-section">
                <div class="hobak-write-label-row">
                  <label class="hobak-write-label">
                    상품 사진 등록 <span class="hobak-write-required">*</span>
                  </label>
                  <span class="hobak-write-subhint">첫 번째 사진이 대표 이미지로 설정됩니다 (최대 5장)</span>
                </div>

                <div class="hobak-write-photo-row">
                  <label class="hobak-write-upload-box" for="hobakWriteFileInput" title="내 PC에서 사진 선택">
                    <span class="hobak-write-upload-icon">📷</span>
                    <span class="hobak-write-upload-count">
                      <strong id="hobakWriteImgCount">${state.images.length}</strong>/${MAX_IMAGES}
                    </span>
                  </label>
                  <input
                    type="file"
                    id="hobakWriteFileInput"
                    class="hobak-write-file-input"
                    accept="image/*"
                    multiple
                  />
                  <div class="hobak-write-thumb-list" id="hobakWriteThumbList"></div>
                </div>

                <div class="hobak-write-url-bar">
                  <input
                    type="url"
                    id="hobakWriteUrlInput"
                    class="hobak-write-input"
                    placeholder="이미지 URL을 직접 붙여넣어 추가할 수도 있어요 (https://...)"
                  />
                  <button type="button" class="hobak-write-url-add-btn" id="hobakWriteUrlAddBtn">
                    + URL 추가
                  </button>
                </div>

                <div class="hobak-write-sample-box">
                  <span class="hobak-write-sample-label">✨ 원클릭 추천 샘플 사진:</span>
                  ${SAMPLE_PHOTOS.map(
                    (sample, idx) => `
                    <button
                      type="button"
                      class="hobak-write-sample-chip"
                      data-sample-index="${idx}"
                    >
                      ${escapeHtml(sample.label)}
                    </button>
                  `
                  ).join("")}
                </div>
              </section>

              <!-- 2. 글 제목 -->
              <section class="hobak-write-section">
                <div class="hobak-write-label-row">
                  <label class="hobak-write-label" for="hobakWriteTitleInput">
                    글 제목 <span class="hobak-write-required">*</span>
                  </label>
                  <span class="hobak-write-subhint" id="hobakWriteTitleLen">0 / 60자</span>
                </div>
                <input
                  type="text"
                  id="hobakWriteTitleInput"
                  class="hobak-write-input"
                  maxlength="60"
                  placeholder="예: RadioMaster Zorro 조종기 및 드론 부품 세트"
                  value="${escapeHtml(state.title)}"
                  required
                />
              </section>

              <!-- 3. 카테고리 선택 -->
              <section class="hobak-write-section">
                <div class="hobak-write-label-row">
                  <label class="hobak-write-label">
                    카테고리 선택 <span class="hobak-write-required">*</span>
                  </label>
                  <span class="hobak-write-subhint">알맞은 카테고리를 선택하면 이웃들이 더 빨리 찾아요</span>
                </div>
                <div class="hobak-write-category-pills" id="hobakWriteCategoryPills">
                  ${categories
                    .map(
                      (cat) => `
                    <button
                      type="button"
                      class="hobak-write-cat-pill ${cat === state.category ? "active" : ""}"
                      data-category="${escapeHtml(cat)}"
                    >
                      ${escapeHtml(cat)}
                    </button>
                  `
                    )
                    .join("")}
                </div>
              </section>

              <!-- 4. 거래 방식 및 가격 -->
              <section class="hobak-write-section">
                <div class="hobak-write-label-row">
                  <label class="hobak-write-label" for="hobakWritePriceInput">
                    거래 방식 및 가격 <span class="hobak-write-required">*</span>
                  </label>
                  <span class="hobak-write-subhint">나눔하기 선택 시 0원(무료 나눔)으로 설정됩니다</span>
                </div>

                <div class="hobak-write-trade-modes">
                  <button
                    type="button"
                    class="hobak-write-mode-btn ${!state.isFree ? "active" : ""}"
                    id="hobakModeSellBtn"
                  >
                    💰 판매하기
                  </button>
                  <button
                    type="button"
                    class="hobak-write-mode-btn ${state.isFree ? "active" : ""}"
                    id="hobakModeFreeBtn"
                  >
                    🧡 나눔하기(무료)
                  </button>
                </div>

                <div class="hobak-write-price-row">
                  <div class="hobak-write-price-input-wrap">
                    <span class="hobak-write-currency-symbol">₩</span>
                    <input
                      type="text"
                      inputmode="numeric"
                      id="hobakWritePriceInput"
                      class="hobak-write-input hobak-write-price-input"
                      placeholder="가격을 입력해주세요"
                      value="${state.isFree ? "0" : formatNumberWithCommas(state.price)}"
                      ${state.isFree ? "disabled" : ""}
                    />
                    <span class="hobak-write-price-unit">원</span>
                  </div>

                  <label class="hobak-write-quickbuy-label">
                    <input
                      type="checkbox"
                      id="hobakWriteQuickBuyCheck"
                      ${state.quickBuy ? "checked" : ""}
                    />
                    <span>🎃 바로구매 허용</span>
                  </label>
                </div>
              </section>

              <!-- 5. 거래 희망 동네 & 판매자 정보 -->
              <section class="hobak-write-section">
                <div class="hobak-write-label-row">
                  <label class="hobak-write-label">
                    거래 희망 동네 &amp; 판매자 정보
                  </label>
                  <span class="hobak-write-subhint">기본 매너온도 ${state.mannerTemp.toFixed(1)}°C 😊</span>
                </div>

                <div class="hobak-write-two-col">
                  <div>
                    <label class="hobak-write-subhint" for="hobakWriteLocationSelect" style="display:block;margin-bottom:6px;">
                      📍 거래 희망 동네
                    </label>
                    <select id="hobakWriteLocationSelect" class="hobak-write-select">
                      ${neighborhoods
                        .map(
                          (dong) => `
                        <option value="${escapeHtml(dong)}" ${dong === state.fullLocation ? "selected" : ""}>
                          ${escapeHtml(dong)} (${escapeHtml(getShortDong(dong))})
                        </option>
                      `
                        )
                        .join("")}
                    </select>
                  </div>

                  <div>
                    <label class="hobak-write-subhint" for="hobakWriteSellerInput" style="display:block;margin-bottom:6px;">
                      🙂 판매자 닉네임 (매너온도 37.5°C)
                    </label>
                    <input
                      type="text"
                      id="hobakWriteSellerInput"
                      class="hobak-write-input"
                      maxlength="20"
                      placeholder="호박이웃"
                      value="${escapeHtml(state.sellerNickname)}"
                    />
                  </div>
                </div>
              </section>

              <!-- 6. 자세한 설명 (본문) -->
              <section class="hobak-write-section">
                <div class="hobak-write-label-row">
                  <label class="hobak-write-label" for="hobakWriteDescInput">
                    자세한 설명 <span class="hobak-write-required">*</span>
                  </label>
                  <span class="hobak-write-subhint">자주 쓰는 문구 칩을 클릭하면 본문에 바로 추가됩니다</span>
                </div>

                <div class="hobak-write-phrase-bar">
                  ${QUICK_PHRASES.map(
                    (phrase) => `
                    <button
                      type="button"
                      class="hobak-write-phrase-chip"
                      data-phrase="${escapeHtml(phrase)}"
                    >
                      + ${escapeHtml(phrase)}
                    </button>
                  `
                  ).join("")}
                </div>

                <textarea
                  id="hobakWriteDescInput"
                  class="hobak-write-textarea"
                  placeholder="울산 동구 이웃들에게 물품의 구매 시기, 사용감, 직거래 가능 장소 등을 자세히 적어주세요. 신뢰할 수 있는 거래를 위해 상세히 작성해 주시면 좋아요!"
                >${escapeHtml(state.description)}</textarea>

                <div class="hobak-write-bottom-submit">
                  <button type="button" class="hobak-write-back-btn" id="hobakWriteBottomCancelBtn">
                    취소
                  </button>
                  <button type="submit" class="hobak-write-submit-btn">
                    🎃 상품 등록 완료하기
                  </button>
                </div>
              </section>
            </form>

            <!-- 우측: 실시간 상품 상세페이지 미리보기 패널 -->
            <aside class="hobak-write-preview-panel" aria-label="실시간 상품 상세페이지 미리보기">
              <div class="hobak-write-preview-header">
                <span class="hobak-write-preview-badge">
                  <span class="hobak-write-preview-live-dot"></span>
                  실시간 상세페이지 미리보기 (Live Preview)
                </span>
                <span class="hobak-write-preview-sub">입력 즉시 반영</span>
              </div>

              <div class="hobak-write-preview-body">
                <!-- 대표 이미지 프리뷰 -->
                <div class="hobak-preview-image-frame">
                  <img
                    id="hobakPreviewMainImg"
                    src="${escapeHtml(state.images[0] || DEFAULT_PREVIEW_IMG)}"
                    alt="상품 대표 이미지 미리보기"
                  />
                  <span
                    class="hobak-preview-quickbuy-tag"
                    id="hobakPreviewQuickBuyTag"
                    style="display: ${state.quickBuy ? "inline-block" : "none"};"
                  >
                    🎃 바로구매
                  </span>
                  <span class="hobak-preview-img-counter" id="hobakPreviewImgCounter">
                    1 / ${Math.max(1, state.images.length)}
                  </span>
                </div>

                <!-- 판매자 프로필 바 (상세 페이지와 동일 구조) -->
                <div class="hobak-preview-seller-bar">
                  <div class="hobak-preview-seller-left">
                    <div class="hobak-preview-avatar">🎃</div>
                    <div>
                      <div class="hobak-preview-seller-name" id="hobakPreviewSellerName">
                        ${escapeHtml(state.sellerNickname || "호박이웃")}
                      </div>
                      <div class="hobak-preview-seller-loc" id="hobakPreviewSellerLoc">
                        ${escapeHtml(getDisplayLocation(state.fullLocation))}
                      </div>
                    </div>
                  </div>
                  <div class="hobak-preview-manner-box">
                    <div class="hobak-preview-manner-temp" id="hobakPreviewMannerTemp">
                      ${state.mannerTemp.toFixed(1)}°C 😊
                    </div>
                    <div class="hobak-preview-manner-bar-bg">
                      <div class="hobak-preview-manner-bar-fill"></div>
                    </div>
                    <div class="hobak-preview-manner-label">매너온도</div>
                  </div>
                </div>

                <!-- 상세 정보 프리뷰 -->
                <div class="hobak-preview-breadcrumb" id="hobakPreviewBreadcrumb">
                  홈 &gt; 중고거래 &gt; ${escapeHtml(state.category)}
                </div>
                <h2 class="hobak-preview-title" id="hobakPreviewTitle">
                  ${escapeHtml(state.title || "상품 제목을 입력해 주세요")}
                </h2>
                <div class="hobak-preview-meta" id="hobakPreviewMeta">
                  ${escapeHtml(state.category)} · 방금 전
                </div>
                <div
                  class="hobak-preview-price ${state.isFree ? "is-free" : ""}"
                  id="hobakPreviewPrice"
                >
                  ${state.isFree ? "나눔 🧡" : `${Number(state.price || 0).toLocaleString("ko-KR")}원`}
                </div>
                <div class="hobak-preview-desc" id="hobakPreviewDesc"></div>
                <div class="hobak-preview-stats">
                  채팅 0 · 관심 0 · 조회 1
                </div>
                <button type="button" class="hobak-preview-cta" id="hobakPreviewCtaBtn">
                  ${state.quickBuy ? "🎃 바로구매 가능 · 호박채팅하기" : "호박채팅하기"}
                </button>
              </div>
            </aside>
          </div>
        </div>
      `;

      // DOM 참조
      const formEl = containerEl.querySelector("#hobakWriteForm");
      const toastEl = containerEl.querySelector("#hobakWriteToast");
      const toastMsgEl = containerEl.querySelector("#hobakWriteToastMsg");
      const toastCloseBtn = containerEl.querySelector("#hobakWriteToastClose");

      const fileInputEl = containerEl.querySelector("#hobakWriteFileInput");
      const imgCountEl = containerEl.querySelector("#hobakWriteImgCount");
      const thumbListEl = containerEl.querySelector("#hobakWriteThumbList");
      const urlInputEl = containerEl.querySelector("#hobakWriteUrlInput");
      const urlAddBtn = containerEl.querySelector("#hobakWriteUrlAddBtn");

      const titleInputEl = containerEl.querySelector("#hobakWriteTitleInput");
      const titleLenEl = containerEl.querySelector("#hobakWriteTitleLen");
      const catPillsWrap = containerEl.querySelector("#hobakWriteCategoryPills");

      const modeSellBtn = containerEl.querySelector("#hobakModeSellBtn");
      const modeFreeBtn = containerEl.querySelector("#hobakModeFreeBtn");
      const priceInputEl = containerEl.querySelector("#hobakWritePriceInput");
      const quickBuyCheckEl = containerEl.querySelector("#hobakWriteQuickBuyCheck");

      const locationSelectEl = containerEl.querySelector("#hobakWriteLocationSelect");
      const sellerInputEl = containerEl.querySelector("#hobakWriteSellerInput");
      const descInputEl = containerEl.querySelector("#hobakWriteDescInput");

      // 프리뷰 DOM 참조
      const previewMainImg = containerEl.querySelector("#hobakPreviewMainImg");
      const previewQuickBuyTag = containerEl.querySelector("#hobakPreviewQuickBuyTag");
      const previewImgCounter = containerEl.querySelector("#hobakPreviewImgCounter");
      const previewSellerName = containerEl.querySelector("#hobakPreviewSellerName");
      const previewSellerLoc = containerEl.querySelector("#hobakPreviewSellerLoc");
      const previewBreadcrumb = containerEl.querySelector("#hobakPreviewBreadcrumb");
      const previewTitle = containerEl.querySelector("#hobakPreviewTitle");
      const previewMeta = containerEl.querySelector("#hobakPreviewMeta");
      const previewPrice = containerEl.querySelector("#hobakPreviewPrice");
      const previewDesc = containerEl.querySelector("#hobakPreviewDesc");
      const previewCtaBtn = containerEl.querySelector("#hobakPreviewCtaBtn");

      let toastTimer = null;
      function showToast(message, type = "error") {
        if (!toastEl || !toastMsgEl) return;
        toastEl.className = `hobak-write-toast show ${type}`;
        toastMsgEl.textContent = message;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          toastEl.classList.remove("show");
        }, 4000);
      }

      if (toastCloseBtn) {
        toastCloseBtn.addEventListener("click", () => {
          toastEl.classList.remove("show");
        });
      }

      // 썸네일 렌더링
      function renderThumbnails() {
        imgCountEl.textContent = String(state.images.length);
        thumbListEl.innerHTML = state.images
          .map(
            (imgUrl, index) => `
            <div class="hobak-write-thumb-item ${index === 0 ? "is-main" : ""}" data-thumb-idx="${index}" title="${
              index === 0 ? "대표 이미지" : "클릭 시 대표 이미지로 변경"
            }">
              <img src="${escapeHtml(imgUrl)}" alt="업로드 사진 ${index + 1}" />
              ${index === 0 ? '<span class="hobak-write-thumb-badge">대표 사진</span>' : ""}
              <button
                type="button"
                class="hobak-write-thumb-remove"
                data-remove-idx="${index}"
                aria-label="사진 삭제"
              >✕</button>
            </div>
          `
          )
          .join("");
      }

      // 실시간 프리뷰 동기화
      function syncLivePreview() {
        const mainImgUrl = state.images[0] || DEFAULT_PREVIEW_IMG;
        previewMainImg.src = mainImgUrl;
        previewImgCounter.textContent = state.images.length > 0
          ? `1 / ${state.images.length}`
          : "0 / 0";
        previewQuickBuyTag.style.display = state.quickBuy ? "inline-block" : "none";

        const sellerName = (state.sellerNickname || "").trim() || "호박이웃";
        previewSellerName.textContent = sellerName;
        previewSellerLoc.textContent = getDisplayLocation(state.fullLocation);

        previewBreadcrumb.textContent = `홈 > 중고거래 > ${state.category}`;
        previewTitle.textContent = (state.title || "").trim() || "상품 제목을 입력해 주세요";
        previewMeta.textContent = `${state.category} · 방금 전`;

        if (state.isFree || Number(state.price) === 0) {
          previewPrice.textContent = "나눔 🧡";
          previewPrice.classList.add("is-free");
        } else {
          previewPrice.textContent = `${Number(state.price || 0).toLocaleString("ko-KR")}원`;
          previewPrice.classList.remove("is-free");
        }

        const shortDong = getShortDong(state.fullLocation);
        const defaultDescPlaceholder = `${shortDong} 이웃들에게 보여줄 자세한 상품 설명이 이 영역에 실시간으로 표시됩니다.`;
        previewDesc.textContent = (state.description || "").trim() || defaultDescPlaceholder;

        previewCtaBtn.textContent = state.quickBuy
          ? "🎃 바로구매 가능 · 호박채팅하기"
          : "호박채팅하기";

        titleLenEl.textContent = `${(state.title || "").length} / 60자`;
      }

      // 이미지 추가 헬퍼
      function addImageUrl(url) {
        const trimmed = String(url || "").trim();
        if (!trimmed) return;
        if (state.images.length >= MAX_IMAGES) {
          showToast(`상품 사진은 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`, "error");
          return;
        }
        state.images.push(trimmed);
        renderThumbnails();
        syncLivePreview();
      }

      // 1) 로컬 파일 업로드 (FileReader DataURL)
      fileInputEl.addEventListener("change", (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const remaining = MAX_IMAGES - state.images.length;
        if (remaining <= 0) {
          showToast(`상품 사진은 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`, "error");
          fileInputEl.value = "";
          return;
        }

        const slice = files.slice(0, remaining);
        slice.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            const result = loadEvent.target && loadEvent.target.result;
            if (result && state.images.length < MAX_IMAGES) {
              state.images.push(String(result));
              renderThumbnails();
              syncLivePreview();
            }
          };
          reader.readAsDataURL(file);
        });

        fileInputEl.value = "";
      });

      // 2) 이미지 URL 직접 추가
      urlAddBtn.addEventListener("click", () => {
        const url = urlInputEl.value.trim();
        if (!url) {
          showToast("추가할 이미지 URL을 입력해 주세요.", "error");
          urlInputEl.focus();
          return;
        }
        addImageUrl(url);
        urlInputEl.value = "";
      });

      urlInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          urlAddBtn.click();
        }
      });

      // 3) 원클릭 추천 샘플 사진 선택
      containerEl.querySelectorAll(".hobak-write-sample-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const idx = Number(chip.getAttribute("data-sample-index"));
          const sample = SAMPLE_PHOTOS[idx];
          if (!sample) return;
          if (state.images.length >= MAX_IMAGES) {
            // 이미 5장이면 대표 이미지(첫 번째)를 교체하여 즉시 프리뷰에서 확인할 수 있게 지원
            state.images[0] = sample.url;
            renderThumbnails();
            syncLivePreview();
            showToast(`대표 사진을 '${sample.label}' 샘플 이미지로 변경했어요!`, "success");
          } else {
            addImageUrl(sample.url);
          }
        });
      });

      // 4) 썸네일 삭제(`✕`) 및 대표 사진 변경
      thumbListEl.addEventListener("click", (e) => {
        const removeBtn = e.target.closest("[data-remove-idx]");
        if (removeBtn) {
          e.stopPropagation();
          const idx = Number(removeBtn.getAttribute("data-remove-idx"));
          if (!Number.isNaN(idx)) {
            state.images.splice(idx, 1);
            renderThumbnails();
            syncLivePreview();
          }
          return;
        }

        const thumbItem = e.target.closest("[data-thumb-idx]");
        if (thumbItem) {
          const idx = Number(thumbItem.getAttribute("data-thumb-idx"));
          if (idx > 0 && idx < state.images.length) {
            const [picked] = state.images.splice(idx, 1);
            state.images.unshift(picked);
            renderThumbnails();
            syncLivePreview();
          }
        }
      });

      // 5) 제목 실시간 입력
      titleInputEl.addEventListener("input", () => {
        state.title = titleInputEl.value;
        syncLivePreview();
      });

      // 6) 카테고리 알약 선택
      catPillsWrap.addEventListener("click", (e) => {
        const pill = e.target.closest("[data-category]");
        if (!pill) return;
        const selectedCat = pill.getAttribute("data-category");
        if (!selectedCat) return;
        state.category = selectedCat;
        catPillsWrap.querySelectorAll(".hobak-write-cat-pill").forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-category") === selectedCat);
        });
        syncLivePreview();
      });

      // 7) 판매하기 / 나눔하기(무료) 토글 및 가격 포맷
      modeSellBtn.addEventListener("click", () => {
        state.isFree = false;
        modeSellBtn.classList.add("active");
        modeFreeBtn.classList.remove("active");
        priceInputEl.disabled = false;
        if (!state.price || state.price === 0) {
          state.price = 10000;
        }
        priceInputEl.value = formatNumberWithCommas(state.price);
        syncLivePreview();
      });

      modeFreeBtn.addEventListener("click", () => {
        state.isFree = true;
        state.price = 0;
        modeFreeBtn.classList.add("active");
        modeSellBtn.classList.remove("active");
        priceInputEl.value = "0";
        priceInputEl.disabled = true;
        syncLivePreview();
      });

      priceInputEl.addEventListener("input", () => {
        const raw = parseRawPrice(priceInputEl.value);
        state.price = raw;
        priceInputEl.value = raw > 0 ? formatNumberWithCommas(raw) : "";
        syncLivePreview();
      });

      quickBuyCheckEl.addEventListener("change", () => {
        state.quickBuy = quickBuyCheckEl.checked;
        syncLivePreview();
      });

      // 8) 동네 & 판매자 닉네임
      locationSelectEl.addEventListener("change", () => {
        state.fullLocation = locationSelectEl.value;
        syncLivePreview();
      });

      sellerInputEl.addEventListener("input", () => {
        state.sellerNickname = sellerInputEl.value;
        syncLivePreview();
      });

      // 9) 본문 설명 및 자주 쓰는 문구 자동완성 칩
      descInputEl.addEventListener("input", () => {
        state.description = descInputEl.value;
        syncLivePreview();
      });

      containerEl.querySelectorAll(".hobak-write-phrase-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const phrase = chip.getAttribute("data-phrase");
          if (!phrase) return;
          const current = descInputEl.value.trim();
          descInputEl.value = current ? `${current}\n• ${phrase}` : `• ${phrase}`;
          state.description = descInputEl.value;
          descInputEl.focus();
          syncLivePreview();
        });
      });

      // 10) 취소(목록으로 돌아가기) 버튼
      const handleCancel = () => {
        if (typeof callbacks.onCancel === "function") {
          callbacks.onCancel();
        }
      };

      const cancelBtnTop = containerEl.querySelector("#hobakWriteCancelBtn");
      const cancelBtnBottom = containerEl.querySelector("#hobakWriteBottomCancelBtn");
      if (cancelBtnTop) cancelBtnTop.addEventListener("click", handleCancel);
      if (cancelBtnBottom) cancelBtnBottom.addEventListener("click", handleCancel);

      // 11) 임시저장 버튼
      const draftBtn = containerEl.querySelector("#hobakWriteDraftBtn");
      if (draftBtn) {
        draftBtn.addEventListener("click", () => {
          try {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
            showToast("작성 중인 상품 정보가 안전하게 임시저장되었습니다! 🎃", "success");
          } catch (e) {
            showToast("임시저장 중 오류가 발생했습니다.", "error");
          }
        });
      }

      // 12) 폼 제출 처리
      function handleSubmit(e) {
        if (e) e.preventDefault();

        const trimmedTitle = (state.title || "").trim();
        if (!trimmedTitle) {
          showToast("글 제목을 입력해 주세요! (예: RadioMaster Zorro 조종기 및 드론 부품 세트)", "error");
          titleInputEl.focus();
          return;
        }

        if (!state.isFree && (!state.price || Number(state.price) <= 0)) {
          showToast("판매 가격을 입력해 주세요. 무료로 나누고 싶다면 '나눔하기(무료)'를 선택해 주세요!", "error");
          priceInputEl.focus();
          return;
        }

        const trimmedDesc = (state.description || "").trim();
        if (!trimmedDesc) {
          showToast("이웃들이 물건 상태를 알 수 있도록 자세한 설명을 한 줄 이상 작성해 주세요!", "error");
          descInputEl.focus();
          return;
        }

        const shortDong = getShortDong(state.fullLocation);
        const payload = {
          title: trimmedTitle,
          price: state.isFree ? 0 : Number(state.price) || 0,
          isFree: Boolean(state.isFree),
          location: shortDong,
          fullLocation: state.fullLocation,
          category: state.category,
          status: "판매중",
          quickBuy: Boolean(state.quickBuy),
          sellerNickname: (state.sellerNickname || "").trim() || "호박이웃",
          mannerTemp: Number(state.mannerTemp) || 37.5,
          images: state.images.length > 0 ? [...state.images] : [DEFAULT_PREVIEW_IMG],
          description: trimmedDesc
        };

        if (isEditMode && window.HobakData && typeof window.HobakData.updateProduct === "function") {
          const updated = window.HobakData.updateProduct(editingProduct.id, payload);
          if (typeof callbacks.onSubmitSuccess === "function") {
            callbacks.onSubmitSuccess(updated || { ...editingProduct, ...payload });
          }
          return;
        }

        const created =
          window.HobakData && typeof window.HobakData.addProduct === "function"
            ? window.HobakData.addProduct(payload)
            : payload;

        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (err) {
          // ignore
        }

        if (typeof callbacks.onSubmitSuccess === "function") {
          callbacks.onSubmitSuccess(created);
        }
      }

      formEl.addEventListener("submit", handleSubmit);
      const topSubmitBtn = containerEl.querySelector("#hobakWriteTopSubmitBtn");
      if (topSubmitBtn) {
        topSubmitBtn.addEventListener("click", handleSubmit);
      }

      // 초기 썸네일 & 프리뷰 렌더링
      renderThumbnails();
      syncLivePreview();
    }
  };
})();
