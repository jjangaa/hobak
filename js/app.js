// ==========================================================================
// 호박(Hobak) 중고거래 웹서비스 - 메인 통합 컨트롤러 (js/app.js)
// 팀장(Coordinator): 목록(HobakListView) + 상세(HobakDetailView) + 글쓰기(HobakWriteView) 통합
// ==========================================================================

(function () {
  const AppState = {
    mode: "browse", // "browse" (목록+우측상세/인기검색어) | "write" (글쓰기 페이지)
    selectedProductId: 1, // 첫 번째 이미지의 'RadioMaster Zorro 조종기 및 드론 부품 세트' 기본 선택
    detailOpen: true
  };

  const els = {};

  function cacheElements() {
    els.headerContainer = document.getElementById("hobak-header-root");
    els.browseView = document.getElementById("hobak-browse-view");
    els.browseLayout = document.getElementById("hobak-browse-layout");
    els.listContainer = document.getElementById("hobak-list-root");
    els.detailWrapper = document.getElementById("hobak-detail-wrapper");
    els.detailContainer = document.getElementById("hobak-detail-root");
    els.popularContainer = document.getElementById("hobak-popular-root");
    els.footerContainer = document.getElementById("hobak-footer-root");
    els.writeView = document.getElementById("hobak-write-view");
    els.writeContainer = document.getElementById("hobak-write-root");
    els.quickNavBar = document.getElementById("hobak-quick-mode-bar");
  }

  function updateQuickModeBar() {
    if (!els.quickNavBar) return;
    const btns = els.quickNavBar.querySelectorAll("[data-mode-btn]");
    btns.forEach((btn) => {
      const btnMode = btn.getAttribute("data-mode-btn");
      let isActive = false;
      if (btnMode === "browse-list" && AppState.mode === "browse" && !AppState.detailOpen) {
        isActive = true;
      } else if (btnMode === "browse-detail" && AppState.mode === "browse" && AppState.detailOpen) {
        isActive = true;
      } else if (btnMode === "write" && AppState.mode === "write") {
        isActive = true;
      }
      btn.classList.toggle("active", isActive);
    });
  }

  function renderDetailPanel() {
    if (!els.detailWrapper || !els.detailContainer) return;

    if (AppState.detailOpen && AppState.selectedProductId) {
      els.detailWrapper.classList.remove("hobak-hidden");
      if (els.browseLayout) {
        els.browseLayout.classList.add("detail-open");
      }

      window.HobakDetailView.render(els.detailContainer, AppState.selectedProductId, {
        onClose() {
          AppState.detailOpen = false;
          els.detailWrapper.classList.add("hobak-hidden");
          els.detailWrapper.classList.remove("mobile-modal-active");
          if (els.browseLayout) {
            els.browseLayout.classList.remove("detail-open");
          }
          window.HobakListView.setSelectedProduct(null);
          updateQuickModeBar();
        },
        onStatusChange(productId, newStatus) {
          window.HobakListView.refreshAll({
            selectedProductId: productId
          });
        },
        onLikeToggle(productId) {
          window.HobakListView.refreshAll({
            selectedProductId: productId
          });
        },
        onSelectRelated(relatedProductId) {
          selectProduct(relatedProductId);
        },
        onEditProduct(productToEdit) {
          switchMode("write", { editingProduct: productToEdit });
        },
        onDeleteProduct(deletedId, remainingProducts) {
          const nextItem = Array.isArray(remainingProducts) && remainingProducts.length > 0 ? remainingProducts[0] : null;
          AppState.selectedProductId = nextItem ? nextItem.id : null;
          AppState.detailOpen = Boolean(nextItem);
          window.HobakListView.refreshAll({
            selectedProductId: AppState.selectedProductId
          });
          renderDetailPanel();
          if (window.HobakListView) {
            window.HobakListView.showToast("🗑️ 게시글이 삭제되어 목록과 Supabase DB에 반영되었습니다.");
          }
        }
      });
    } else {
      els.detailWrapper.classList.add("hobak-hidden");
      els.detailWrapper.classList.remove("mobile-modal-active");
      if (els.browseLayout) {
        els.browseLayout.classList.remove("detail-open");
      }
    }
    updateQuickModeBar();
  }

  function selectProduct(productId) {
    AppState.selectedProductId = Number(productId);
    AppState.detailOpen = true;

    if (AppState.mode !== "browse") {
      switchMode("browse", { keepDetailOpen: true });
    }

    window.HobakListView.setSelectedProduct(AppState.selectedProductId);
    renderDetailPanel();

    if (window.innerWidth <= 1040 && els.detailWrapper) {
      els.detailWrapper.classList.add("mobile-modal-active");
    } else if (els.detailWrapper) {
      els.detailWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function switchMode(newMode, options = {}) {
    AppState.mode = newMode;

    if (newMode === "write") {
      els.browseView.classList.add("hobak-hidden");
      els.writeView.classList.remove("hobak-hidden");

      window.HobakWriteView.render(
        els.writeContainer,
        {
          onCancel() {
            switchMode("browse", { keepDetailOpen: AppState.detailOpen });
          },
          onSubmitSuccess(savedProduct) {
            AppState.selectedProductId = savedProduct.id;
            AppState.detailOpen = true;
            switchMode("browse", { keepDetailOpen: true });
            window.HobakListView.refreshAll({
              selectedProductId: savedProduct.id,
              searchQuery: "",
              selectedCategory: "전체"
            });
            renderDetailPanel();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        options.editingProduct || null
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      els.writeView.classList.add("hobak-hidden");
      els.browseView.classList.remove("hobak-hidden");

      if (typeof options.keepDetailOpen === "boolean") {
        AppState.detailOpen = options.keepDetailOpen;
      }
      window.HobakListView.setSelectedProduct(
        AppState.detailOpen ? AppState.selectedProductId : null
      );
      renderDetailPanel();
    }

    updateQuickModeBar();
  }

  function bindQuickModeButtons() {
    if (!els.quickNavBar) return;
    els.quickNavBar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mode-btn]");
      if (!btn) return;
      const targetMode = btn.getAttribute("data-mode-btn");

      if (targetMode === "browse-list") {
        AppState.detailOpen = false;
        switchMode("browse", { keepDetailOpen: false });
      } else if (targetMode === "browse-detail") {
        if (!AppState.selectedProductId) {
          const products = window.HobakData.getProducts();
          AppState.selectedProductId = products[0] ? products[0].id : 1;
        }
        AppState.detailOpen = true;
        switchMode("browse", { keepDetailOpen: true });
      } else if (targetMode === "write") {
        if (window.HobakAuth && typeof window.HobakAuth.requireLoginForWrite === "function") {
          window.HobakAuth.requireLoginForWrite(() => switchMode("write"));
        } else {
          switchMode("write");
        }
      }
    });
  }

  function initApp() {
    cacheElements();

    // 1. 목록 뷰 초기화 및 렌더링
    window.HobakListView.init({
      onSelectProduct(productId) {
        selectProduct(productId);
      },
      onOpenWrite() {
        if (window.HobakAuth && typeof window.HobakAuth.requireLoginForWrite === "function") {
          window.HobakAuth.requireLoginForWrite(() => switchMode("write"));
        } else {
          switchMode("write");
        }
      },
      onResetData() {
        AppState.selectedProductId = 1;
        AppState.detailOpen = true;
        renderDetailPanel();
      }
    });

    window.HobakListView.renderHeader(els.headerContainer);
    window.HobakListView.renderListSection(els.listContainer, {
      selectedProductId: AppState.selectedProductId
    });
    window.HobakListView.renderPopularKeywords(els.popularContainer, (keyword) => {
      window.HobakListView.setSearchQuery(keyword);
      if (window.HobakSupabase && typeof window.HobakSupabase.incrementKeywordCount === "function") {
        window.HobakSupabase.incrementKeywordCount(keyword);
      }
    });
    window.HobakListView.renderPaginationAndFooter(els.footerContainer);

    // 2. 초기 상세 패널 렌더링 (1번 상품: RadioMaster Zorro 조종기 세트)
    renderDetailPanel();

    // 3. 상단 빠른 화면 전환 바 바인딩
    bindQuickModeButtons();
    updateQuickModeBar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
