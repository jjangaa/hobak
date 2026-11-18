// ==========================================================================
// 호박(Hobak) 중고거래 웹서비스 - 상품 상세 페이지 / 패널 모듈 (detail-view.js)
// ==========================================================================

(function () {
  let currentSlideIndex = 0;
  let toastTimer = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getMannerInfo(temp) {
    const t = Number(temp) || 36.5;
    const percent = Math.min(100, Math.max(15, Math.round(((t - 30) / 30) * 100)));
    if (t >= 42) {
      return { emoji: "😍", color: "#FF5A00", percent };
    }
    if (t >= 38) {
      return { emoji: "😄", color: "#FF6F0F", percent };
    }
    if (t >= 36.5) {
      return { emoji: "😊", color: "#FF6F0F", percent };
    }
    return { emoji: "🙂", color: "#868b94", percent };
  }

  function getSellerAvatarEmoji(nickname) {
    const name = String(nickname || "");
    if (name.includes("오리")) return "🦆";
    if (name.includes("하늘") || name.includes("비행")) return "✈️";
    if (name.includes("바다")) return "🌊";
    if (name.includes("핑크")) return "🎀";
    if (name.includes("옷장") || name.includes("클래식")) return "🧥";
    if (name.includes("커피")) return "☕";
    if (name.includes("사운드")) return "🎧";
    if (name.includes("햇살") || name.includes("맘")) return "🌻";
    return "🎃";
  }

  function showToast(panelEl, message) {
    if (!panelEl) return;
    const existing = panelEl.querySelector(".hobak-detail-toast");
    if (existing) existing.remove();
    if (toastTimer) clearTimeout(toastTimer);

    const toast = document.createElement("div");
    toast.className = "hobak-detail-toast";
    toast.textContent = message;
    panelEl.appendChild(toast);

    toastTimer = setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2400);
  }

  function openMiniChatModal(panelEl, product) {
    const existing = panelEl.querySelector(".hobak-detail-modal-backdrop");
    if (existing) existing.remove();

    const sellerName = escapeHtml(product.seller?.nickname || "호박이웃");
    const avatarEmoji = getSellerAvatarEmoji(product.seller?.nickname);
    const priceText = window.HobakData.formatPrice(product);

    const backdrop = document.createElement("div");
    backdrop.className = "hobak-detail-modal-backdrop";
    backdrop.innerHTML = `
      <div class="hobak-detail-chat-modal" role="dialog" aria-label="호박채팅">
        <div class="hobak-detail-chat-header">
          <div class="hobak-detail-chat-title">
            <span>${avatarEmoji}</span>
            <span>${sellerName}님과의 호박채팅</span>
          </div>
          <button type="button" class="hobak-detail-chat-close" aria-label="채팅 닫기">✕</button>
        </div>
        <div class="hobak-detail-chat-messages">
          <div class="hobak-chat-bubble seller">
            안녕하세요! <strong>${escapeHtml(product.title)}</strong> (${escapeHtml(priceText)}) 상품에 관심 가져주셔서 감사합니다 😊 궁금하신 점 편하게 물어보세요!
          </div>
        </div>
        <form class="hobak-detail-chat-form">
          <input
            type="text"
            class="hobak-detail-chat-input"
            placeholder="메시지를 입력하세요 (예: 안녕하세요! 구매 가능할까요?)"
            required
          />
          <button type="submit" class="hobak-detail-chat-send">전송</button>
        </form>
      </div>
    `;

    const closeBtn = backdrop.querySelector(".hobak-detail-chat-close");
    closeBtn.addEventListener("click", () => backdrop.remove());
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    const form = backdrop.querySelector(".hobak-detail-chat-form");
    const input = backdrop.querySelector(".hobak-detail-chat-input");
    const messagesEl = backdrop.querySelector(".hobak-detail-chat-messages");

    // Supabase chat_messages 테이블에서 이전 대화 기록 불러오기
    if (window.HobakSupabase && typeof window.HobakSupabase.fetchChatMessages === "function") {
      window.HobakSupabase.fetchChatMessages(product.id).then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          messagesEl.innerHTML = "";
          rows.forEach((r) => {
            const b = document.createElement("div");
            b.className = `hobak-chat-bubble ${r.sender_role === "buyer" ? "me" : "seller"}`;
            b.textContent = r.message;
            messagesEl.appendChild(b);
          });
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const myBubble = document.createElement("div");
      myBubble.className = "hobak-chat-bubble me";
      myBubble.textContent = text;
      messagesEl.appendChild(myBubble);
      input.value = "";
      messagesEl.scrollTop = messagesEl.scrollHeight;

      if (window.HobakSupabase && typeof window.HobakSupabase.sendChatMessage === "function") {
        window.HobakSupabase.sendChatMessage(product.id, "buyer", "호박이웃", text);
      }

      setTimeout(() => {
        const replyText = `네! 현재 ${product.status} 상태입니다. ${product.fullLocation || product.location}에서 직거래나 택배 모두 가능해요 🎃`;
        const reply = document.createElement("div");
        reply.className = "hobak-chat-bubble seller";
        reply.textContent = replyText;
        messagesEl.appendChild(reply);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        if (window.HobakSupabase && typeof window.HobakSupabase.sendChatMessage === "function") {
          window.HobakSupabase.sendChatMessage(
            product.id,
            "seller",
            product.seller?.nickname || "호박판매자",
            replyText
          );
        }
      }, 650);
    });

    panelEl.appendChild(backdrop);
    input.focus();
  }

  window.HobakDetailView = {
    render(containerEl, productId, callbacks = {}) {
      if (!containerEl || !window.HobakData) return;

      const product = window.HobakData.getProductById(productId);
      if (!product) {
        containerEl.innerHTML = `
          <div class="hobak-detail-panel" style="align-items:center;justify-content:center;padding:40px;text-align:center;">
            <p style="font-size:15px;color:#868b94;">상품 정보를 찾을 수 없습니다.</p>
          </div>
        `;
        return;
      }

      currentSlideIndex = 0;

      const images =
        Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"];

      const seller = product.seller || {
        nickname: "호박이웃",
        mannerTemp: 36.5,
        avatarBg: "#FFE8CC"
      };
      const manner = getMannerInfo(seller.mannerTemp);
      const avatarEmoji = getSellerAvatarEmoji(seller.nickname);
      const priceFormatted = window.HobakData.formatPrice(product);

      // 연관 상품 2개 추출 (현재 상품 제외)
      const allProducts = window.HobakData.getProducts();
      const relatedProducts = allProducts
        .filter((p) => Number(p.id) !== Number(product.id))
        .sort((a, b) => (a.category === product.category ? -1 : 1))
        .slice(0, 2);

      // 상태 오버레이 배지 HTML
      const renderImageStatusBadge = (status) => {
        if (status === "예약중") {
          return `<span class="hobak-detail-image-status status-reserved">예약중</span>`;
        }
        if (status === "거래완료") {
          return `<span class="hobak-detail-image-status status-completed">거래완료</span>`;
        }
        return `<span class="hobak-detail-image-status status-sale">판매중</span>`;
      };

      const loggedInNick =
        (window.HobakAuth && typeof window.HobakAuth.getNickname === "function" && window.HobakAuth.getNickname()) ||
        "";
      const isSimulatedOwner =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(`hobak_owner_override_${product.id}`) === "1";
      const isOwner = Boolean(
        isSimulatedOwner ||
          (loggedInNick &&
            seller.nickname &&
            loggedInNick.trim().toLowerCase() === String(seller.nickname).trim().toLowerCase())
      );

      containerEl.innerHTML = `
        <aside class="hobak-detail-panel" data-product-id="${product.id}">
          <div class="hobak-detail-scroll">
            <!-- 1. 상단 정사각형 이미지 갤러리 -->
            <div class="hobak-detail-gallery">
              <button type="button" class="hobak-detail-close-btn" aria-label="상세화면 닫기" title="닫기">✕</button>
              <button type="button" class="hobak-detail-app-btn">앱에서 보기</button>

              <div class="hobak-detail-slides">
                ${images
                  .map(
                    (imgUrl, idx) => `
                  <div class="hobak-detail-slide" data-index="${idx}">
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(product.title)} 이미지 ${idx + 1}" loading="lazy" />
                  </div>
                `
                  )
                  .join("")}
              </div>

              <button
                type="button"
                class="hobak-detail-nav-btn prev"
                aria-label="이전 사진"
                ${images.length <= 1 ? "disabled" : ""}
              >‹</button>
              <button
                type="button"
                class="hobak-detail-nav-btn next"
                aria-label="다음 사진"
                ${images.length <= 1 ? "disabled" : ""}
              >›</button>

              <div class="hobak-detail-status-overlay-slot">
                ${renderImageStatusBadge(product.status)}
              </div>

              <div class="hobak-detail-dots" role="tablist" aria-label="이미지 페이지네이션">
                ${images
                  .map(
                    (_, idx) => `
                  <button
                    type="button"
                    class="hobak-detail-dot ${idx === 0 ? "active" : ""}"
                    data-dot-index="${idx}"
                    aria-label="${idx + 1}번 이미지 보기"
                  ></button>
                `
                  )
                  .join("")}
              </div>
            </div>

            <!-- 2. 판매자 프로필 및 매너온도 -->
            <section class="hobak-detail-seller">
              <div class="hobak-detail-seller-left">
                <div class="hobak-detail-avatar" style="background-color: ${escapeHtml(seller.avatarBg || "#FFE8CC")};">
                  <span>${avatarEmoji}</span>
                </div>
                <div class="hobak-detail-seller-meta">
                  <div class="hobak-detail-seller-name">${escapeHtml(seller.nickname)}</div>
                  <div class="hobak-detail-seller-region">${escapeHtml(product.fullLocation || product.location)}</div>
                </div>
              </div>

              <div class="hobak-detail-manner">
                <div class="hobak-detail-manner-top">
                  <span class="hobak-detail-manner-val" style="color: ${manner.color};">${Number(seller.mannerTemp).toFixed(1)}°C</span>
                  <span class="hobak-detail-manner-emoji">${manner.emoji}</span>
                </div>
                <div class="hobak-detail-manner-bar-wrap">
                  <div class="hobak-detail-manner-bar-fill" style="width: ${manner.percent}%; background-color: ${manner.color};"></div>
                </div>
                <button type="button" class="hobak-detail-manner-label">매너온도</button>
              </div>

              <div class="hobak-detail-manner-tooltip" role="tooltip">
                매너온도는 호박 이웃에게 받은 칭찬, 후기, 거래 매너 등을 종합해서 만든 지표예요. 첫 온도 36.5°C에서 시작해요!
              </div>
            </section>

            <!-- 3. 상품 핵심 정보 및 본문 -->
            <section class="hobak-detail-content">
              <div class="hobak-detail-title-row">
                <h2 class="hobak-detail-title">${escapeHtml(product.title)}</h2>
              </div>

              <div class="hobak-detail-submeta">
                <span class="hobak-detail-category">${escapeHtml(product.category)}</span>
                <span>·</span>
                <span class="hobak-detail-time">${escapeHtml(product.timeAgo)}</span>
              </div>

              <div class="hobak-detail-price-row">
                <span class="hobak-detail-price ${product.isFree ? "is-free" : ""}">${escapeHtml(priceFormatted)}</span>
                ${
                  product.quickBuy
                    ? `<span class="hobak-detail-quickbuy-badge">🎃 바로구매 가능</span>`
                    : ""
                }
                ${
                  !product.isFree && product.status !== "거래완료"
                    ? `<button type="button" class="hobak-detail-offer-btn" id="hobakDetailOfferBtn">💰 가격 제안하기</button>`
                    : ""
                }
              </div>

              <!-- 1. 직접 올린 게시글일 경우: 판매중/예약중/거래완료 선택 + 수정 + 삭제 + 끌올 버튼 표시 -->
              ${
                isOwner
                  ? `
                <div class="hobak-detail-owner-box">
                  <div class="hobak-detail-owner-header">
                    <span class="hobak-detail-owner-badge">👑 내가 올린 게시글 관리</span>
                    <div class="hobak-detail-owner-actions">
                      <button type="button" class="hobak-owner-action-btn bump" id="hobakDetailBumpBtn" title="목록 최상단으로 끌어올리기">
                        🚀 끌올
                      </button>
                      <button type="button" class="hobak-owner-action-btn edit" id="hobakDetailEditBtn">
                        ✏️ 수정
                      </button>
                      <button type="button" class="hobak-owner-action-btn delete" id="hobakDetailDeleteBtn">
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                  <div class="hobak-detail-status-box">
                    <span class="hobak-detail-status-label">거래 상태 변경</span>
                    <div class="hobak-detail-status-btns">
                      ${["판매중", "예약중", "거래완료"]
                        .map(
                          (st) => `
                        <button
                          type="button"
                          class="hobak-detail-status-btn ${product.status === st ? "active" : ""}"
                          data-status="${st}"
                        >${st}</button>
                      `
                        )
                        .join("")}
                    </div>
                  </div>
                </div>
              `
                  : `
                <div class="hobak-detail-visitor-box">
                  <div class="hobak-detail-visitor-info">
                    <span>현재 거래 상태: <strong>${escapeHtml(product.status)}</strong></span>
                    <span class="hobak-detail-visitor-sub">· 작성자(<strong>${escapeHtml(seller.nickname)}</strong>) 본인 글 클릭 시 수정/삭제/상태변경 가능</span>
                  </div>
                  <button type="button" class="hobak-detail-claim-test-btn" id="hobakDetailClaimTestBtn">
                    🛠️ 이 글을 '내가 올린 게시글'로 전환해 수정·삭제·상태변경 테스트하기
                  </button>
                </div>
              `
              }

              <!-- 상품 상세 설명 본문 -->
              <div class="hobak-detail-description">${escapeHtml(product.description)}</div>

              <!-- 관심 · 채팅 · 조회수 메타 정보 -->
              <div class="hobak-detail-stats">
                관심 <span class="hobak-detail-stat-likes">${product.likes || 0}</span> · 채팅 <span>${product.chats || 0}</span> · 조회 <span>${product.views || 0}</span>
              </div>
            </section>

            <!-- 함께 볼 만한 이웃 상품 -->
            ${
              relatedProducts.length > 0
                ? `
              <section class="hobak-detail-related">
                <h3 class="hobak-detail-related-title">${escapeHtml(seller.nickname)}님과 이웃들의 다른 상품</h3>
                <div class="hobak-detail-related-grid">
                  ${relatedProducts
                    .map(
                      (rel) => `
                    <article class="hobak-detail-related-card" data-related-id="${rel.id}">
                      <div class="hobak-detail-related-thumb">
                        <img src="${escapeHtml(rel.images?.[0] || "")}" alt="${escapeHtml(rel.title)}" loading="lazy" />
                      </div>
                      <div class="hobak-detail-related-info">
                        <div class="hobak-detail-related-name">${escapeHtml(rel.title)}</div>
                        <div class="hobak-detail-related-price">${escapeHtml(window.HobakData.formatPrice(rel))}</div>
                      </div>
                    </article>
                  `
                    )
                    .join("")}
                </div>
              </section>
            `
                : ""
            }
          </div>

          <!-- 4. 하단 고정 액션 바 -->
          <footer class="hobak-detail-bottom-bar">
            <button
              type="button"
              class="hobak-detail-like-btn ${product.liked ? "liked" : ""}"
              aria-label="관심상품 등록"
              title="관심상품"
            >
              <span class="hobak-detail-heart-icon">${product.liked ? "♥" : "♡"}</span>
              <span class="hobak-detail-like-count">${product.likes || 0}</span>
            </button>

            <div class="hobak-detail-action-btns">
              <button
                type="button"
                class="hobak-detail-buy-btn"
                ${product.status === "거래완료" ? "disabled" : ""}
              >바로구매</button>
              <button
                type="button"
                class="hobak-detail-chat-btn"
                ${product.status === "거래완료" ? "disabled" : ""}
              >${product.status === "거래완료" ? "거래완료된 상품" : "채팅으로 거래하기"}</button>
            </div>
          </footer>
        </aside>
      `;

      const panelEl = containerEl.querySelector(".hobak-detail-panel");
      const slidesEl = panelEl.querySelector(".hobak-detail-slides");
      const prevBtn = panelEl.querySelector(".hobak-detail-nav-btn.prev");
      const nextBtn = panelEl.querySelector(".hobak-detail-nav-btn.next");
      const dotBtns = panelEl.querySelectorAll(".hobak-detail-dot");

      const updateGallerySlide = (newIndex) => {
        const total = images.length;
        if (total <= 1) return;
        currentSlideIndex = (newIndex + total) % total;
        slidesEl.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
        dotBtns.forEach((dot, idx) => {
          dot.classList.toggle("active", idx === currentSlideIndex);
        });
      };

      if (prevBtn) {
        prevBtn.addEventListener("click", () => updateGallerySlide(currentSlideIndex - 1));
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", () => updateGallerySlide(currentSlideIndex + 1));
      }
      dotBtns.forEach((dot) => {
        dot.addEventListener("click", () => {
          const targetIdx = Number(dot.getAttribute("data-dot-index")) || 0;
          updateGallerySlide(targetIdx);
        });
      });

      // 좌측 상단 닫기(✕) 버튼
      const closeBtn = panelEl.querySelector(".hobak-detail-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          if (typeof callbacks.onClose === "function") {
            callbacks.onClose();
          }
        });
      }

      // 우측 상단 '앱에서 보기' 버튼
      const appBtn = panelEl.querySelector(".hobak-detail-app-btn");
      if (appBtn) {
        appBtn.addEventListener("click", () => {
          showToast(panelEl, "🎃 호박 앱으로 연결합니다! QR 스캔 또는 스토어에서 만나요.");
        });
      }

      // 매너온도 설명 툴팁 토글
      const mannerLabelBtn = panelEl.querySelector(".hobak-detail-manner-label");
      const mannerTooltip = panelEl.querySelector(".hobak-detail-manner-tooltip");
      if (mannerLabelBtn && mannerTooltip) {
        mannerLabelBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          mannerTooltip.classList.toggle("show");
        });
        panelEl.addEventListener("click", () => {
          mannerTooltip.classList.remove("show");
        });
      }

      // 판매 상태 빠른 변경 버튼
      const statusBtns = panelEl.querySelectorAll(".hobak-detail-status-btn");
      const overlaySlot = panelEl.querySelector(".hobak-detail-status-overlay-slot");
      const chatBtn = panelEl.querySelector(".hobak-detail-chat-btn");
      const buyBtn = panelEl.querySelector(".hobak-detail-buy-btn");

      statusBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const newStatus = btn.getAttribute("data-status");
          if (!newStatus || newStatus === product.status) return;

          const updated = window.HobakData.updateStatus(product.id, newStatus);
          if (updated) {
            product.status = updated.status;
          } else {
            product.status = newStatus;
          }

          statusBtns.forEach((b) => {
            b.classList.toggle("active", b.getAttribute("data-status") === product.status);
          });

          if (overlaySlot) {
            overlaySlot.innerHTML = renderImageStatusBadge(product.status);
          }

          const isDone = product.status === "거래완료";
          if (chatBtn) {
            chatBtn.disabled = isDone;
            chatBtn.textContent = isDone ? "거래완료된 상품" : "채팅으로 거래하기";
          }
          if (buyBtn) {
            buyBtn.disabled = isDone;
          }

          showToast(panelEl, `✅ 상품 상태가 '${product.status}'(으)로 변경되어 Supabase DB 및 목록에 반영되었습니다.`);

          if (typeof callbacks.onStatusChange === "function") {
            callbacks.onStatusChange(product.id, product.status);
          }
        });
      });

      // 테스트용 작성자 권한 활성화 버튼 (기본 10개 샘플 글에서도 즉시 수정/삭제/상태변경 테스트 가능)
      const claimTestBtn = panelEl.querySelector("#hobakDetailClaimTestBtn");
      if (claimTestBtn) {
        claimTestBtn.addEventListener("click", () => {
          try {
            sessionStorage.setItem(`hobak_owner_override_${product.id}`, "1");
          } catch (e) {
            // ignore
          }
          this.render(containerEl, product.id, callbacks);
          showToast(panelEl, "👑 작성자 관리 모드가 활성화되었습니다! 수정·삭제·상태변경을 사용해 보세요.");
        });
      }

      // 🚀 끌올하기 버튼
      const bumpBtn = panelEl.querySelector("#hobakDetailBumpBtn");
      if (bumpBtn) {
        bumpBtn.addEventListener("click", () => {
          if (window.HobakData && typeof window.HobakData.bumpProduct === "function") {
            const bumped = window.HobakData.bumpProduct(product.id);
            if (bumped) {
              product.timeAgo = bumped.timeAgo;
              const timeEl = panelEl.querySelector(".hobak-detail-time");
              if (timeEl) timeEl.textContent = bumped.timeAgo;
              showToast(panelEl, "🚀 게시글을 목록 최상단으로 끌어올렸습니다! (Supabase DB 업데이트 완료)");
              if (typeof callbacks.onStatusChange === "function") {
                callbacks.onStatusChange(product.id, product.status);
              }
            }
          }
        });
      }

      // ✏️ 게시글 수정 버튼
      const editBtn = panelEl.querySelector("#hobakDetailEditBtn");
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          if (typeof callbacks.onEditProduct === "function") {
            callbacks.onEditProduct(product);
          }
        });
      }

      // 🗑️ 게시글 삭제 버튼 (안전 확인 모달)
      const deleteBtn = panelEl.querySelector("#hobakDetailDeleteBtn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          const existingModal = panelEl.querySelector(".hobak-detail-modal-backdrop");
          if (existingModal) existingModal.remove();

          const delBackdrop = document.createElement("div");
          delBackdrop.className = "hobak-detail-modal-backdrop";
          delBackdrop.innerHTML = `
            <div class="hobak-detail-confirm-modal" role="dialog" aria-label="게시글 삭제 확인">
              <div class="hobak-confirm-icon">🗑️</div>
              <h3 class="hobak-confirm-title">이 게시글을 삭제하시겠어요?</h3>
              <p class="hobak-confirm-desc">
                <strong>${escapeHtml(product.title)}</strong> 게시글이 목록과 Supabase 데이터베이스에서 함께 삭제됩니다.
              </p>
              <div class="hobak-confirm-btns">
                <button type="button" class="hobak-confirm-cancel">취소</button>
                <button type="button" class="hobak-confirm-delete">삭제하기</button>
              </div>
            </div>
          `;

          delBackdrop.querySelector(".hobak-confirm-cancel").addEventListener("click", () => {
            delBackdrop.remove();
          });
          delBackdrop.addEventListener("click", (ev) => {
            if (ev.target === delBackdrop) delBackdrop.remove();
          });
          delBackdrop.querySelector(".hobak-confirm-delete").addEventListener("click", () => {
            delBackdrop.remove();
            if (window.HobakData && typeof window.HobakData.deleteProduct === "function") {
              const remaining = window.HobakData.deleteProduct(product.id);
              if (typeof callbacks.onDeleteProduct === "function") {
                callbacks.onDeleteProduct(product.id, remaining);
              }
            }
          });

          panelEl.appendChild(delBackdrop);
        });
      }

      // 💰 가격 제안하기 버튼 (추가 아이디어 기능)
      const offerBtn = panelEl.querySelector("#hobakDetailOfferBtn");
      if (offerBtn) {
        offerBtn.addEventListener("click", () => {
          const existingModal = panelEl.querySelector(".hobak-detail-modal-backdrop");
          if (existingModal) existingModal.remove();

          const basePrice = Number(product.price) || 10000;
          const p5 = Math.max(1000, Math.round((basePrice * 0.95) / 1000) * 1000);
          const p10 = Math.max(1000, Math.round((basePrice * 0.9) / 1000) * 1000);
          const p15 = Math.max(1000, Math.round((basePrice * 0.85) / 1000) * 1000);

          const offerBackdrop = document.createElement("div");
          offerBackdrop.className = "hobak-detail-modal-backdrop";
          offerBackdrop.innerHTML = `
            <div class="hobak-detail-confirm-modal" role="dialog" aria-label="가격 제안하기">
              <div class="hobak-confirm-icon">💰</div>
              <h3 class="hobak-confirm-title">판매자에게 가격 제안하기</h3>
              <p class="hobak-confirm-desc">
                현재 판매가 <strong>${basePrice.toLocaleString("ko-KR")}원</strong>입니다. 희망하시는 거래 금액을 선택하거나 입력해 보세요!
              </p>
              <div class="hobak-offer-chips">
                <button type="button" class="hobak-offer-chip" data-offer-val="${p5}">-5% (${p5.toLocaleString("ko-KR")}원)</button>
                <button type="button" class="hobak-offer-chip" data-offer-val="${p10}">-10% (${p10.toLocaleString("ko-KR")}원)</button>
                <button type="button" class="hobak-offer-chip" data-offer-val="${p15}">-15% (${p15.toLocaleString("ko-KR")}원)</button>
              </div>
              <input type="number" id="hobakOfferInput" class="hobak-offer-input" value="${p10}" step="1000" min="1000" />
              <div class="hobak-confirm-btns">
                <button type="button" class="hobak-confirm-cancel">취소</button>
                <button type="button" class="hobak-confirm-submit-offer">제안 보내기</button>
              </div>
            </div>
          `;

          const offerInput = offerBackdrop.querySelector("#hobakOfferInput");
          offerBackdrop.querySelectorAll(".hobak-offer-chip").forEach((chip) => {
            chip.addEventListener("click", () => {
              offerInput.value = chip.getAttribute("data-offer-val");
            });
          });
          offerBackdrop.querySelector(".hobak-confirm-cancel").addEventListener("click", () => {
            offerBackdrop.remove();
          });
          offerBackdrop.querySelector(".hobak-confirm-submit-offer").addEventListener("click", () => {
            const val = Number(offerInput.value) || p10;
            const formattedOffer = `${val.toLocaleString("ko-KR")}원`;
            const senderNick =
              (window.HobakAuth && window.HobakAuth.getNickname && window.HobakAuth.getNickname()) ||
              "호박이웃";
            const msgText = `💰 [가격 제안] 안녕하세요! '${product.title}' 상품을 ${formattedOffer}에 쿨거래 가능할까요?`;

            offerBackdrop.remove();
            if (window.HobakSupabase && typeof window.HobakSupabase.sendChatMessage === "function") {
              window.HobakSupabase.sendChatMessage(product.id, "buyer", senderNick, msgText);
            }
            showToast(panelEl, `💰 ${formattedOffer} 가격 제안을 호박채팅으로 전송했습니다!`);
            setTimeout(() => {
              openMiniChatModal(panelEl, product);
            }, 400);
          });

          panelEl.appendChild(offerBackdrop);
        });
      }

      // 하단 하트(♥ / ♡) 관심 버튼
      const likeBtn = panelEl.querySelector(".hobak-detail-like-btn");
      const heartIcon = panelEl.querySelector(".hobak-detail-heart-icon");
      const likeCountEl = panelEl.querySelector(".hobak-detail-like-count");
      const statLikesEl = panelEl.querySelector(".hobak-detail-stat-likes");

      if (likeBtn) {
        likeBtn.addEventListener("click", () => {
          const updated = window.HobakData.toggleLike(product.id);
          if (!updated) return;

          product.liked = updated.liked;
          product.likes = updated.likes;

          likeBtn.classList.toggle("liked", product.liked);
          likeBtn.classList.remove("pop");
          void likeBtn.offsetWidth; // 리플로우로 애니메이션 재실행
          likeBtn.classList.add("pop");

          if (heartIcon) heartIcon.textContent = product.liked ? "♥" : "♡";
          if (likeCountEl) likeCountEl.textContent = product.likes;
          if (statLikesEl) statLikesEl.textContent = product.likes;

          showToast(
            panelEl,
            product.liked
              ? "🧡 관심 목록에 추가되었습니다."
              : "관심 목록에서 해제되었습니다."
          );

          if (typeof callbacks.onLikeToggle === "function") {
            callbacks.onLikeToggle(product.id, updated);
          }
        });
      }

      // 바로구매 버튼
      if (buyBtn) {
        buyBtn.addEventListener("click", () => {
          if (product.status === "거래완료") return;
          showToast(
            panelEl,
            `🎃 [${product.title}] 호박페이 안전결제 창으로 이동합니다!`
          );
        });
      }

      // 채팅으로 거래하기 버튼
      if (chatBtn) {
        chatBtn.addEventListener("click", () => {
          if (product.status === "거래완료") return;
          openMiniChatModal(panelEl, product);
        });
      }

      // 연관 상품 카드 클릭
      const relatedCards = panelEl.querySelectorAll(".hobak-detail-related-card");
      relatedCards.forEach((card) => {
        card.addEventListener("click", () => {
          const relId = Number(card.getAttribute("data-related-id"));
          if (!relId) return;
          if (typeof callbacks.onSelectRelated === "function") {
            callbacks.onSelectRelated(relId);
          } else {
            this.render(containerEl, relId, callbacks);
          }
        });
      });
    }
  };
})();
