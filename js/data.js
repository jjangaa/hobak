// 호박(Hobak) 중고거래 웹서비스 - 초기 가상 데이터 10개 및 상태 관리 모듈
const INITIAL_PRODUCTS = [
  {
    id: 1,
    title: "RadioMaster Zorro 조종기 및 드론 부품 세트",
    price: 209000,
    isFree: false,
    location: "화정동",
    fullLocation: "울산 동구 화정동",
    timeAgo: "끌올 1시간 전",
    category: "디지털기기",
    status: "판매중", // "판매중" | "예약중" | "거래완료"
    quickBuy: false,
    seller: {
      nickname: "헤엄치는오리",
      mannerTemp: 37.2,
      avatarBg: "#FFE8CC"
    },
    images: [
      "https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80"
    ],
    description: "RadioMaster Zorro 조종기와 LiPro 밸런스 충전기, 카본 드론 프레임, 여분 프로펠러(핑크), 배터리까지 풀세트로 양도합니다.\n\n실내 테스트만 몇 번 해본 상태라 작동 완벽하고 외관도 아주 깨끗합니다. 입문용이나 부품용으로 찾으시는 분께 추천드려요! 직거래는 울산 동구 화정동에서 가능합니다.",
    likes: 14,
    chats: 5,
    views: 248,
    liked: false
  },
  {
    id: 2,
    title: "그루퍼너 SJ mz-24 RC 조종기 풀박스",
    price: 114000,
    isFree: false,
    location: "화정동",
    fullLocation: "울산 동구 화정동",
    timeAgo: "끌올 1시간 전",
    category: "취미/게임/음반",
    status: "판매중",
    quickBuy: false,
    seller: {
      nickname: "하늘비행단",
      mannerTemp: 39.5,
      avatarBg: "#D8F5A2"
    },
    images: [
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=800&q=80"
    ],
    description: "그루퍼너(Graupner) SJ mz-24 RC 조종기입니다. 수신기랑 연결 케이블, 전용 하드케이스 모두 포함되어 있습니다.\n\n액정 필름도 안 뗀 상태이며 세팅 초기화해두었습니다. 쿨거래 시 소정의 네고 가능합니다.",
    likes: 8,
    chats: 2,
    views: 185,
    liked: false
  },
  {
    id: 3,
    title: "중공업 우비 세트 (새제품)",
    price: 20000,
    isFree: false,
    location: "대송동",
    fullLocation: "울산 동구 대송동",
    timeAgo: "2시간 전",
    category: "남성의류",
    status: "판매중",
    quickBuy: false,
    seller: {
      nickname: "바다바람",
      mannerTemp: 36.8,
      avatarBg: "#D0EBFF"
    },
    images: [
      "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80"
    ],
    description: "현장 지급받은 튼튼한 방수 우비 상하의 세트 새제품입니다. 전용 파우치에 그대로 보관만 했어요.\n\n사이즈는 넉넉한 L~XL 정도 됩니다. 비 오는 날 작업용이나 낚시용으로 최고입니다.",
    likes: 5,
    chats: 1,
    views: 92,
    liked: false
  },
  {
    id: 4,
    title: "프라다 사피아노 버킷백 핑크",
    price: 10000,
    isFree: false,
    location: "방어동",
    fullLocation: "울산 동구 방어동",
    timeAgo: "8일 전",
    category: "여성잡화",
    status: "거래완료",
    quickBuy: false,
    seller: {
      nickname: "핑크러버",
      mannerTemp: 41.2,
      avatarBg: "#FFDEEB"
    },
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80"
    ],
    description: "산뜻한 라이트 핑크 컬러의 미니 버킷백입니다. 봄여름에 포인트로 들기 정말 예뻐요!\n\n수납공간도 알차고 스트랩 탈부착 가능합니다. 옷장 정리하면서 저렴하게 내놓습니다.",
    likes: 29,
    chats: 11,
    views: 512,
    liked: true
  },
  {
    id: 5,
    title: "아이보리 블랙 단가라 카라 니트",
    price: 6000,
    isFree: false,
    location: "방어동",
    fullLocation: "울산 동구 방어동",
    timeAgo: "5일 전",
    category: "여성의류",
    status: "판매중",
    quickBuy: true,
    seller: {
      nickname: "포근한옷장",
      mannerTemp: 38.4,
      avatarBg: "#FFF3BF"
    },
    images: [
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"
    ],
    description: "아이보리 바탕에 블랙 스트라이프가 들어간 브이넥 카라 니트입니다.\n\n부드러운 원단이라 맨살에 입어도 까슬거림 전혀 없어요. 청바지나 슬랙스 어디에나 잘 어울립니다. 바로구매 환영해요!",
    likes: 12,
    chats: 3,
    views: 164,
    liked: false
  },
  {
    id: 6,
    title: "트위드 배색 자켓 스커트 투피스 세트",
    price: 12000,
    isFree: false,
    location: "방어동",
    fullLocation: "울산 동구 방어동",
    timeAgo: "11일 전",
    category: "여성의류",
    status: "판매중",
    quickBuy: true,
    seller: {
      nickname: "모던클래식",
      mannerTemp: 40.0,
      avatarBg: "#E5DBFF"
    },
    images: [
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80"
    ],
    description: "하객룩이나 모임룩으로 입기 좋은 화사한 아이보리 트위드 자켓 + 스커트 세트입니다.\n\n블랙 라인 배색이 들어가 있어 고급스럽고 깔끔해요. 1회 착용 후 세탁 완료해 두었습니다.",
    likes: 19,
    chats: 4,
    views: 310,
    liked: false
  },
  {
    id: 7,
    title: "스타벅스 아이스 아메리카노 T 2잔 + 생크림 카스테라",
    price: 11500,
    isFree: false,
    location: "화정동",
    fullLocation: "울산 동구 화정동",
    timeAgo: "10일 전",
    category: "기타 중고물품",
    status: "거래완료",
    quickBuy: false,
    seller: {
      nickname: "커피한잔할래요",
      mannerTemp: 42.5,
      avatarBg: "#C3FAE8"
    },
    images: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80"
    ],
    description: "선물받은 스타벅스 기프티콘 세트입니다. 아이스 아메리카노 톨 사이즈 2잔 + 부드러운 생크림 카스테라 구성입니다.\n\n유효기간 넉넉하게 남아있으며 입금 확인 즉시 쿠폰 이미지 전달해 드립니다.",
    likes: 9,
    chats: 6,
    views: 203,
    liked: false
  },
  {
    id: 8,
    title: "HD현대중공업 동복 작업복 상하의 100 사이즈",
    price: 30000,
    isFree: false,
    location: "방어동",
    fullLocation: "울산 동구 방어동",
    timeAgo: "12일 전",
    category: "남성의류",
    status: "예약중",
    quickBuy: false,
    seller: {
      nickname: "울산토박이",
      mannerTemp: 37.9,
      avatarBg: "#FFE3E3"
    },
    images: [
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80"
    ],
    description: "택 달린 미착용 새상품입니다. 상하의 모두 100 사이즈이고 안감 방한 처리가 잘 되어 있어 겨울철에 따뜻하게 입으실 수 있습니다.\n\n방어동 인근에서 직거래 희망합니다.",
    likes: 7,
    chats: 4,
    views: 178,
    liked: false
  },
  {
    id: 9,
    title: "JBL 차지5 블루투스 스피커 레드 풀박스",
    price: 130000,
    isFree: false,
    location: "방어동",
    fullLocation: "울산 동구 방어동",
    timeAgo: "끌올 6일 전",
    category: "디지털기기",
    status: "판매중",
    quickBuy: true,
    seller: {
      nickname: "사운드매니아",
      mannerTemp: 41.8,
      avatarBg: "#FFD8A8"
    },
    images: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80"
    ],
    description: "캠핑 갈 때 쓰려고 샀다가 집에서만 가끔 들은 JBL Charge 5 블루투스 스피커입니다.\n\n중저음 짱짱하고 배터리 오래 갑니다. 방수/방진 기능 완벽하며 정품 박스랑 케이블 그대로 챙겨드려요.",
    likes: 23,
    chats: 5,
    views: 389,
    liked: false
  },
  {
    id: 10,
    title: "아기 침대 범퍼 가드 깨끗한 상품 나눔합니다",
    price: 0,
    isFree: true,
    location: "방어동",
    fullLocation: "울산 동구 방어동",
    timeAgo: "5일 전",
    category: "유아동",
    status: "예약중",
    quickBuy: false,
    seller: {
      nickname: "햇살맘",
      mannerTemp: 45.1,
      avatarBg: "#E9FAC8"
    },
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"
    ],
    description: "아이가 커서 더 이상 사용하지 않는 아기 침대 범퍼 가드 따뜻한 마음으로 나눔합니다.\n\n아기 전용 세제로 깨끗하게 세탁해 두었으며 오염이나 찢어진 곳 없습니다. 필요하신 분 채팅 주세요!",
    likes: 16,
    chats: 8,
    views: 275,
    liked: false
  }
];

const POPULAR_KEYWORDS = [
  "아이온2", "아이온", "아이폰", "컴퓨터",
  "폴드8", "자전거", "의자", "노트북", "픽시",
  "한국시리즈", "플스5", "침대", "더보기"
];

const CATEGORIES = [
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
];

const NEIGHBORHOODS = [
  "울산광역시 동구 방어동",
  "울산광역시 동구 화정동",
  "울산광역시 동구 대송동",
  "울산광역시 동구 전하동",
  "울산광역시 동구 일산동"
];

const STORAGE_KEY = "hobak_products_v1";

window.HobakData = {
  POPULAR_KEYWORDS,
  CATEGORIES,
  NEIGHBORHOODS,

  getProducts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("LocalStorage 로드 실패, 기본 데이터를 사용합니다.", e);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return [...INITIAL_PRODUCTS];
  },

  saveProducts(products) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn("LocalStorage 저장 실패", e);
    }
  },

  getProductById(id) {
    const products = this.getProducts();
    return products.find((p) => Number(p.id) === Number(id)) || null;
  },

  addProduct(newProductData) {
    const products = this.getProducts();
    const nextId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const shortDong = (newProductData.fullLocation || "울산광역시 동구 방어동").split(" ").pop();

    const product = {
      id: nextId,
      title: newProductData.title.trim(),
      price: newProductData.isFree ? 0 : Number(newProductData.price) || 0,
      isFree: Boolean(newProductData.isFree),
      location: newProductData.location || shortDong,
      fullLocation: newProductData.fullLocation ? newProductData.fullLocation.replace("울산광역시", "울산") : `울산 동구 ${shortDong}`,
      timeAgo: "방금 전",
      category: newProductData.category || "디지털기기",
      status: newProductData.status || "판매중",
      quickBuy: Boolean(newProductData.quickBuy),
      seller: {
        nickname: newProductData.sellerNickname || "호박이웃",
        mannerTemp: Number(newProductData.mannerTemp) || 37.5,
        avatarBg: "#FFE8CC"
      },
      images: Array.isArray(newProductData.images) && newProductData.images.length > 0
        ? newProductData.images
        : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"],
      description: newProductData.description || "",
      likes: 0,
      chats: 0,
      views: 1,
      liked: false
    };

    const updated = [product, ...products];
    this.saveProducts(updated);
    if (window.HobakSupabase && typeof window.HobakSupabase.insertProduct === "function") {
      window.HobakSupabase.insertProduct(product);
    }
    return product;
  },

  toggleLike(id) {
    const products = this.getProducts();
    const target = products.find((p) => Number(p.id) === Number(id));
    if (target) {
      target.liked = !target.liked;
      target.likes = Math.max(0, (target.likes || 0) + (target.liked ? 1 : -1));
      this.saveProducts(products);
      if (window.HobakSupabase && typeof window.HobakSupabase.syncLikeToggle === "function") {
        window.HobakSupabase.syncLikeToggle(target.id, target.liked, target.likes);
      } else if (window.HobakSupabase && typeof window.HobakSupabase.updateProductFields === "function") {
        window.HobakSupabase.updateProductFields(target.id, {
          liked: target.liked,
          likes_count: target.likes
        });
      }
    }
    return target;
  },

  updateStatus(id, newStatus) {
    const products = this.getProducts();
    const target = products.find((p) => Number(p.id) === Number(id));
    if (target) {
      target.status = newStatus;
      this.saveProducts(products);
      if (window.HobakSupabase && typeof window.HobakSupabase.updateProductFields === "function") {
        window.HobakSupabase.updateProductFields(target.id, {
          status: target.status
        });
      }
    }
    return target;
  },

  updateProduct(id, updatedData) {
    const products = this.getProducts();
    const idx = products.findIndex((p) => Number(p.id) === Number(id));
    if (idx === -1) return null;

    const current = products[idx];
    const shortDong = (updatedData.fullLocation || current.fullLocation || "울산광역시 동구 방어동")
      .split(" ")
      .pop();

    const updatedProduct = {
      ...current,
      title: (updatedData.title || current.title).trim(),
      price: updatedData.isFree ? 0 : Number(updatedData.price) || 0,
      isFree: Boolean(updatedData.isFree),
      location: updatedData.location || shortDong,
      fullLocation: updatedData.fullLocation
        ? updatedData.fullLocation.replace("울산광역시", "울산")
        : current.fullLocation,
      category: updatedData.category || current.category,
      quickBuy: Boolean(updatedData.quickBuy),
      images:
        Array.isArray(updatedData.images) && updatedData.images.length > 0
          ? updatedData.images
          : current.images,
      description: updatedData.description !== undefined ? updatedData.description : current.description
    };

    products[idx] = updatedProduct;
    this.saveProducts(products);

    if (window.HobakSupabase && typeof window.HobakSupabase.updateProductFields === "function") {
      window.HobakSupabase.updateProductFields(updatedProduct.id, {
        title: updatedProduct.title,
        price: updatedProduct.price,
        is_free: updatedProduct.isFree,
        location: updatedProduct.location,
        full_location: updatedProduct.fullLocation,
        category: updatedProduct.category,
        quick_buy: updatedProduct.quickBuy,
        images: updatedProduct.images,
        description: updatedProduct.description
      });
    }
    return updatedProduct;
  },

  deleteProduct(id) {
    const products = this.getProducts();
    const filtered = products.filter((p) => Number(p.id) !== Number(id));
    this.saveProducts(filtered);

    if (window.HobakSupabase && typeof window.HobakSupabase.deleteProduct === "function") {
      window.HobakSupabase.deleteProduct(id);
    }
    return filtered;
  },

  bumpProduct(id) {
    const products = this.getProducts();
    const idx = products.findIndex((p) => Number(p.id) === Number(id));
    if (idx === -1) return null;

    const target = products[idx];
    target.timeAgo = "끌올 방금 전";
    target.isBumped = true;

    const reordered = [target, ...products.filter((_, i) => i !== idx)];
    this.saveProducts(reordered);

    if (window.HobakSupabase && typeof window.HobakSupabase.updateProductFields === "function") {
      window.HobakSupabase.updateProductFields(target.id, {
        time_ago: "끌올 방금 전",
        is_bumped: true
      });
    }
    return target;
  },

  resetToInitial() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return [...INITIAL_PRODUCTS];
  },

  formatPrice(product) {
    if (product.isFree || Number(product.price) === 0) {
      return "나눔 🧡";
    }
    return `${Number(product.price).toLocaleString("ko-KR")}원`;
  }
};
