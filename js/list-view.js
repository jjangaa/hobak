// ==========================================================================
// 호박(Hobak) 중고거래 웹서비스 - 상품 목록 페이지 모듈 (js/list-view.js)
// ==========================================================================

(function () {
  const EXTRA_MATCHING_KEYWORDS = ["조종기", "우비", "니트", "스피커", "스타벅스", "프라다", "나눔"];

  const HobakListView = {
    callbacks: {
      onSelectProduct: null,
      onOpenWrite: null,
      onResetData: null,
      onFilterChange: null,
      onKeywordClick: null
    },

    containers: {
      header: null,
      list: null,
      popular: null,
      footer: null
    },

    state: {
      searchQuery: "",
      selectedNeighborhood: "울산광역시 동구 방어동",
      strictDongOnly: false, // 기본값 false: 방어동 선택 시 울산 동구 인근(방어동/화정동/대송동) 10개 전체 표시
      selectedCategory: "전체",
      onlyAvailable: false,
      statusFilter: "전체", // "전체" | "거래완료" | "판매중" | "예약중" | "내게시글"
      filterDrawerOpen: false,
      selectedProductId: 1,
      currentPage: 1,
      activeServiceTab: "중고거래",
      showMoreKeywords: false
    },

    /**
     * 초기화 및 콜백 바인딩
     * @param {Object} callbacks - { onSelectProduct(productId, product), onOpenWrite(), onResetData(), onFilterChange(state) }
     */
    init(callbacks = {}) {
      this.callbacks = {
        ...this.callbacks,
        ...callbacks
      };
      this.ensureToastElement();
      return this;
    },

    /**
     * 컨테이너 요소 해석 헬퍼
     */
    resolveContainer(containerOrSelector, fallbackSelector) {
      if (containerOrSelector instanceof HTMLElement) {
        return containerOrSelector;
      }
      if (typeof containerOrSelector === "string") {
        return document.querySelector(containerOrSelector);
      }
      if (fallbackSelector) {
        return document.querySelector(fallbackSelector);
      }
      return null;
    },

    /**
     * HTML 이스케이프 헬퍼
     */
    escapeHtml(str) {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    /**
     * 가격 표시 포맷팅 (예: 209,000원, 나눔일 경우 나눔)
     */
    formatCardPrice(product) {
      if (!product) return "0원";
      if (product.isFree || Number(product.price) === 0) {
        return "나눔";
      }
      return `${Number(product.price).toLocaleString("ko-KR")}원`;
    },

    /**
     * 현재 선택된 동네에서 짧은 동 이름 추출 (예: "울산광역시 동구 방어동" -> "방어동")
     */
    getShortDong(fullNeighborhood) {
      const target = fullNeighborhood || this.state.selectedNeighborhood || "울산광역시 동구 방어동";
      const parts = target.trim().split(/\s+/);
      return parts[parts.length - 1] || "방어동";
    },

    /**
     * 조건에 따라 필터링된 상품 목록 반환
     */
    getFilteredProducts(sourceProducts) {
      const allProducts = Array.isArray(sourceProducts)
        ? sourceProducts
        : (window.HobakData ? window.HobakData.getProducts() : []);

      const query = (this.state.searchQuery || "").trim().toLowerCase();
      const category = this.state.selectedCategory || "전체";
      const onlyAvailable = Boolean(this.state.onlyAvailable);
      const statusFilter = this.state.statusFilter || "전체";
      const strictDongOnly = Boolean(this.state.strictDongOnly);
      const shortDong = this.getShortDong(this.state.selectedNeighborhood);
      const loggedInNick =
        (window.HobakAuth && typeof window.HobakAuth.getNickname === "function" && window.HobakAuth.getNickname()) ||
        "";

      return allProducts.filter((product) => {
        // 1. 요구사항 3 반영: '거래 가능 보기' 옵션 선택 시 거래 완료된 글(status === "거래완료")만 확인
        if (onlyAvailable && product.status !== "거래완료") {
          return false;
        }

        // 1-2. 상태별 빠른 필터 탭 ("판매중" / "예약중" / "거래완료" / "내게시글")
        if (!onlyAvailable && statusFilter && statusFilter !== "전체") {
          if (statusFilter === "내게시글") {
            const isSimOwner =
              typeof sessionStorage !== "undefined" &&
              sessionStorage.getItem(`hobak_owner_override_${product.id}`) === "1";
            const isMyNick =
              loggedInNick &&
              product.seller?.nickname &&
              loggedInNick.trim().toLowerCase() === String(product.seller.nickname).trim().toLowerCase();
            if (!isSimOwner && !isMyNick) return false;
          } else if (product.status !== statusFilter) {
            return false;
          }
        }

        // 2. 카테고리 필터
        if (category && category !== "전체" && product.category !== category) {
          return false;
        }

        // 3. 동네 필터 (선택 동네만 보기 옵션이 켜진 경우 해당 동만 필터링)
        if (strictDongOnly && shortDong && product.location !== shortDong) {
          return false;
        }

        // 4. 검색어 필터 (제목, 설명, 카테고리, 동네, 가격/나눔 매칭)
        if (query) {
          const titleMatch = (product.title || "").toLowerCase().includes(query);
          const descMatch = (product.description || "").toLowerCase().includes(query);
          const catMatch = (product.category || "").toLowerCase().includes(query);
          const locMatch = (product.location || "").toLowerCase().includes(query);
          const freeMatch = query === "나눔" && (product.isFree || Number(product.price) === 0);
          return titleMatch || descMatch || catMatch || locMatch || freeMatch;
        }

        return true;
      });
    },

    /**
     * 1. 상단 헤더 렌더링 (로고 + 둥근 검색창 + 물건 팔기 버튼 + 서비스 카테고리 탭 바)
     */
    renderHeader(containerEl) {
      const container = this.resolveContainer(containerEl, "#header-container, #hobak-header, header");
      if (!container) return;
      this.containers.header = container;

      const serviceTabs = [
        { id: "전체", label: "전체", icon: "🔍" },
        { id: "중고거래", label: "중고거래", icon: "🛍️" },
        { id: "동네업체", label: "동네업체", icon: "🏪" },
        { id: "중고차", label: "중고차", icon: "🚗" },
        { id: "동네생활", label: "동네생활", icon: "📋" },
        { id: "더보기", label: "더보기 ∨", icon: "" }
      ];

      const currentQuery = this.escapeHtml(this.state.searchQuery);

      container.innerHTML = `
        <div class="hobak-header-wrap">
          <div class="hobak-header-inner">
            <div class="hobak-header-top">
              <!-- 호박 브랜드 로고 (감각적인 주황 호박 + 초록 꼭지 SVG) -->
              <button type="button" class="hobak-brand-logo" id="hobak-logo-btn" title="호박 홈으로 이동">
                <svg class="hobak-logo-svg" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <!-- 초록 꼭지와 잎사귀 -->
                  <path d="M18 3C18 3 19.5 6.5 18 9" stroke="#2B8A3E" stroke-width="3" stroke-linecap="round"/>
                  <path d="M18 6.5C21 4 24.5 5 25 7.5C22.5 8.5 19.8 8 18 6.5Z" fill="#2B8A3E"/>
                  <!-- 호박 몸통 -->
                  <ellipse cx="11.5" cy="20.5" rx="7.5" ry="10.5" fill="#FF8533"/>
                  <ellipse cx="24.5" cy="20.5" rx="7.5" ry="10.5" fill="#FF8533"/>
                  <ellipse cx="18" cy="20.5" rx="8.5" ry="11.2" fill="#FF6F0F"/>
                  <!-- 호박 골 라인 -->
                  <path d="M14 10.2C11.8 14.5 11.8 26.5 14 30.8" stroke="#E85D00" stroke-width="1.3" stroke-linecap="round" opacity="0.55"/>
                  <path d="M22 10.2C24.2 14.5 24.2 26.5 22 30.8" stroke="#E85D00" stroke-width="1.3" stroke-linecap="round" opacity="0.55"/>
                  <!-- 귀여운 하이라이트 -->
                  <ellipse cx="15" cy="16" rx="1.8" ry="3.2" transform="rotate(-12 15 16)" fill="#FFB380" opacity="0.65"/>
                </svg>
                <span class="hobak-logo-text">호박</span>
              </button>

              <!-- 둥근 검색창 -->
              <form class="hobak-search-form" id="hobak-search-form" role="search">
                <input
                  type="text"
                  id="hobak-search-input"
                  class="hobak-search-input"
                  placeholder="검색어를 입력하세요 (예: 조종기, 니트, 스피커, 나눔)"
                  value="${currentQuery}"
                  autocomplete="off"
                />
                ${
                  this.state.searchQuery
                    ? `<button type="button" class="hobak-search-clear-btn" id="hobak-search-clear-btn" title="검색어 지우기" aria-label="검색어 지우기">✕</button>`
                    : ""
                }
                <button type="submit" class="hobak-search-submit-btn" title="검색" aria-label="검색">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </form>

              <!-- 우측 액션 (로그인/닉네임/로그아웃 + 물건 팔기) -->
              <div class="hobak-header-actions">
                <div class="hobak-auth-slot"></div>
                <button type="button" class="hobak-header-write-btn" id="hobak-header-write-btn">
                  <span>+ 물건 팔기</span>
                </button>
              </div>
            </div>

            <!-- 하단 서비스 카테고리 탭 바 -->
            <nav class="hobak-service-tabs" aria-label="서비스 카테고리">
              ${serviceTabs
                .map((tab) => {
                  const isActive = this.state.activeServiceTab === tab.id;
                  return `
                    <button
                      type="button"
                      class="hobak-service-tab ${isActive ? "is-active" : ""}"
                      data-service-tab="${this.escapeHtml(tab.id)}"
                    >
                      ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ""}
                      <span>${this.escapeHtml(tab.label)}</span>
                    </button>
                  `;
                })
                .join("")}
            </nav>
          </div>
        </div>
      `;

      this.bindHeaderEvents(container);
      if (window.HobakAuth && typeof window.HobakAuth.renderHeaderAuthButtons === "function") {
        window.HobakAuth.renderHeaderAuthButtons();
      }
    },

    /**
     * 상단 헤더 이벤트 바인딩
     */
    bindHeaderEvents(container) {
      const logoBtn = container.querySelector("#hobak-logo-btn");
      const searchForm = container.querySelector("#hobak-search-form");
      const searchInput = container.querySelector("#hobak-search-input");
      const clearBtn = container.querySelector("#hobak-search-clear-btn");
      const writeBtn = container.querySelector("#hobak-header-write-btn");
      const tabBtns = container.querySelectorAll("[data-service-tab]");

      // 로고 클릭 시 검색/필터 초기화
      if (logoBtn) {
        logoBtn.addEventListener("click", () => {
          this.state.searchQuery = "";
          this.state.selectedCategory = "전체";
          this.state.onlyAvailable = false;
          this.state.statusFilter = "전체";
          this.state.strictDongOnly = false;
          this.state.activeServiceTab = "중고거래";
          this.refreshAll();
        });
      }

      // 검색 폼 제출
      if (searchForm && searchInput) {
        searchForm.addEventListener("submit", (e) => {
          e.preventDefault();
          this.setSearchQuery(searchInput.value);
        });

        // 실시간 입력 검색 지원
        searchInput.addEventListener("input", (e) => {
          this.state.searchQuery = e.target.value;
          if (this.containers.list) {
            this.renderListSection(this.containers.list);
          }
          if (this.containers.popular) {
            this.renderPopularKeywords(this.containers.popular, this.callbacks.onKeywordClick);
          }
        });
      }

      // 검색어 지우기 버튼
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          this.setSearchQuery("");
          const newInput = container.querySelector("#hobak-search-input");
          if (newInput) newInput.focus();
        });
      }

      // + 물건 팔기 버튼
      if (writeBtn) {
        writeBtn.addEventListener("click", () => {
          if (typeof this.callbacks.onOpenWrite === "function") {
            this.callbacks.onOpenWrite();
          }
        });
      }

      // 서비스 탭 클릭
      tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const tabId = btn.getAttribute("data-service-tab");
          if (tabId === "더보기") {
            this.showToast("🎃 중고거래 외 동네 서비스가 곧 오픈됩니다!");
            return;
          }
          this.state.activeServiceTab = tabId;
          this.renderHeader(container);
          if (tabId !== "중고거래" && tabId !== "전체") {
            this.showToast(`🎃 '${tabId}' 탭을 선택했습니다. 현재 중고거래 목록을 함께 표시합니다.`);
          }
        });
      });
    },

    /**
     * 2. 상품 목록 섹션 렌더링 (타이틀 + 필터 바 + 3열 상품 카드 그리드)
     * @param {HTMLElement|string} containerEl
     * @param {Object} [externalState]
     */
    renderListSection(containerEl, externalState) {
      const container = this.resolveContainer(containerEl, "#list-section-container, #hobak-list-section, #list-container");
      if (!container) return;
      this.containers.list = container;

      // 외부에서 전달된 state 동기화
      if (externalState && typeof externalState === "object") {
        if (externalState.selectedProductId !== undefined) {
          this.state.selectedProductId = Number(externalState.selectedProductId);
        } else if (externalState.selectedId !== undefined) {
          this.state.selectedProductId = Number(externalState.selectedId);
        }
        if (externalState.searchQuery !== undefined) {
          this.state.searchQuery = externalState.searchQuery;
        }
        if (externalState.selectedNeighborhood !== undefined) {
          this.state.selectedNeighborhood = externalState.selectedNeighborhood;
        } else if (externalState.location !== undefined) {
          this.state.selectedNeighborhood = externalState.location;
        }
        if (externalState.selectedCategory !== undefined) {
          this.state.selectedCategory = externalState.selectedCategory;
        }
        if (externalState.onlyAvailable !== undefined) {
          this.state.onlyAvailable = Boolean(externalState.onlyAvailable);
        }
      }

      const neighborhoods = (window.HobakData && window.HobakData.NEIGHBORHOODS) || [
        "울산광역시 동구 방어동",
        "울산광역시 동구 화정동",
        "울산광역시 동구 대송동",
        "울산광역시 동구 전하동",
        "울산광역시 동구 일산동"
      ];

      const categories = [
        "전체",
        ...((window.HobakData && window.HobakData.CATEGORIES) || [
          "디지털기기",
          "생활가전",
          "가구/인테리어",
          "유아동",
          "여성의류",
          "여성잡화",
          "남성의류",
          "취미/게임/음반",
          "스포츠/레저",
          "기타 중고물품"
        ])
      ];

      const sourceProducts =
        externalState && Array.isArray(externalState.products)
          ? externalState.products
          : undefined;

      const allProductsForStats =
        sourceProducts || (window.HobakData ? window.HobakData.getProducts() : []);
      const saleCount = allProductsForStats.filter((p) => p.status === "판매중").length;
      const reservedCount = allProductsForStats.filter((p) => p.status === "예약중").length;
      const doneCount = allProductsForStats.filter((p) => p.status === "거래완료").length;
      const paidItems = allProductsForStats.filter((p) => !p.isFree && Number(p.price) > 0);
      const avgPrice =
        paidItems.length > 0
          ? Math.round(paidItems.reduce((sum, p) => sum + Number(p.price), 0) / paidItems.length)
          : 0;

      const filteredProducts = this.getFilteredProducts(sourceProducts);
      const shortDong = this.getShortDong(this.state.selectedNeighborhood);
      const hasActiveFilter =
        this.state.onlyAvailable ||
        (this.state.statusFilter && this.state.statusFilter !== "전체") ||
        this.state.strictDongOnly ||
        (this.state.selectedCategory && this.state.selectedCategory !== "전체");

      container.innerHTML = `
        <div class="hobak-list-section-wrap">
          <!-- 상단 타이틀 & 필터 바 영역 -->
          <div class="hobak-list-header-area">
            <div class="hobak-list-title-row">
              <h2 class="hobak-list-main-title">
                <span>🛍️ ${this.escapeHtml(shortDong)} 중고거래 검색 결과</span>
                <span class="hobak-list-count-badge">총 ${filteredProducts.length}개</span>
              </h2>
            </div>

            <!-- [추가 아이디어] 실시간 동네 매물 상태 필터 & 평균 시세 대시보드 바 -->
            <div class="hobak-status-summary-bar" role="region" aria-label="거래 상태별 빠른 필터 및 평균 시세">
              <div class="hobak-status-pills-group">
                <button
                  type="button"
                  class="hobak-status-filter-pill ${!this.state.onlyAvailable && this.state.statusFilter === "전체" ? "is-active" : ""}"
                  data-status-pill="전체"
                >
                  전체 <strong>${allProductsForStats.length}</strong>
                </button>
                <button
                  type="button"
                  class="hobak-status-filter-pill ${this.state.onlyAvailable ? "is-active" : ""}"
                  data-status-pill="거래완료옵션"
                  title="거래 가능 보기 옵션 선택 (거래 완료된 글만 확인)"
                >
                  ☑️ 거래 가능 보기 (완료글 확인) <strong>${doneCount}</strong>
                </button>
                <button
                  type="button"
                  class="hobak-status-filter-pill ${!this.state.onlyAvailable && this.state.statusFilter === "판매중" ? "is-active" : ""}"
                  data-status-pill="판매중"
                >
                  🟢 판매중 <strong>${saleCount}</strong>
                </button>
                <button
                  type="button"
                  class="hobak-status-filter-pill ${!this.state.onlyAvailable && this.state.statusFilter === "예약중" ? "is-active" : ""}"
                  data-status-pill="예약중"
                >
                  🟡 예약중 <strong>${reservedCount}</strong>
                </button>
                <button
                  type="button"
                  class="hobak-status-filter-pill ${!this.state.onlyAvailable && this.state.statusFilter === "내게시글" ? "is-active" : ""}"
                  data-status-pill="내게시글"
                >
                  👑 내 게시글
                </button>
              </div>
              <div class="hobak-market-avg-badge" title="나눔 제외한 현재 등록 상품 평균 가격">
                📊 동네 평균 시세 <strong>${avgPrice.toLocaleString("ko-KR")}원</strong>
              </div>
            </div>

            <!-- 필터 바 -->
            <div class="hobak-filter-bar">
              <div class="hobak-filter-left">
                <!-- ⚙️ 필터 버튼 -->
                <button
                  type="button"
                  class="hobak-ctrl-btn ${this.state.filterDrawerOpen || hasActiveFilter ? "is-active" : ""}"
                  id="hobak-filter-toggle-btn"
                >
                  <span>⚙️ 필터${hasActiveFilter ? " •" : ""}</span>
                </button>

                <!-- 📍 동네 선택 드롭다운 -->
                <div class="hobak-location-select-wrap">
                  <span class="hobak-location-pin">📍</span>
                  <select id="hobak-neighborhood-select" class="hobak-location-select" aria-label="동네 선택">
                    ${neighborhoods
                      .map((dong) => {
                        const selected = dong === this.state.selectedNeighborhood ? "selected" : "";
                        return `<option value="${this.escapeHtml(dong)}" ${selected}>${this.escapeHtml(dong)}</option>`;
                      })
                      .join("")}
                  </select>
                </div>

                <!-- 🎯 현재 위치 버튼 -->
                <button type="button" class="hobak-ctrl-btn" id="hobak-current-loc-btn">
                  <span>🎯 현재 위치</span>
                </button>

                <!-- ☑️ 거래 가능 보기 옵션 체크박스 (클릭 시 거래 완료된 글만 확인) -->
                <label class="hobak-inline-available-toggle ${this.state.onlyAvailable ? "is-checked" : ""}">
                  <input
                    type="checkbox"
                    id="hobak-inline-available-chk"
                    ${this.state.onlyAvailable ? "checked" : ""}
                  />
                  <span>거래 가능 보기</span>
                </label>
              </div>

              <div class="hobak-filter-right">
                <!-- + 글쓰기 빠른 버튼 -->
                <button type="button" class="hobak-ctrl-btn hobak-quick-write-btn" id="hobak-quick-write-btn">
                  <span>+ 글쓰기</span>
                </button>

                <!-- 데이터 초기화 버튼 -->
                <button type="button" class="hobak-ctrl-btn hobak-reset-btn" id="hobak-reset-data-btn">
                  <span>데이터 초기화</span>
                </button>
              </div>
            </div>

            <!-- 확장 필터 드로어 (⚙️ 필터 클릭 시 토글) -->
            <div class="hobak-filter-drawer ${this.state.filterDrawerOpen ? "" : "is-hidden"}" id="hobak-filter-drawer">
              <div class="hobak-filter-row">
                <span class="hobak-filter-label">거래 상태</span>
                <label class="hobak-toggle-label">
                  <input
                    type="checkbox"
                    id="hobak-only-available-chk"
                    class="hobak-toggle-checkbox"
                    ${this.state.onlyAvailable ? "checked" : ""}
                  />
                  <span>거래 가능 보기 (선택 시 거래 완료된 글만 확인)</span>
                </label>
                <label class="hobak-toggle-label" style="margin-left: 12px;">
                  <input
                    type="checkbox"
                    id="hobak-strict-dong-chk"
                    class="hobak-toggle-checkbox"
                    ${this.state.strictDongOnly ? "checked" : ""}
                  />
                  <span>${this.escapeHtml(shortDong)} 매물만 정확히 보기 (인근 동네 제외)</span>
                </label>
              </div>

              <div class="hobak-filter-row">
                <span class="hobak-filter-label">카테고리</span>
                <div class="hobak-category-chips">
                  ${categories
                    .map((cat) => {
                      const active = this.state.selectedCategory === cat ? "is-active" : "";
                      return `
                        <button
                          type="button"
                          class="hobak-cat-chip ${active}"
                          data-category-chip="${this.escapeHtml(cat)}"
                        >
                          ${this.escapeHtml(cat)}
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- 3열 상품 카드 그리드 (흰색 둥근 컨테이너 박스 내부) -->
          <div class="hobak-grid-card-box">
            ${
              filteredProducts.length > 0
                ? `
                  <div class="hobak-product-grid" id="hobak-product-grid">
                    ${filteredProducts.map((product) => this.renderProductCardHtml(product)).join("")}
                  </div>
                `
                : `
                  <div class="hobak-empty-state">
                    <div class="hobak-empty-icon">🎃</div>
                    <p class="hobak-empty-title">조건에 맞는 중고거래 매물이 없어요</p>
                    <p class="hobak-empty-desc">검색어나 필터 조건을 변경하거나 전체 매물을 확인해 보세요.</p>
                    <button type="button" class="hobak-ctrl-btn hobak-quick-write-btn" id="hobak-empty-reset-btn">
                      필터 초기화하고 전체 보기
                    </button>
                  </div>
                `
            }
          </div>
        </div>
      `;

      this.bindListSectionEvents(container, filteredProducts);
    },

    /**
     * 개별 상품 카드 HTML 생성
     */
    renderProductCardHtml(product) {
      const isSelected = Number(product.id) === Number(this.state.selectedProductId);
      const thumbUrl =
        Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";

      // 상태 배지 (거래완료: 어두운 배지 / 예약중: 초록색 배지 / 판매중: 주황·초록 배지)
      const isSoldOut = product.status === "거래완료";
      const isReserved = product.status === "예약중";
      let statusBadgeHtml = `<span class="hobak-status-badge status-sale">판매중</span>`;
      let statusTagHtml = `<span class="hobak-card-status-tag tag-sale">🟢 판매중</span>`;
      if (isSoldOut) {
        statusBadgeHtml = `<span class="hobak-status-badge status-done">거래완료</span>`;
        statusTagHtml = `<span class="hobak-card-status-tag tag-done">⚫ 거래완료</span>`;
      } else if (isReserved) {
        statusBadgeHtml = `<span class="hobak-status-badge status-reserved">예약중</span>`;
        statusTagHtml = `<span class="hobak-card-status-tag tag-reserved">🟡 예약중</span>`;
      }

      const loggedInNick =
        (window.HobakAuth && typeof window.HobakAuth.getNickname === "function" && window.HobakAuth.getNickname()) ||
        "";
      const isSimOwner =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(`hobak_owner_override_${product.id}`) === "1";
      const isMyPost = Boolean(
        isSimOwner ||
          (loggedInNick &&
            product.seller?.nickname &&
            loggedInNick.trim().toLowerCase() === String(product.seller.nickname).trim().toLowerCase())
      );

      const isFree = Boolean(product.isFree || Number(product.price) === 0);
      const priceText = this.formatCardPrice(product);
      const metaText = `${product.location || "방어동"} · ${product.timeAgo || "방금 전"}`;

      return `
        <article
          class="hobak-product-card ${isSelected ? "is-selected" : ""} ${isSoldOut ? "is-sold-out" : ""}"
          data-product-id="${this.escapeHtml(product.id)}"
          tabindex="0"
          role="button"
          aria-pressed="${isSelected ? "true" : "false"}"
          aria-label="${this.escapeHtml(product.title)} - ${this.escapeHtml(priceText)}"
        >
          <div class="hobak-card-thumb-wrap">
            ${statusBadgeHtml}
            ${isSoldOut ? `<div class="hobak-soldout-scrim"><span>거래완료</span></div>` : ""}
            <img
              src="${this.escapeHtml(thumbUrl)}"
              alt="${this.escapeHtml(product.title)}"
              class="hobak-card-thumb-img"
              loading="lazy"
              onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';"
            />
          </div>
          <div class="hobak-card-body">
            <h3 class="hobak-card-title" title="${this.escapeHtml(product.title)}">
              ${this.escapeHtml(product.title)}
            </h3>
            <p class="hobak-card-price ${isFree ? "is-free" : ""}">
              ${this.escapeHtml(priceText)}
            </p>
            <p class="hobak-card-meta">
              ${this.escapeHtml(metaText)}
            </p>
            <div class="hobak-card-seller-row">
              <span class="hobak-card-seller-name" title="작성자 닉네임">
                👤 ${this.escapeHtml(product.seller?.nickname || "호박이웃")}
              </span>
              <span class="hobak-card-seller-temp">
                ${Number(product.seller?.mannerTemp || 37.5).toFixed(1)}°C
              </span>
            </div>
            <div class="hobak-card-badges">
              ${statusTagHtml}
              ${isMyPost ? `<span class="hobak-my-post-tag">👑 내 글</span>` : ""}
              ${product.quickBuy ? `<span class="hobak-quickbuy-badge">🎃 바로구매</span>` : ""}
            </div>
          </div>
        </article>
      `;
    },

    /**
     * 목록 섹션 내부 이벤트 바인딩
     */
    bindListSectionEvents(container, filteredProducts) {
      const filterToggleBtn = container.querySelector("#hobak-filter-toggle-btn");
      const neighborhoodSelect = container.querySelector("#hobak-neighborhood-select");
      const currentLocBtn = container.querySelector("#hobak-current-loc-btn");
      const quickWriteBtn = container.querySelector("#hobak-quick-write-btn");
      const resetDataBtn = container.querySelector("#hobak-reset-data-btn");
      const onlyAvailableChk = container.querySelector("#hobak-only-available-chk");
      const strictDongChk = container.querySelector("#hobak-strict-dong-chk");
      const categoryChips = container.querySelectorAll("[data-category-chip]");
      const emptyResetBtn = container.querySelector("#hobak-empty-reset-btn");
      const productCards = container.querySelectorAll(".hobak-product-card");

      // ⚙️ 필터 드로어 토글
      if (filterToggleBtn) {
        filterToggleBtn.addEventListener("click", () => {
          this.state.filterDrawerOpen = !this.state.filterDrawerOpen;
          this.renderListSection(container);
        });
      }

      // 📍 동네 드롭다운 변경
      if (neighborhoodSelect) {
        neighborhoodSelect.addEventListener("change", (e) => {
          this.state.selectedNeighborhood = e.target.value;
          const shortDong = this.getShortDong(this.state.selectedNeighborhood);
          this.renderListSection(container);
          this.notifyFilterChange();
          this.showToast(`📍 동네가 '${shortDong}'(으)로 변경되었습니다.`);
        });
      }

      // 🎯 현재 위치 버튼
      if (currentLocBtn) {
        currentLocBtn.addEventListener("click", () => {
          this.state.selectedNeighborhood = "울산광역시 동구 방어동";
          this.state.strictDongOnly = false;
          this.renderListSection(container);
          this.notifyFilterChange();
          this.showToast("🎯 현재 위치(울산광역시 동구 방어동)로 설정되었습니다.");
        });
      }

      // + 글쓰기 빠른 버튼
      if (quickWriteBtn) {
        quickWriteBtn.addEventListener("click", () => {
          if (typeof this.callbacks.onOpenWrite === "function") {
            this.callbacks.onOpenWrite();
          }
        });
      }

      // 데이터 초기화 버튼
      if (resetDataBtn) {
        resetDataBtn.addEventListener("click", () => {
          if (window.HobakData && typeof window.HobakData.resetToInitial === "function") {
            window.HobakData.resetToInitial();
          }
          this.state.searchQuery = "";
          this.state.selectedNeighborhood = "울산광역시 동구 방어동";
          this.state.strictDongOnly = false;
          this.state.selectedCategory = "전체";
          this.state.onlyAvailable = false;
          this.state.statusFilter = "전체";
          this.state.selectedProductId = 1;
          this.refreshAll();

          if (typeof this.callbacks.onResetData === "function") {
            this.callbacks.onResetData();
          }
          if (typeof this.callbacks.onSelectProduct === "function") {
            const firstProduct = window.HobakData ? window.HobakData.getProductById(1) : null;
            this.callbacks.onSelectProduct(1, firstProduct);
          }
          this.showToast("🔄 초기 가상 상품 데이터(10개)로 초기화되었습니다.");
        });
      }

      // 거래 가능 보기 체크박스 (드로어 내부 & 인라인 필터 바 연동)
      const inlineAvailableChk = container.querySelector("#hobak-inline-available-chk");
      const handleAvailableToggle = (checked) => {
        this.state.onlyAvailable = Boolean(checked);
        if (this.state.onlyAvailable) {
          this.state.statusFilter = "거래완료";
          this.showToast("☑️ 거래 가능 보기 옵션 선택: 거래 완료된 글만 표시합니다.");
        } else {
          this.state.statusFilter = "전체";
          this.showToast("📋 전체 매물 보기로 전환되었습니다.");
        }
        this.renderListSection(container);
        this.notifyFilterChange();
      };

      if (onlyAvailableChk) {
        onlyAvailableChk.addEventListener("change", (e) => handleAvailableToggle(e.target.checked));
      }
      if (inlineAvailableChk) {
        inlineAvailableChk.addEventListener("change", (e) => handleAvailableToggle(e.target.checked));
      }

      // 상단 거래 상태 빠른 필터 알약 버튼
      const statusPills = container.querySelectorAll("[data-status-pill]");
      statusPills.forEach((pill) => {
        pill.addEventListener("click", () => {
          const mode = pill.getAttribute("data-status-pill");
          if (mode === "거래완료옵션") {
            handleAvailableToggle(!this.state.onlyAvailable);
          } else {
            this.state.onlyAvailable = false;
            this.state.statusFilter = mode || "전체";
            this.renderListSection(container);
            this.notifyFilterChange();
          }
        });
      });

      // 선택 동네 매물만 보기 체크박스
      if (strictDongChk) {
        strictDongChk.addEventListener("change", (e) => {
          this.state.strictDongOnly = e.target.checked;
          this.renderListSection(container);
          this.notifyFilterChange();
        });
      }

      // 카테고리 칩 클릭
      categoryChips.forEach((chip) => {
        chip.addEventListener("click", () => {
          const cat = chip.getAttribute("data-category-chip") || "전체";
          this.state.selectedCategory = cat;
          this.renderListSection(container);
          this.notifyFilterChange();
        });
      });

      // 빈 상태 필터 초기화 버튼
      if (emptyResetBtn) {
        emptyResetBtn.addEventListener("click", () => {
          this.state.searchQuery = "";
          this.state.selectedCategory = "전체";
          this.state.onlyAvailable = false;
          this.state.statusFilter = "전체";
          this.state.strictDongOnly = false;
          this.refreshAll();
          this.notifyFilterChange();
        });
      }

      // 상품 카드 클릭 & 키보드 엔터/스페이스 이벤트
      productCards.forEach((card) => {
        const triggerSelect = () => {
          const id = Number(card.getAttribute("data-product-id"));
          if (!id) return;
          this.state.selectedProductId = id;

          // 카드 선택 테두리 즉시 반영
          productCards.forEach((c) => {
            const cId = Number(c.getAttribute("data-product-id"));
            c.classList.toggle("is-selected", cId === id);
            c.setAttribute("aria-pressed", cId === id ? "true" : "false");
          });

          const matchedProduct =
            filteredProducts.find((p) => Number(p.id) === id) ||
            (window.HobakData ? window.HobakData.getProductById(id) : null);

          if (typeof this.callbacks.onSelectProduct === "function") {
            this.callbacks.onSelectProduct(id, matchedProduct);
          }
        };

        card.addEventListener("click", triggerSelect);
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerSelect();
          }
        });
      });
    },

    /**
     * 3. 우측 사이드바 인기 검색어 렌더링
     * @param {HTMLElement|string} containerEl
     * @param {Function} [onKeywordClick]
     */
    renderPopularKeywords(containerEl, onKeywordClick) {
      const container = this.resolveContainer(containerEl, "#popular-keywords-container, #hobak-popular-keywords");
      if (!container) return;
      this.containers.popular = container;

      if (typeof onKeywordClick === "function") {
        this.callbacks.onKeywordClick = onKeywordClick;
      }

      const baseKeywords = (window.HobakData && window.HobakData.POPULAR_KEYWORDS) || [
        "아이온2", "아이온", "아이폰", "컴퓨터",
        "폴드8", "자전거", "의자", "노트북", "픽시",
        "한국시리즈", "플스5", "침대", "더보기"
      ];

      const displayKeywords = this.state.showMoreKeywords
        ? [...baseKeywords.filter((k) => k !== "더보기"), ...EXTRA_MATCHING_KEYWORDS, "접기"]
        : baseKeywords;

      const activeQuery = (this.state.searchQuery || "").trim();

      container.innerHTML = `
        <aside class="hobak-popular-card" aria-label="인기 검색어">
          <div class="hobak-popular-header">
            <h3 class="hobak-popular-title">
              <span>🔍 인기 검색어</span>
            </h3>
            ${
              activeQuery
                ? `<button type="button" class="hobak-popular-reset-btn" id="hobak-popular-clear-btn">초기화</button>`
                : ""
            }
          </div>
          <div class="hobak-popular-tags">
            ${displayKeywords
              .map((kw) => {
                const isExpandBtn = kw === "더보기" || kw === "접기";
                const isActive = !isExpandBtn && activeQuery === kw;
                return `
                  <button
                    type="button"
                    class="hobak-keyword-pill ${isActive ? "is-active" : ""}"
                    data-popular-keyword="${this.escapeHtml(kw)}"
                  >
                    ${this.escapeHtml(kw)}
                  </button>
                `;
              })
              .join("")}
          </div>
        </aside>
      `;

      // 이벤트 바인딩
      const clearBtn = container.querySelector("#hobak-popular-clear-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          this.setSearchQuery("");
        });
      }

      const pills = container.querySelectorAll("[data-popular-keyword]");
      pills.forEach((pill) => {
        pill.addEventListener("click", () => {
          const kw = pill.getAttribute("data-popular-keyword");
          if (!kw) return;

          if (kw === "더보기") {
            this.state.showMoreKeywords = true;
            this.renderPopularKeywords(container, this.callbacks.onKeywordClick);
            return;
          }
          if (kw === "접기") {
            this.state.showMoreKeywords = false;
            this.renderPopularKeywords(container, this.callbacks.onKeywordClick);
            return;
          }

          // 이미 선택된 키워드를 다시 누르면 검색 해제
          const nextQuery = this.state.searchQuery === kw ? "" : kw;
          this.setSearchQuery(nextQuery);

          if (typeof this.callbacks.onKeywordClick === "function") {
            this.callbacks.onKeywordClick(nextQuery);
          }
        });
      });
    },

    /**
     * 4. 페이지네이션 및 하단 푸터 렌더링 (PDF 3페이지 레이아웃 반영)
     * @param {HTMLElement|string} containerEl
     */
    renderPaginationAndFooter(containerEl) {
      const container = this.resolveContainer(containerEl, "#footer-container, #hobak-footer, footer");
      if (!container) return;
      this.containers.footer = container;

      const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const currentPage = this.state.currentPage || 1;

      container.innerHTML = `
        <!-- 페이지네이션 (< 1 2 3 4 5 6 7 8 9 >) -->
        <nav class="hobak-pagination-wrap" aria-label="상품 목록 페이지 이동">
          <button type="button" class="hobak-page-btn nav-arrow" data-page-action="prev" aria-label="이전 페이지">&lt;</button>
          ${pages
            .map(
              (p) => `
                <button
                  type="button"
                  class="hobak-page-btn ${p === currentPage ? "is-active" : ""}"
                  data-page-num="${p}"
                  aria-current="${p === currentPage ? "page" : "false"}"
                >
                  ${p}
                </button>
              `
            )
            .join("")}
          <button type="button" class="hobak-page-btn nav-arrow" data-page-action="next" aria-label="다음 페이지">&gt;</button>
        </nav>

        <!-- 하단 푸터 -->
        <footer class="hobak-footer">
          <div class="hobak-footer-inner">
            <div class="hobak-footer-top">
              <!-- 브랜드 & 앱 다운로드 컬럼 -->
              <div class="hobak-footer-brand-col">
                <div class="hobak-footer-logo">
                  <span>🎃 호박</span>
                </div>
                <p class="hobak-app-download-title">호박 앱 다운로드</p>
                <div class="hobak-store-btns">
                  <a href="#app-store" class="hobak-store-btn" data-footer-link="App Store">
                    <span>🍎 App Store</span>
                  </a>
                  <a href="#google-play" class="hobak-store-btn" data-footer-link="Google Play">
                    <span>▶️ Google Play</span>
                  </a>
                </div>
              </div>

              <!-- 탐색 -->
              <div class="hobak-footer-col">
                <h4>탐색</h4>
                <ul class="hobak-footer-links">
                  <li><a href="#used" data-footer-link="중고거래">중고거래</a></li>
                  <li><a href="#local-biz" data-footer-link="동네업체">동네업체</a></li>
                  <li><a href="#cars" data-footer-link="중고차">중고차</a></li>
                  <li><a href="#jobs" data-footer-link="알바">알바</a></li>
                  <li><a href="#realty" data-footer-link="부동산">부동산</a></li>
                </ul>
              </div>

              <!-- 비즈니스 -->
              <div class="hobak-footer-col">
                <h4>비즈니스</h4>
                <ul class="hobak-footer-links">
                  <li><a href="#biz" data-footer-link="호박비즈니스">호박비즈니스</a></li>
                  <li><a href="#chat" data-footer-link="채팅하기">채팅하기</a></li>
                  <li><a href="#ads" data-footer-link="광고주센터">광고주센터</a></li>
                  <li><a href="#store" data-footer-link="동네가게">동네가게</a></li>
                </ul>
              </div>

              <!-- 회사 -->
              <div class="hobak-footer-col">
                <h4>회사</h4>
                <ul class="hobak-footer-links">
                  <li><a href="#about" data-footer-link="회사 소개">회사 소개</a></li>
                  <li><a href="#careers" data-footer-link="채용">채용</a></li>
                  <li><a href="#blog" data-footer-link="블로그">블로그</a></li>
                  <li><a href="#press" data-footer-link="보도자료">보도자료</a></li>
                  <li><a href="#safe" data-footer-link="안심거래">안심거래</a></li>
                </ul>
              </div>

              <!-- 문의 -->
              <div class="hobak-footer-col">
                <h4>문의</h4>
                <ul class="hobak-footer-links">
                  <li><a href="#cs" data-footer-link="고객센터">고객센터</a></li>
                  <li><a href="#partner" data-footer-link="제휴 문의">제휴 문의</a></li>
                  <li><a href="#ad-inquiry" data-footer-link="광고 문의">광고 문의</a></li>
                  <li><a href="#pr" data-footer-link="PR 문의">PR 문의</a></li>
                  <li><a href="#ir" data-footer-link="IR 문의">IR 문의</a></li>
                </ul>
              </div>

              <!-- 인기검색어 -->
              <div class="hobak-footer-col">
                <h4>인기검색어</h4>
                <ul class="hobak-footer-links">
                  <li><a href="#kw-조종기" data-footer-keyword="조종기">RC 조종기</a></li>
                  <li><a href="#kw-아이폰" data-footer-keyword="아이폰">아이폰</a></li>
                  <li><a href="#kw-노트북" data-footer-keyword="노트북">노트북</a></li>
                  <li><a href="#kw-스피커" data-footer-keyword="스피커">블루투스 스피커</a></li>
                  <li><a href="#kw-나눔" data-footer-keyword="나눔">무료나눔</a></li>
                </ul>
              </div>
            </div>

            <!-- 사업자 정보 및 약관 -->
            <div class="hobak-footer-bottom">
              <div class="hobak-footer-company-info">
                <p><strong>(주)호박마켓</strong> | 대표 김호박 | 사업자등록번호 123-45-67890 | 직업정보제공사업신고번호 J1200020260001</p>
                <p>통신판매업신고번호 제2026-울산동구-0100호 | 주소 울산광역시 동구 방어동 호박로 100, 1층 (호박빌딩)</p>
                <p>전화 1544-0000 | 고객문의 cs@hobakmarket.kr</p>
              </div>
              <div class="hobak-footer-policy-links">
                <a href="#terms" data-footer-link="이용약관">이용약관</a>
                <a href="#privacy" class="privacy-strong" data-footer-link="개인정보처리방침">개인정보처리방침</a>
                <a href="#location-policy" data-footer-link="위치기반서비스 이용약관">위치기반서비스 이용약관</a>
                <a href="#protection" data-footer-link="이용자보호 비전과 계획">이용자보호 비전과 계획</a>
                <a href="#youth" data-footer-link="청소년보호정책">청소년보호정책</a>
              </div>
            </div>
          </div>
        </footer>
      `;

      this.bindPaginationAndFooterEvents(container);
    },

    /**
     * 페이지네이션 및 푸터 이벤트 바인딩
     */
    bindPaginationAndFooterEvents(container) {
      const pageNumBtns = container.querySelectorAll("[data-page-num]");
      const prevBtn = container.querySelector('[data-page-action="prev"]');
      const nextBtn = container.querySelector('[data-page-action="next"]');
      const footerKeywords = container.querySelectorAll("[data-footer-keyword]");
      const footerLinks = container.querySelectorAll("[data-footer-link]");

      pageNumBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const page = Number(btn.getAttribute("data-page-num")) || 1;
          this.state.currentPage = page;
          this.renderPaginationAndFooter(container);
          if (this.containers.list) {
            this.containers.list.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });

      if (prevBtn) {
        prevBtn.addEventListener("click", () => {
          this.state.currentPage = Math.max(1, (this.state.currentPage || 1) - 1);
          this.renderPaginationAndFooter(container);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          this.state.currentPage = Math.min(9, (this.state.currentPage || 1) + 1);
          this.renderPaginationAndFooter(container);
        });
      }

      footerKeywords.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const kw = link.getAttribute("data-footer-keyword") || "";
          this.setSearchQuery(kw);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });

      footerLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const label = link.getAttribute("data-footer-link") || "안내";
          this.showToast(`🎃 [호박] '${label}' 페이지입니다.`);
        });
      });
    },

    /**
     * 외부/내부에서 검색어 변경 시 헤더, 목록, 인기검색어 동기화
     */
    setSearchQuery(query) {
      this.state.searchQuery = (query || "").trim();
      this.refreshAll();
      this.notifyFilterChange();
    },

    /**
     * 외부에서 선택된 상품 ID 변경 시 하이라이트 업데이트
     */
    setSelectedProduct(productId) {
      this.state.selectedProductId = Number(productId);
      if (this.containers.list) {
        const cards = this.containers.list.querySelectorAll(".hobak-product-card");
        cards.forEach((card) => {
          const cId = Number(card.getAttribute("data-product-id"));
          card.classList.toggle("is-selected", cId === this.state.selectedProductId);
        });
      }
    },

    /**
     * 등록/상태변경 등 데이터 갱신 시 전체 뷰 리렌더링
     */
    refreshAll(externalState) {
      if (this.containers.header) {
        this.renderHeader(this.containers.header);
      }
      if (this.containers.list) {
        this.renderListSection(this.containers.list, externalState);
      }
      if (this.containers.popular) {
        this.renderPopularKeywords(this.containers.popular, this.callbacks.onKeywordClick);
      }
      if (this.containers.footer) {
        this.renderPaginationAndFooter(this.containers.footer);
      }
    },

    /**
     * 필터 변경 콜백 알림
     */
    notifyFilterChange() {
      if (typeof this.callbacks.onFilterChange === "function") {
        this.callbacks.onFilterChange({ ...this.state });
      }
    },

    /**
     * 토스트 메시지 표시
     */
    ensureToastElement() {
      if (typeof document === "undefined") return null;
      let toast = document.getElementById("hobak-list-toast");
      if (!toast && document.body) {
        toast = document.createElement("div");
        toast.id = "hobak-list-toast";
        toast.className = "hobak-list-toast";
        document.body.appendChild(toast);
      }
      return toast;
    },

    showToast(message) {
      const toast = this.ensureToastElement();
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("is-visible");
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
      }, 2400);
    }
  };

  window.HobakListView = HobakListView;
})();
