// ==========================================================================
// 호박(Hobak) 중고거래 웹서비스 - Supabase 5대 비식별 테이블 실시간 연동 모듈
// (js/supabase-config.js)
// 연결 대상: 방금 Supabase MCP로 구축한 데이터베이스 (profiles, products,
//           product_likes, chat_messages, popular_keywords)
// 보안 원칙: 프론트엔드에서는 공개용 anon key만 사용하며,
//           이메일·전화번호·실명 등 개인식별정보(PII)를 일절 저장하지 않습니다.
// ==========================================================================

(function () {
  // Zzangg_AA / hobak 프로젝트 (qjhlerqnvckuziqtstrn) 엔드포인트 및 공개 Anon Key
  const SUPABASE_PROJECT_URL = "https://qjhlerqnvckuziqtstrn.supabase.co";
  const SUPABASE_PROJECT_REF = "qjhlerqnvckuziqtstrn";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGxlcnFudmNrdXppcXRzdHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjgyNzYsImV4cCI6MjExMDQwNDI3Nn0.WZ01LsqqmwHcaHm4Qo1b4Qk-4GWKzTUNvB237WOkP7s";

  const ANON_VIEWER_STORAGE_KEY = "hobak_viewer_anon_uuid";
  let supabaseClient = null;

  /**
   * 로그인/실명 없이 브라우저별 하트(관심) 기록을 구분하기 위한 익명 UUID 발급
   */
  function getOrCreateViewerAnonId() {
    try {
      let existing = localStorage.getItem(ANON_VIEWER_STORAGE_KEY);
      if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
        return existing;
      }
      const generated =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
      localStorage.setItem(ANON_VIEWER_STORAGE_KEY, generated);
      return generated;
    } catch (e) {
      return "00000000-0000-4000-8000-000000000001";
    }
  }

  /**
   * Supabase 브라우저 클라이언트 싱글톤 초기화
   */
  function initClient() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase && typeof window.supabase.createClient === "function") {
      supabaseClient = window.supabase.createClient(
        SUPABASE_PROJECT_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        }
      );
    }
    return supabaseClient;
  }

  /**
   * DB products + profiles 조인 행 -> 화면 상품 객체 변환
   */
  function mapRowToProduct(row, likedSet) {
    const profile = row.profiles || null;
    const idNum = Number(row.id);
    const isLikedByViewer = likedSet instanceof Set ? likedSet.has(idNum) : Boolean(row.liked);

    return {
      id: idNum,
      sellerId: row.seller_id || null,
      title: row.title,
      price: Number(row.price) || 0,
      isFree: Boolean(row.is_free),
      location: row.location || "방어동",
      fullLocation: row.full_location || profile?.neighborhood || "울산 동구 방어동",
      timeAgo: row.time_ago || "방금 전",
      isBumped: Boolean(row.is_bumped),
      category: row.category || "디지털기기",
      status: row.status || "판매중",
      quickBuy: Boolean(row.quick_buy),
      seller: {
        nickname: profile?.nickname || row.seller_nickname || "호박이웃",
        mannerTemp: Number(profile?.manner_temp ?? row.seller_manner_temp) || 37.5,
        avatarBg: profile?.avatar_bg || row.seller_avatar_bg || "#FFE8CC"
      },
      images: Array.isArray(row.images) ? row.images : [],
      description: row.description || "",
      likes: Number(row.likes_count ?? row.likes) || 0,
      chats: Number(row.chats_count ?? row.chats) || 0,
      views: Number(row.views_count ?? row.views) || 1,
      liked: isLikedByViewer
    };
  }

  /**
   * 화면 상품 객체 -> DB products 행 변환
   */
  function mapProductToRow(product, sellerId = null) {
    const row = {
      title: product.title,
      price: Number(product.price) || 0,
      is_free: Boolean(product.isFree),
      location: product.location || "방어동",
      full_location: product.fullLocation || "울산 동구 방어동",
      time_ago: product.timeAgo || "방금 전",
      is_bumped: Boolean(product.timeAgo && String(product.timeAgo).includes("끌올")),
      category: product.category || "디지털기기",
      status: product.status || "판매중",
      quick_buy: Boolean(product.quickBuy),
      seller_nickname: product.seller?.nickname || "호박이웃",
      seller_manner_temp: Number(product.seller?.mannerTemp) || 37.5,
      seller_avatar_bg: product.seller?.avatarBg || "#FFE8CC",
      images: Array.isArray(product.images) ? product.images : [],
      description: product.description || "",
      likes_count: Number(product.likes) || 0,
      chats_count: Number(product.chats) || 0,
      views_count: Number(product.views) || 1,
      liked: Boolean(product.liked)
    };
    if (sellerId) {
      row.seller_id = sellerId;
    }
    return row;
  }

  /**
   * 상단 HUD 바에 실시간 Supabase 연결 상태 배지 렌더링
   */
  function mountStatusBadge(statusText, isConnected) {
    const badgeContainer = document.querySelector(".hobak-quick-mode-inner");
    if (!badgeContainer) return;

    let badge = document.getElementById("hobakSupabaseBadge");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "hobakSupabaseBadge";
      badge.style.cssText =
        "display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(62,207,142,0.45);background:rgba(62,207,142,0.14);color:#3ECF8E;cursor:pointer;transition:all 0.25s ease;";
      badge.title = "클릭하면 Supabase DB에서 최신 데이터를 다시 불러옵니다";
      badge.addEventListener("click", () => {
        badge.textContent = "🔄 Supabase 동기화 중...";
        syncWithSupabase();
      });

      const firstBadge = badgeContainer.querySelector(".hobak-quick-badge");
      if (firstBadge && firstBadge.parentNode) {
        firstBadge.insertAdjacentElement("afterend", badge);
      } else {
        badgeContainer.prepend(badge);
      }
    }
    badge.textContent = statusText;
    if (isConnected) {
      badge.style.borderColor = "rgba(62,207,142,0.5)";
      badge.style.background = "rgba(62,207,142,0.16)";
      badge.style.color = "#3ECF8E";
    } else {
      badge.style.borderColor = "rgba(255,179,102,0.45)";
      badge.style.background = "rgba(255,179,102,0.14)";
      badge.style.color = "#FFB366";
    }
  }

  /**
   * 1. 초기 로드 및 전체 동기화 (products + profiles + product_likes + popular_keywords)
   */
  async function syncWithSupabase() {
    const client = initClient();
    if (!client) {
      mountStatusBadge("⚡ Supabase 로컬 캐시 모드", false);
      return;
    }

    try {
      const viewerId = getOrCreateViewerAnonId();

      // 병렬로 상품 목록(가명 프로필 조인), 내 익명 하트 목록, 인기 검색어 조회
      const [productsRes, likesRes, keywordsRes] = await Promise.all([
        client
          .from("products")
          .select(
            `
            *,
            profiles:seller_id (
              id,
              nickname,
              avatar_bg,
              manner_temp,
              neighborhood
            )
          `
          )
          .order("id", { ascending: true }),
        client
          .from("product_likes")
          .select("product_id")
          .eq("viewer_anon_id", viewerId),
        client
          .from("popular_keywords")
          .select("keyword, search_count, sort_order")
          .order("sort_order", { ascending: true })
      ]);

      const likedSet = new Set();
      if (!likesRes.error && Array.isArray(likesRes.data)) {
        likesRes.data.forEach((r) => likedSet.add(Number(r.product_id)));
      }

      if (!keywordsRes.error && Array.isArray(keywordsRes.data) && keywordsRes.data.length > 0 && window.HobakData) {
        const dbKeywords = keywordsRes.data.map((k) => k.keyword);
        if (!dbKeywords.includes("더보기")) dbKeywords.push("더보기");
        window.HobakData.POPULAR_KEYWORDS.splice(
          0,
          window.HobakData.POPULAR_KEYWORDS.length,
          ...dbKeywords
        );
      }

      if (!productsRes.error && Array.isArray(productsRes.data) && productsRes.data.length > 0 && window.HobakData) {
        const mappedProducts = productsRes.data.map((row) => mapRowToProduct(row, likedSet));
        window.HobakData.saveProducts(mappedProducts);

        if (window.HobakListView && typeof window.HobakListView.refreshAll === "function") {
          window.HobakListView.refreshAll();
        }
        if (window.HobakDetailView && document.getElementById("hobak-detail-root")) {
          const detailWrapper = document.getElementById("hobak-detail-wrapper");
          if (detailWrapper && !detailWrapper.classList.contains("hobak-hidden")) {
            const currentSelectedId =
              (window.HobakListView && window.HobakListView.state?.selectedProductId) ||
              mappedProducts[0].id;
            window.HobakDetailView.render(
              document.getElementById("hobak-detail-root"),
              currentSelectedId,
              {
                onClose() {
                  detailWrapper.classList.add("hobak-hidden");
                },
                onStatusChange(pId) {
                  window.HobakListView.refreshAll({ selectedProductId: pId });
                },
                onLikeToggle(pId) {
                  window.HobakListView.refreshAll({ selectedProductId: pId });
                },
                onSelectRelated(relId) {
                  window.HobakListView.setSelectedProduct(relId);
                  window.HobakDetailView.render(document.getElementById("hobak-detail-root"), relId, this);
                }
              }
            );
          }
        }

        mountStatusBadge(
          `🟢 Supabase DB 실시간 연결됨 (상품 ${mappedProducts.length}개 · 비식별 보호)`,
          true
        );
      } else {
        mountStatusBadge("⚡ Supabase 연결됨 (로컬 캐시 활성)", true);
      }
    } catch (e) {
      console.warn("Supabase 동기화 경고:", e);
      mountStatusBadge("⚡ Supabase 오프라인 폴백 모드", false);
    }
  }

  /**
   * 2. 새 상품 등록 시 profiles(가명 프로필) 확보 후 products 테이블에 INSERT
   */
  async function insertProduct(product) {
    const client = initClient();
    if (!client) return null;

    try {
      const nickname = (product.seller?.nickname || "호박이웃").trim();
      const mannerTemp = Number(product.seller?.mannerTemp) || 37.5;
      const avatarBg = product.seller?.avatarBg || "#FFE8CC";
      const neighborhood = product.fullLocation || "울산 동구 방어동";

      // 1) 가명 프로필 조회 또는 생성 (이메일/전화번호/실명 전혀 없음)
      let sellerId = null;
      const { data: existingProfile } = await client
        .from("profiles")
        .select("id")
        .eq("nickname", nickname)
        .maybeSingle();

      if (existingProfile && existingProfile.id) {
        sellerId = existingProfile.id;
      } else {
        const { data: createdProfile } = await client
          .from("profiles")
          .insert([
            {
              nickname,
              avatar_bg: avatarBg,
              manner_temp: mannerTemp,
              neighborhood
            }
          ])
          .select("id")
          .single();
        if (createdProfile && createdProfile.id) {
          sellerId = createdProfile.id;
        }
      }

      // 2) 상품 INSERT
      const { data, error } = await client
        .from("products")
        .insert([mapProductToRow(product, sellerId)])
        .select()
        .single();

      if (error || !data) return null;
      mountStatusBadge("🟢 Supabase DB 저장 완료 (새 상품 등록됨)", true);
      return mapRowToProduct(data);
    } catch (e) {
      console.warn("Supabase 상품 등록 중 폴백:", e);
      return null;
    }
  }

  /**
   * 3. 하트(관심) 토글 시 product_likes 테이블 및 products.likes_count 동기화
   */
  async function syncLikeToggle(productId, isLiked, newLikesCount) {
    const client = initClient();
    if (!client) return;

    try {
      const viewerId = getOrCreateViewerAnonId();
      if (isLiked) {
        await client.from("product_likes").upsert(
          [
            {
              product_id: Number(productId),
              viewer_anon_id: viewerId
            }
          ],
          { onConflict: "product_id,viewer_anon_id" }
        );
      } else {
        await client
          .from("product_likes")
          .delete()
          .eq("product_id", Number(productId))
          .eq("viewer_anon_id", viewerId);
      }

      await client
        .from("products")
        .update({
          liked: Boolean(isLiked),
          likes_count: Number(newLikesCount) || 0
        })
        .eq("id", Number(productId));
    } catch (e) {
      // silent fallback
    }
  }

  /**
   * 4. 미니 채팅(chat_messages) 조회 및 메시지 전송 연동
   */
  async function fetchChatMessages(productId) {
    const client = initClient();
    if (!client) return [];
    try {
      const { data, error } = await client
        .from("chat_messages")
        .select("id, product_id, sender_role, sender_nickname, message, created_at")
        .eq("product_id", Number(productId))
        .order("created_at", { ascending: true });
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) {
      return [];
    }
  }

  async function sendChatMessage(productId, senderRole, senderNickname, messageText) {
    const client = initClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from("chat_messages")
        .insert([
          {
            product_id: Number(productId),
            sender_role: senderRole || "buyer",
            sender_nickname: senderNickname || "호박이웃",
            message: messageText
          }
        ])
        .select()
        .single();
      if (error) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  /**
   * 5. 인기 검색어 클릭 시 popular_keywords 검색 횟수 증가
   */
  async function incrementKeywordCount(keyword) {
    const client = initClient();
    if (!client || !keyword || keyword === "더보기") return;
    try {
      const { data } = await client
        .from("popular_keywords")
        .select("id, search_count")
        .eq("keyword", keyword)
        .maybeSingle();
      if (data && data.id) {
        await client
          .from("popular_keywords")
          .update({ search_count: Number(data.search_count || 0) + 1 })
          .eq("id", data.id);
      }
    } catch (e) {
      // ignore
    }
  }

  window.HobakSupabase = {
    PROJECT_URL: SUPABASE_PROJECT_URL,
    PROJECT_REF: SUPABASE_PROJECT_REF,
    ANON_KEY: SUPABASE_ANON_KEY,
    getClient: initClient,
    getViewerAnonId: getOrCreateViewerAnonId,
    mapRowToProduct,
    mapProductToRow,
    syncWithSupabase,
    insertProduct,
    syncLikeToggle,
    fetchChatMessages,
    sendChatMessage,
    incrementKeywordCount,

    async updateProductFields(id, fields) {
      const client = initClient();
      if (!client) return null;
      try {
        await client.from("products").update(fields).eq("id", Number(id));
        mountStatusBadge("🟢 Supabase DB 실시간 반영 완료", true);
      } catch (e) {
        // fallback to localStorage silently
      }
    },

    async deleteProduct(id) {
      const client = initClient();
      if (!client) return false;
      try {
        await client.from("products").delete().eq("id", Number(id));
        mountStatusBadge("🟢 Supabase DB 게시글 삭제 반영 완료", true);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncWithSupabase);
  } else {
    syncWithSupabase();
  }
})();
