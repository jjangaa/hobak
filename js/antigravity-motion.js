// ==========================================================================
// 호박(Hobak) x Antigravity Design Expert 모션 & 3D 공간 인터랙션 엔진
// Reference: sickn33/agentic-awesome-skills (skills/antigravity-design-expert/SKILL.md)
// ==========================================================================

(function () {
  const AgState = {
    floatEnabled: true,
    tiltEnabled: true,
    isometricEnabled: false
  };

  /**
   * 1. Layer 1: Background Atmosphere (공간 그리드 & 무중력 발광 오브 주입)
   */
  function mountAtmosphereLayer() {
    if (document.querySelector(".ag-atmosphere-layer")) return;

    const layer = document.createElement("div");
    layer.className = "ag-atmosphere-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = `
      <div class="ag-spatial-grid" id="agSpatialGrid"></div>
      <div class="ag-glow-orb orb-pumpkin" id="agOrbPumpkin"></div>
      <div class="ag-glow-orb orb-amber" id="agOrbAmber"></div>
      <div class="ag-glow-orb orb-emerald" id="agOrbEmerald"></div>
    `;
    document.body.prepend(layer);
    document.body.classList.add("ag-float-mode");
  }

  /**
   * 2. 상단 Foreground Floating HUD에 Antigravity Design 컨트롤 스위치 장착
   */
  function mountHudControls() {
    const inner = document.querySelector(".hobak-quick-mode-inner");
    if (!inner || inner.querySelector(".ag-hud-controls")) return;

    const hud = document.createElement("div");
    hud.className = "ag-hud-controls";
    hud.setAttribute("aria-label", "Antigravity Design 효과 제어");
    hud.innerHTML = `
      <button type="button" class="ag-hud-pill is-on" data-ag-toggle="float" title="무중력 부유 애니메이션 (Weightlessness)">
        🪐 무중력 부유 ON
      </button>
      <button type="button" class="ag-hud-pill is-on" data-ag-toggle="tilt" title="마우스 반응형 3D 원근 틸트 (Spatial Depth)">
        ✨ 3D 공간 틸트 ON
      </button>
      <button type="button" class="ag-hud-pill" data-ag-toggle="isometric" title="아이소메트릭 3D 그리드 스냅 (Isometric Snapping)">
        📐 아이소메트릭 3D 그리드 OFF
      </button>
    `;

    inner.appendChild(hud);

    hud.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-ag-toggle]");
      if (!btn) return;
      const type = btn.getAttribute("data-ag-toggle");

      if (type === "float") {
        AgState.floatEnabled = !AgState.floatEnabled;
        document.body.classList.toggle("ag-float-mode", AgState.floatEnabled);
        btn.classList.toggle("is-on", AgState.floatEnabled);
        btn.textContent = AgState.floatEnabled ? "🪐 무중력 부유 ON" : "🪐 무중력 부유 OFF";
      } else if (type === "tilt") {
        AgState.tiltEnabled = !AgState.tiltEnabled;
        btn.classList.toggle("is-on", AgState.tiltEnabled);
        btn.textContent = AgState.tiltEnabled ? "✨ 3D 공간 틸트 ON" : "✨ 3D 공간 틸트 OFF";
        if (!AgState.tiltEnabled) {
          resetAllCardTilts();
        }
      } else if (type === "isometric") {
        AgState.isometricEnabled = !AgState.isometricEnabled;
        document.body.classList.toggle("ag-isometric-mode", AgState.isometricEnabled);
        btn.classList.toggle("is-on", AgState.isometricEnabled);
        btn.textContent = AgState.isometricEnabled
          ? "📐 아이소메트릭 3D 그리드 ON"
          : "📐 아이소메트릭 3D 그리드 OFF";
      }
    });
  }

  /**
   * 3. 3D Spatial Depth & Cursor Proximity Tilt (rotateX, rotateY, translateZ)
   */
  function resetAllCardTilts() {
    document.querySelectorAll(".hobak-product-card").forEach((card) => {
      card.style.transform = "";
    });
  }

  function bindGlobal3DTilt() {
    let rafId = null;

    document.addEventListener("mousemove", (e) => {
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        // 배경 공간 그리드 미세 패럴랙스 (Spatial Depth)
        const gridEl = document.getElementById("agSpatialGrid");
        if (gridEl) {
          const normX = (e.clientX / window.innerWidth - 0.5) * 14;
          const normY = (e.clientY / window.innerHeight - 0.5) * 10;
          gridEl.style.transform = `perspective(1000px) rotateX(${28 - normY * 0.25}deg) rotateY(${normX * 0.2}deg) translate3d(${normX}px, ${normY}px, 0) scale(1.15)`;
        }

        if (!AgState.tiltEnabled) return;

        const card = e.target.closest(".hobak-product-card");
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const pctX = relX / rect.width;
        const pctY = relY / rect.height;

        // rotateX, rotateY 계산 (최대 ±8도)
        const rotateY = (pctX - 0.5) * 15;
        const rotateX = (0.5 - pctY) * 15;

        card.style.setProperty("--ag-mouse-x", `${Math.round(pctX * 100)}%`);
        card.style.setProperty("--ag-mouse-y", `${Math.round(pctY * 100)}%`);

        if (window.gsap) {
          window.gsap.to(card, {
            rotateX,
            rotateY,
            y: -8,
            z: 18,
            scale: 1.02,
            duration: 0.32,
            ease: "power2.out",
            overwrite: "auto"
          });
        } else {
          card.style.transform = `perspective(1000px) translate3d(0, -8px, 18px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;
        }
      });
    });

    document.addEventListener(
      "mouseout",
      (e) => {
        const card = e.target.closest(".hobak-product-card");
        if (!card) return;
        const related = e.relatedTarget;
        if (related && card.contains(related)) return;

        if (window.gsap) {
          window.gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            y: 0,
            z: 0,
            scale: 1,
            duration: 0.45,
            ease: "power3.out",
            clearProps: "transform"
          });
        } else {
          card.style.transform = "";
        }
      },
      true
    );
  }

  /**
   * 4. GSAP + ScrollTrigger (또는 IntersectionObserver 폴백) 입장 모션
   */
  function animateCardsEntry() {
    const cards = document.querySelectorAll(".hobak-product-card:not([data-ag-animated])");
    if (!cards.length) return;

    cards.forEach((c) => c.setAttribute("data-ag-animated", "true"));

    if (window.gsap) {
      if (window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
      }
      window.gsap.fromTo(
        cards,
        { opacity: 0, y: 26, rotateX: 8, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.55,
          stagger: 0.05,
          ease: "power3.out",
          clearProps: "transform,opacity"
        }
      );
    } else {
      cards.forEach((card, idx) => {
        card.style.opacity = "0";
        card.style.transform = "translate3d(0, 22px, 0) scale(0.97)";
        setTimeout(() => {
          card.style.transition = "opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1), transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
          card.style.opacity = "1";
          card.style.transform = "";
        }, idx * 45);
      });
    }
  }

  /**
   * 5. DOM 변경 감지 (필터링/검색/페이지 전환 시 새로 렌더링된 카드에도 Antigravity 모션 자동 적용)
   */
  function observeDomMutations() {
    const listRoot = document.getElementById("hobak-list-root");
    if (!listRoot || typeof MutationObserver === "undefined") return;

    const observer = new MutationObserver(() => {
      animateCardsEntry();
    });
    observer.observe(listRoot, { childList: true, subtree: true });
  }

  function initAntigravityDesign() {
    mountAtmosphereLayer();
    mountHudControls();
    bindGlobal3DTilt();
    animateCardsEntry();
    observeDomMutations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAntigravityDesign);
  } else {
    initAntigravityDesign();
  }

  window.HobakAntigravityDesign = {
    refresh: animateCardsEntry,
    state: AgState
  };
})();
