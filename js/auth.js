// ==========================================================================
// 호박(Hobak) 중고거래 웹서비스 - Supabase Auth 인증 및 로그인/회원가입 모달 모듈
// (js/auth.js)
// 요구사항 반영:
// 1. 이메일/비밀번호 회원가입 & 로그인 모달 + Supabase Auth 연동 + 회원가입 시 닉네임 필수
// 2. 로그인 전: [로그인] 버튼만 표시 / 로그인 후: [닉네임], [로그아웃] 버튼만 표시
// 3. 비로그인 상태에서 글쓰기 클릭 시 로그인 모달 먼저 표시 -> 로그인 성공 시 글쓰기 창 즉시 이동
// 4. 글 등록 시 작성자(seller_id, seller_nickname) DB 저장 및 목록 카드/상세 모달에 닉네임 표시
// ==========================================================================

(function () {
  const AUTH_CACHE_KEY = "hobak_auth_user_v1";

  const AuthState = {
    user: null, // { id, email, nickname }
    pendingCallback: null,
    reasonMessage: ""
  };

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadCachedUser() {
    try {
      const raw = localStorage.getItem(AUTH_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.nickname) {
          AuthState.user = parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  function saveCachedUser(userObj) {
    AuthState.user = userObj;
    try {
      if (userObj) {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(userObj));
      } else {
        localStorage.removeItem(AUTH_CACHE_KEY);
      }
    } catch (e) {
      // ignore
    }
    if (window.HobakListView && typeof window.HobakListView.refreshAll === "function") {
      window.HobakListView.refreshAll();
    }
  }

  /**
   * Supabase Auth 유저 객체에서 닉네임 추출 및 public.profiles 동기화
   */
  async function extractAndSyncProfile(sbUser, explicitNickname) {
    if (!sbUser) return null;
    const client = window.HobakSupabase && window.HobakSupabase.getClient();
    let nickname =
      explicitNickname ||
      sbUser.user_metadata?.nickname ||
      sbUser.raw_user_meta_data?.nickname ||
      "";

    if (client) {
      try {
        // public.profiles에서 auth_user_id로 먼저 조회
        const { data: existingByAuth } = await client
          .from("profiles")
          .select("id, nickname, manner_temp, avatar_bg, neighborhood")
          .eq("auth_user_id", sbUser.id)
          .maybeSingle();

        if (existingByAuth && existingByAuth.nickname) {
          nickname = existingByAuth.nickname;
          return {
            id: sbUser.id,
            profileId: existingByAuth.id,
            email: sbUser.email,
            nickname
          };
        }

        const finalNickname = (nickname || sbUser.email?.split("@")[0] || "호박이웃").trim();

        // 동일 닉네임 프로필이 있는지 확인 후 없으면 생성, 있으면 auth_user_id 연결
        const { data: existingByNick } = await client
          .from("profiles")
          .select("id, nickname")
          .eq("nickname", finalNickname)
          .maybeSingle();

        if (existingByNick && existingByNick.id) {
          await client
            .from("profiles")
            .update({ auth_user_id: sbUser.id })
            .eq("id", existingByNick.id);
          return {
            id: sbUser.id,
            profileId: existingByNick.id,
            email: sbUser.email,
            nickname: finalNickname
          };
        } else {
          const { data: created } = await client
            .from("profiles")
            .insert([
              {
                auth_user_id: sbUser.id,
                nickname: finalNickname,
                avatar_bg: "#FFE8CC",
                manner_temp: 36.5,
                neighborhood: "울산 동구 방어동"
              }
            ])
            .select("id, nickname")
            .single();

          return {
            id: sbUser.id,
            profileId: created?.id || null,
            email: sbUser.email,
            nickname: finalNickname
          };
        }
      } catch (e) {
        console.warn("프로필 동기화 중 폴백:", e);
      }
    }

    return {
      id: sbUser.id,
      profileId: null,
      email: sbUser.email,
      nickname: (nickname || sbUser.email?.split("@")[0] || "호박이웃").trim()
    };
  }

  /**
   * 우측 상단 헤더 인증 버튼 영역 렌더링
   * - 로그인 전: [로그인] 버튼만 표시
   * - 로그인 후: [로그인] 버튼 숨김, [닉네임], [로그아웃] 버튼만 표시
   */
  function renderHeaderAuthButtons() {
    const authContainers = document.querySelectorAll(".hobak-auth-slot");
    authContainers.forEach((slot) => {
      if (!AuthState.user) {
        slot.innerHTML = `
          <div class="hobak-auth-bar">
            <button type="button" class="hobak-auth-login-btn" data-auth-action="open-login">
              로그인
            </button>
          </div>
        `;
      } else {
        slot.innerHTML = `
          <div class="hobak-auth-bar">
            <button type="button" class="hobak-auth-nickname-btn" title="현재 로그인된 호박 이웃 닉네임">
              <span>🎃</span>
              <span>${escapeHtml(AuthState.user.nickname)}</span>
            </button>
            <button type="button" class="hobak-auth-logout-btn" data-auth-action="logout">
              로그아웃
            </button>
          </div>
        `;
      }
    });
  }

  /**
   * 로그인 / 회원가입 모달 열기
   */
  function openModal(options = {}) {
    const existing = document.getElementById("hobakAuthModalBackdrop");
    if (existing) existing.remove();

    AuthState.pendingCallback = typeof options.onSuccess === "function" ? options.onSuccess : null;
    AuthState.reasonMessage = options.reasonMessage || "";
    let currentTab = options.initialTab === "signup" ? "signup" : "login";

    const backdrop = document.createElement("div");
    backdrop.id = "hobakAuthModalBackdrop";
    backdrop.className = "hobak-auth-modal-backdrop";

    function renderModalContent() {
      const isSignup = currentTab === "signup";
      backdrop.innerHTML = `
        <div class="hobak-auth-modal" role="dialog" aria-modal="true" aria-labelledby="hobakAuthModalTitle">
          <button type="button" class="hobak-auth-close-btn" id="hobakAuthCloseBtn" aria-label="모달 닫기">✕</button>
          <div class="hobak-auth-brand">
            <span class="hobak-auth-brand-icon">🎃</span>
            <h2 class="hobak-auth-brand-title" id="hobakAuthModalTitle">
              ${isSignup ? "호박 마켓 회원가입" : "호박 마켓 로그인"}
            </h2>
          </div>
          <p class="hobak-auth-subtitle">
            ${
              isSignup
                ? "이메일과 비밀번호, 그리고 이웃들에게 보여줄 닉네임을 입력해 주세요."
                : "가입하신 이메일과 비밀번호로 로그인해 주세요."
            }
          </p>

          ${
            AuthState.reasonMessage
              ? `<div class="hobak-auth-reason-banner">${escapeHtml(AuthState.reasonMessage)}</div>`
              : ""
          }

          <div class="hobak-auth-tabs" role="tablist">
            <button type="button" class="hobak-auth-tab ${!isSignup ? "is-active" : ""}" data-auth-tab="login">
              로그인
            </button>
            <button type="button" class="hobak-auth-tab ${isSignup ? "is-active" : ""}" data-auth-tab="signup">
              회원가입
            </button>
          </div>

          <form class="hobak-auth-form" id="hobakAuthForm">
            ${
              isSignup
                ? `
                  <div class="hobak-auth-field">
                    <label class="hobak-auth-label" for="hobakAuthNickname">
                      닉네임 <span class="req">* (필수)</span>
                    </label>
                    <input
                      type="text"
                      id="hobakAuthNickname"
                      class="hobak-auth-input"
                      placeholder="예: 방어동호박왕 (목록·상세에 표시됩니다)"
                      maxlength="30"
                      required
                    />
                  </div>
                `
                : ""
            }

            <div class="hobak-auth-field">
              <label class="hobak-auth-label" for="hobakAuthEmail">
                이메일 <span class="req">*</span>
              </label>
              <input
                type="email"
                id="hobakAuthEmail"
                class="hobak-auth-input"
                placeholder="example@hobak.market"
                autocomplete="email"
                required
              />
            </div>

            <div class="hobak-auth-field">
              <label class="hobak-auth-label" for="hobakAuthPassword">
                비밀번호 <span class="req">*</span>
              </label>
              <input
                type="password"
                id="hobakAuthPassword"
                class="hobak-auth-input"
                placeholder="비밀번호 입력 (6자 이상)"
                minlength="6"
                autocomplete="${isSignup ? "new-password" : "current-password"}"
                required
              />
            </div>

            <div class="hobak-auth-msg" id="hobakAuthMsg"></div>

            <button type="submit" class="hobak-auth-submit-btn" id="hobakAuthSubmitBtn">
              ${isSignup ? "회원가입 및 로그인하기" : "로그인하기"}
            </button>
          </form>
        </div>
      `;

      const closeBtn = backdrop.querySelector("#hobakAuthCloseBtn");
      closeBtn.addEventListener("click", () => backdrop.remove());

      const tabBtns = backdrop.querySelectorAll("[data-auth-tab]");
      tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          currentTab = btn.getAttribute("data-auth-tab");
          renderModalContent();
        });
      });

      const form = backdrop.querySelector("#hobakAuthForm");
      const msgEl = backdrop.querySelector("#hobakAuthMsg");
      const submitBtn = backdrop.querySelector("#hobakAuthSubmitBtn");

      function showMessage(text, isError) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.className = `hobak-auth-msg ${isError ? "is-error" : "is-success"}`;
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = (backdrop.querySelector("#hobakAuthEmail")?.value || "").trim();
        const password = backdrop.querySelector("#hobakAuthPassword")?.value || "";
        const nicknameInput = backdrop.querySelector("#hobakAuthNickname");
        const nickname = nicknameInput ? nicknameInput.value.trim() : "";

        if (isSignup && !nickname) {
          showMessage("회원가입 시 닉네임은 필수 입력 항목입니다!", true);
          nicknameInput.focus();
          return;
        }
        if (!email || !password) {
          showMessage("이메일과 비밀번호를 모두 입력해 주세요.", true);
          return;
        }
        if (password.length < 6) {
          showMessage("비밀번호는 최소 6자 이상 입력해 주세요.", true);
          return;
        }

        const client = window.HobakSupabase && window.HobakSupabase.getClient();
        if (!client) {
          showMessage("Supabase 클라이언트를 초기화할 수 없습니다.", true);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = isSignup ? "회원가입 처리 중..." : "로그인 중...";

        try {
          if (isSignup) {
            const { data, error } = await client.auth.signUp({
              email,
              password,
              options: {
                data: {
                  nickname
                }
              }
            });

            if (error) {
              showMessage(`회원가입 오류: ${error.message}`, true);
              submitBtn.disabled = false;
              submitBtn.textContent = "회원가입 및 로그인하기";
              return;
            }

            // 세션이 즉시 발급되지 않은 경우 바로 signInWithPassword 시도
            let activeUser = data?.user;
            if (!data?.session) {
              const signInRes = await client.auth.signInWithPassword({ email, password });
              if (!signInRes.error && signInRes.data?.user) {
                activeUser = signInRes.data.user;
              }
            }

            const syncedUser = await extractAndSyncProfile(activeUser || { id: crypto.randomUUID(), email }, nickname);
            saveCachedUser(syncedUser);
            renderHeaderAuthButtons();

            showMessage(`🎉 환영합니다, ${syncedUser.nickname}님! 회원가입 및 로그인이 완료되었습니다.`, false);
            setTimeout(() => {
              backdrop.remove();
              if (window.HobakListView) {
                window.HobakListView.showToast(`🎃 ${syncedUser.nickname}님으로 로그인되었습니다!`);
              }
              if (typeof AuthState.pendingCallback === "function") {
                const cb = AuthState.pendingCallback;
                AuthState.pendingCallback = null;
                cb(syncedUser);
              }
            }, 450);
          } else {
            const { data, error } = await client.auth.signInWithPassword({
              email,
              password
            });

            if (error || !data?.user) {
              showMessage(
                `로그인 실패: 이메일 또는 비밀번호를 확인해 주세요. (${error?.message || "인증 오류"})`,
                true
              );
              submitBtn.disabled = false;
              submitBtn.textContent = "로그인하기";
              return;
            }

            const syncedUser = await extractAndSyncProfile(data.user);
            saveCachedUser(syncedUser);
            renderHeaderAuthButtons();

            showMessage(`✅ 반가워요, ${syncedUser.nickname}님!`, false);
            setTimeout(() => {
              backdrop.remove();
              if (window.HobakListView) {
                window.HobakListView.showToast(`🎃 ${syncedUser.nickname}님, 환영합니다!`);
              }
              if (typeof AuthState.pendingCallback === "function") {
                const cb = AuthState.pendingCallback;
                AuthState.pendingCallback = null;
                cb(syncedUser);
              }
            }, 350);
          }
        } catch (err) {
          showMessage(`네트워크 오류가 발생했습니다: ${err.message || err}`, true);
          submitBtn.disabled = false;
          submitBtn.textContent = isSignup ? "회원가입 및 로그인하기" : "로그인하기";
        }
      });
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    renderModalContent();
    document.body.appendChild(backdrop);
  }

  /**
   * 로그아웃 처리
   */
  async function logout() {
    const prevNickname = AuthState.user?.nickname || "이웃";
    const client = window.HobakSupabase && window.HobakSupabase.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    saveCachedUser(null);
    renderHeaderAuthButtons();
    if (window.HobakListView) {
      window.HobakListView.showToast(`👋 ${prevNickname}님, 안전하게 로그아웃되었습니다.`);
    }
  }

  /**
   * 초기 세션 복원 및 전역 클릭 이벤트 바인딩
   */
  async function initAuth() {
    loadCachedUser();
    renderHeaderAuthButtons();

    document.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-auth-action]");
      if (!actionBtn) return;
      const action = actionBtn.getAttribute("data-auth-action");
      if (action === "open-login") {
        openModal({ initialTab: "login" });
      } else if (action === "logout") {
        logout();
      }
    });

    const client = window.HobakSupabase && window.HobakSupabase.getClient();
    if (client && client.auth) {
      try {
        const { data } = await client.auth.getSession();
        if (data?.session?.user) {
          const synced = await extractAndSyncProfile(data.session.user);
          saveCachedUser(synced);
          renderHeaderAuthButtons();
        }
      } catch (e) {
        // ignore
      }
    }
  }

  window.HobakAuth = {
    init: initAuth,
    openModal,
    logout,
    renderHeaderAuthButtons,
    isLoggedIn() {
      return Boolean(AuthState.user && AuthState.user.nickname);
    },
    getCurrentUser() {
      return AuthState.user;
    },
    getNickname() {
      return AuthState.user?.nickname || "";
    },
    requireLoginForWrite(onAuthenticatedCallback) {
      if (this.isLoggedIn()) {
        onAuthenticatedCallback(AuthState.user);
      } else {
        openModal({
          initialTab: "login",
          reasonMessage:
            "🎃 물건 팔기(글쓰기)는 로그인 후 이용하실 수 있습니다. 로그인(또는 회원가입) 성공 시 글쓰기 화면으로 바로 이동합니다!",
          onSuccess: onAuthenticatedCallback
        });
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
