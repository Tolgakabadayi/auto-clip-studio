import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type AgentStatus3D = 'idle' | 'working' | 'meeting';

export interface Agent3DMeta {
  id: string;
  role: string;
  name: string;
  avatar: string;
  pod: 1 | 2 | 3;
  podIndex: number;
  model: string;
  department: string;
  title: string;
  accentColor: number;
  deskPos: THREE.Vector3;
  deskRotationY: number;
  meetingPos: THREE.Vector3;
  meetingRotationY: number;
  liveQuote: {
    idle: string;
    working: string;
    meeting: string;
  };
}

export interface Agent3DInstance {
  meta: Agent3DMeta;
  status: AgentStatus3D;
  characterGroup: THREE.Group;
  headMesh: THREE.Mesh;
  visorMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  armsGroup: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  screenMesh: THREE.Mesh;
  monitorLight: THREE.PointLight;
  badgeSprite: THREE.Sprite;
  chairGroup: THREE.Group;
  beaconGroup: THREE.Group;
  beaconBulbMesh: THREE.Mesh;
  beaconLight: THREE.PointLight;
  floorRingMesh: THREE.Mesh;
  baseY: number;
  currentTween?: TWEEN.Tween<any> | null;
}

export const AGENTS_3D_ROSTER: Omit<Agent3DMeta, 'deskPos' | 'deskRotationY' | 'meetingPos' | 'meetingRotationY'>[] = [
  // POD 1 (SOL KANAT - İSTİHBARAT & KEŞİF)
  {
    id: 'trend_hunter',
    role: 'trend_hunter',
    name: 'Hunter Gemma',
    avatar: '🛰️',
    pod: 1,
    podIndex: 0,
    model: 'gemma3:4b',
    department: 'Radar & İstihbarat',
    title: 'Trend & CC Avcısı',
    accentColor: 0xfbbf24,
    liveQuote: {
      idle: 'YouTube CC radarı beklemede. Yeni viral kaynak video için taramaya hazırım.',
      working: 'YouTube Creative Commons ağını tarıyorum, 2.4M izlenmeli potansiyel kaynak keşfettim!',
      meeting: 'Strateji masasındayım. Bulunan CC videonun izlenme ivmesi %94 ile zirvede.',
    },
  },
  {
    id: 'copyright_auditor',
    role: 'copyright_auditor',
    name: 'Legal Qwen',
    avatar: '⚖️',
    pod: 1,
    podIndex: 1,
    model: 'qwen3:8b',
    department: 'Hukuk & Telif Uyum',
    title: 'Telif & Lisans Denetçisi',
    accentColor: 0x10b981,
    liveQuote: {
      idle: 'CC-BY lisans kuralları hafızada yüklü. Telif kontrolleri için beklemedeyim.',
      working: 'Creative Commons 4.0 lisansını ve türev hakları denetliyorum. Transformatif kurgu onaylandı.',
      meeting: 'Hukuki teyit verildi. Yasal atıf açıklaması hazırlandı, ticari hak ihlali riski sıfır.',
    },
  },
  {
    id: 'scout',
    role: 'scout',
    name: 'Scout Gemma',
    avatar: '⚡',
    pod: 1,
    podIndex: 2,
    model: 'gemma3:4b',
    department: 'Keşif & Kanca Madenciliği',
    title: 'Viral Klip Madencisi',
    accentColor: 0xfacc15,
    liveQuote: {
      idle: 'Transkript madencisi devrede. Giriş konuşmalarını filtrelemeye hazırım.',
      working: 'Ses dalgalarını ve transkripti parçalıyorum; 4 adet yüksek enerjili tepe noktası işaretlendi!',
      meeting: 'En yüksek retention oranına sahip 3 aday kesit tespit edildi. Süreler 35-45s bandında.',
    },
  },
  {
    id: 'ceo',
    role: 'ceo',
    name: 'Director Qwen',
    avatar: '👑',
    pod: 1,
    podIndex: 3,
    model: 'qwen3:8b',
    department: 'Yönetim & Karar Süiti',
    title: 'Genel Yayın Yönetmeni & CEO',
    accentColor: 0xa855f7,
    liveQuote: {
      idle: 'Yayın odasındayım. Departmanlardan gelecek aday kesitleri bekliyorum.',
      working: 'Aday klipleri virallik ve duygu eğrisi açısından kıyaslıyorum. 1. aday klip onaylandı!',
      meeting: 'Konsensüsü yönetiyorum. Kanca ve bitiş süreleri kilitlendi, kurgu emri veriyorum.',
    },
  },
  {
    id: 'art_director',
    role: 'art_director',
    name: 'Vision Qwen-VL',
    avatar: '👁️',
    pod: 1,
    podIndex: 4,
    model: 'qwen3-vl:8b',
    department: 'Görsel & Vision Stüdyosu',
    title: 'Görsel Yönetmen (Vision AI)',
    accentColor: 0x06b6d4,
    liveQuote: {
      idle: 'Görsel kadraj modelleri yüklü. 9:16 yüz ve sahne takibine hazırım.',
      working: 'Kareleri tarıyorum; konuşmacının en dramatik yüz ifadesi tespit edildi. 9:16 kadraj kilitlendi.',
      meeting: 'Kapak görseli CTR testini geçti (%92). Yüz merkezi odaklı 9:16 kurgu hazır.',
    },
  },
  {
    id: 'copywriter',
    role: 'copywriter',
    name: 'Copy Qwen',
    avatar: '✍️',
    pod: 1,
    podIndex: 5,
    model: 'qwen3:8b',
    department: 'Yaratıcı Yazarlık & SEO',
    title: 'Sosyal Medya & SEO Yazarı',
    accentColor: 0xec4899,
    liveQuote: {
      idle: 'Viral başlık sözlüğü hazır. Shorts ve TikTok algoritmaları için metinler üreteceğim.',
      working: '3 alternatif merak uyandıran başlık ve 15 adet trend hashtag paketi oluşturuluyor...',
      meeting: 'Başlık konsensüsü sağlandı: "Bunu kimse beklemiyordu..." CTR tahmini %14.8.',
    },
  },

  // POD 2 (SAĞ KANAT - BÜYÜME & AKUSTİK & KALİTE)
  {
    id: 'qa',
    role: 'qa',
    name: 'Auditor Qwen',
    avatar: '🛡️',
    pod: 2,
    podIndex: 0,
    model: 'qwen3:8b',
    department: 'Kalite Güvence & Mantık',
    title: 'Kalite & Mantık Denetçisi',
    accentColor: 0x3b82f6,
    liveQuote: {
      idle: 'Kalite kontrol protokolü aktif. Cümle tamlığı ve süre denetimindeyim.',
      working: 'Cümle akışını ve retorik bütünlüğü puanlıyorum. Kalite skoru: %98.2 (Tam onay).',
      meeting: 'Süre sınırları (42 sn) doğrulandı. Cümle ortasında kesilme tespit edilmedi, yeşil ışık.',
    },
  },
  {
    id: 'scheduler',
    role: 'scheduler',
    name: 'Planner Qwen',
    avatar: '📅',
    pod: 2,
    podIndex: 1,
    model: 'qwen3:8b',
    department: 'Yayın & Büyüme Kulesi',
    title: 'Yayın Planlama Stratejisti',
    accentColor: 0x6366f1,
    liveQuote: {
      idle: 'Algoritma zaman çizelgesi izleniyor. Altın yayın saatleri hazır.',
      working: 'Kitle aktiflik verilerini işliyorum. Bugün 18:30 ve 21:15 altın yuvaları ayrıldı.',
      meeting: 'Yayın takvimi kilitlendi. Klip en yüksek organik etkileşim saatinde yayına alınacak.',
    },
  },
  {
    id: 'hook_architect',
    role: 'hook_architect',
    name: 'Hook Master Qwen',
    avatar: '🪝',
    pod: 2,
    podIndex: 2,
    model: 'qwen3:8b',
    department: 'Psikolojik Merak & CTR',
    title: 'İlk 3 Saniye Kanca Mimarı',
    accentColor: 0xf43f5e,
    liveQuote: {
      idle: 'İzleyici retention modelleri hazır. Parmağı kaydırmayı önleyecek kancalar tasarlayacağım.',
      working: 'İlk 3 saniye hipnotik kanca formülünü inşa ediyorum. Merak katsayısı maksimize edildi.',
      meeting: 'Kanca cümlesi onaylandı. İlk 3 saniyede izleyici düşüşü (drop-off) minimuma çekildi.',
    },
  },
  {
    id: 'seo_specialist',
    role: 'seo_specialist',
    name: 'SEO Qwen',
    avatar: '📈',
    pod: 2,
    podIndex: 3,
    model: 'qwen3:8b',
    department: 'Büyüme & Keşfet Algoritması',
    title: 'Viral SEO Mimarı',
    accentColor: 0x10b981,
    liveQuote: {
      idle: 'Keşfet arama indeksleri taranıyor. Yüksek hacimli anahtar kelimeler izleniyor.',
      working: 'YouTube ve TikTok arama matrisini eşleştiriyorum. 98/100 algoritma uyumu yakalandı.',
      meeting: 'SEO etiketleri ve altyazı kelime frekansı optimize edildi. Keşfet potansiyeli çok yüksek.',
    },
  },
  {
    id: 'sound_designer',
    role: 'sound_designer',
    name: 'Audio Maestro',
    avatar: '🎧',
    pod: 2,
    podIndex: 4,
    model: 'qwen3:8b',
    department: 'Akustik & Dead Air Mühendisliği',
    title: 'Ses Tasarımı & Akış Mühendisi',
    accentColor: 0x8b5cf6,
    liveQuote: {
      idle: 'Spektrum analizörü hazır. Dead-air sessizlikleri kırpmaya hazırım.',
      working: '0.4s üzeri duraklamaları buduyorum. Konuşmacı ses berraklığı eğrisi uygulandı.',
      meeting: 'Akustik dinamikler dengelendi, ritim kusursuz. Kurgu konuşma netliğiyle akıyor.',
    },
  },
  {
    id: 'translator_multilingual',
    role: 'translator_multilingual',
    name: 'Global Polyglot Qwen',
    avatar: '🌐',
    pod: 2,
    podIndex: 5,
    model: 'qwen3:8b',
    department: 'Küresel Çeviri & Yayılma',
    title: 'Çok Dilli Global Uyarlayıcı',
    accentColor: 0x14b8a6,
    liveQuote: {
      idle: 'Çok dilli çeviri matrisi hazır. İngilizce ve İspanyolca uyarlamaya hazırım.',
      working: 'Kurguyu global kitleler için İngilizce ve İspanyolca altyazı paketleriyle donatıyorum.',
      meeting: 'Küresel başlık ve altyazılar tamamlandı. Video dünya çapında keşfete açık.',
    },
  },

  // STRATEGIC DIRECTORS AT CENTRAL WAR ROOM TABLE
  {
    id: 'security_supervisor',
    role: 'security_supervisor',
    name: 'Sentinel Guard',
    avatar: '🛡️',
    pod: 1,
    podIndex: 6,
    model: 'qwen3:8b',
    department: 'Merkezi Güvenlik & Teftiş',
    title: 'Baş Güvenlik & Telif Denetçisi',
    accentColor: 0x6366f1,
    liveQuote: {
      idle: 'Merkezi masadayım. Telif kalkanı ve sahte Creative Commons filtreleri devrede.',
      working: 'Telif haklarını, Content ID müziklerini ve video bütünlüğünü denetliyorum. Sıfır tolerans.',
      meeting: 'Strateji masasındayım. Lisans ve monetizasyon güvenliği %100 onaylandı.',
    },
  },
  {
    id: 'youtube_manager',
    role: 'youtube_manager',
    name: 'Atlas Partner',
    avatar: '🔴',
    pod: 2,
    podIndex: 6,
    model: 'qwen3:8b',
    department: 'YouTube Partner & Analitik',
    title: 'YouTube Kanal & Büyüme Müdürü',
    accentColor: 0xf43f5e,
    liveQuote: {
      idle: 'Canlı analitik masasında yayın yuvalarını ve kanal izlenme ivmesini izliyorum.',
      working: 'YouTube Data API üzerinden toplam izlenme, Shorts etkileşimleri ve CTR verilerini çekiyorum...',
      meeting: 'Strateji masasındayım. Son yüklenen Shorts analizi ve sıradaki yayın yuvası planlandı.',
    },
  },
  {
    id: 'cliffhanger_architect',
    role: 'cliffhanger_architect',
    name: 'Cliffhanger Qwen',
    avatar: '🎬',
    pod: 3,
    podIndex: 0,
    model: 'qwen3:8b',
    department: 'Seri Kurgu & Cliffhanger',
    title: 'Part 1 / Part 2 Seri Mimarı',
    accentColor: 0xf59e0b,
    liveQuote: {
      idle: 'Merkezi strateji masasındayım. Uzun videolardan Part 1 ve Part 2 çıkartmaya hazırım.',
      working: 'Hikaye gerilim eğrisini tarıyorum; en merak uyandırıcı kırılma noktasında (cliffhanger) Part 1 kesimi yapılıyor.',
      meeting: 'Strateji masasındayım. Part 1 ve Part 2 için merak kancaları ve sıralı yayın saatleri bağlandı.',
    },
  },
];

export interface Office3DOptions {
  onSelectAgent?: (agentId: string) => void;
  onHoverAgent?: (agent: Agent3DMeta | null, screenPos?: { x: number; y: number }) => void;
  ollamaHost?: string;
}

export class IsometricOffice3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private agents: Map<string, Agent3DInstance> = new Map();
  private options: Office3DOptions;

  // Animation & Rendering loop state
  private animationFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  private isDisposed = false;

  // Real 3D Environment elements
  private hologramRing!: THREE.Mesh;
  private hologramCore!: THREE.Mesh;
  private serverLeds: THREE.PointLight[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredAgentId: string | null = null;
  private resizeObserver?: ResizeObserver;

  // Camera Framing
  private readonly defaultFrustum = 13.2;
  private readonly defaultCamPos = new THREE.Vector3(15, 16, 15);
  private readonly defaultCamTarget = new THREE.Vector3(0, 0.9, 0);

  constructor(container: HTMLElement, options: Office3DOptions = {}) {
    this.container = container;
    this.options = {
      ollamaHost: 'http://localhost:11434',
      ...options,
    };

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0d17');
    this.scene.fog = new THREE.FogExp2('#0b0d17', 0.013);

    // 2. Isometric Orthographic Camera setup
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 750;
    const aspect = width / height;

    this.camera = new THREE.OrthographicCamera(
      (this.defaultFrustum * aspect) / -2,
      (this.defaultFrustum * aspect) / 2,
      this.defaultFrustum / 2,
      this.defaultFrustum / -2,
      0.1,
      1000
    );

    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultCamTarget);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Stable Orbit Controls
    this.initControls();

    // 5. Build High-Detail Realistic Architecture
    this.initLights();
    this.initOfficeArchitecture();
    this.initScoreboardDisplay();
    this.initCentralStrategyTable();
    this.init12AgentWorkstations();

    // 6. Events & Loop
    this.initEventListeners();
    this.animate();
  }

  /**
   * Initializes butter-smooth OrbitControls
   */
  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.copy(this.defaultCamTarget);
    this.controls.maxPolarAngle = Math.PI / 2.06;
    this.controls.minZoom = 0.55;
    this.controls.maxZoom = 3.6;
  }

  /**
   * Smoothly returns camera to hero isometric view
   */
  public resetCameraView(): void {
    new TWEEN.Tween(this.camera.position)
      .to({ x: this.defaultCamPos.x, y: this.defaultCamPos.y, z: this.defaultCamPos.z }, 850)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(this.controls.target)
      .to({ x: this.defaultCamTarget.x, y: this.defaultCamTarget.y, z: this.defaultCamTarget.z }, 850)
      .easing(TWEEN.Easing.Cubic.Out)
      .start();

    new TWEEN.Tween(this.camera)
      .to({ zoom: 1.0 }, 850)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => this.camera.updateProjectionMatrix())
      .start();
  }

  /**
   * Initializes Warm Studio Key Lights, Neon Rims and Table Glow
   */
  private initLights(): void {
    const ambientLight = new THREE.AmbientLight(0x334155, 1.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(16, 26, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 70;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.0004;
    this.scene.add(dirLight);

    const rimCyan = new THREE.DirectionalLight(0x06b6d4, 1.3);
    rimCyan.position.set(-16, 14, -16);
    this.scene.add(rimCyan);

    const rimPurple = new THREE.DirectionalLight(0xa855f7, 1.1);
    rimPurple.position.set(16, 12, -16);
    this.scene.add(rimPurple);

    // Center Strategy Table Holographic Point Lights
    const tablePointLight = new THREE.PointLight(0x8b5cf6, 4.2, 16, 1.2);
    tablePointLight.position.set(0, 2.5, 0);
    this.scene.add(tablePointLight);

    const tableCyanLight = new THREE.PointLight(0x06b6d4, 3.2, 12, 1.4);
    tableCyanLight.position.set(0, 0.8, 0);
    this.scene.add(tableCyanLight);
  }

  /**
   * Builds the Real Office Environment:
   * Floor parquet/tiles, frosted glass room walls with department signage, server racks, potted plants
   */
  private initOfficeArchitecture(): void {
    const archGroup = new THREE.Group();

    // 1. FLOOR - Modern Dark Slate Parquet with reflections
    const floorGeo = new THREE.PlaneGeometry(42, 42);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x141724,
      roughness: 0.5,
      metalness: 0.35,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    archGroup.add(floor);

    // Subtle technological grid over floor
    const grid = new THREE.GridHelper(34, 34, 0x312e81, 0x1e1b4b);
    grid.position.y = 0.005;
    archGroup.add(grid);

    // 2. POD 1 & POD 2 FLOOR ACCENT BORDERS (ZONING)
    const pod1ZoneGeo = new THREE.PlaneGeometry(7.2, 11.0);
    const pod1ZoneMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.06,
    });
    const pod1Zone = new THREE.Mesh(pod1ZoneGeo, pod1ZoneMat);
    pod1Zone.rotation.x = -Math.PI / 2;
    pod1Zone.position.set(-6.0, 0.008, 0);
    archGroup.add(pod1Zone);

    const pod2ZoneGeo = new THREE.PlaneGeometry(7.2, 11.0);
    const pod2ZoneMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.06,
    });
    const pod2Zone = new THREE.Mesh(pod2ZoneGeo, pod2ZoneMat);
    pod2Zone.rotation.x = -Math.PI / 2;
    pod2Zone.position.set(6.0, 0.008, 0);
    archGroup.add(pod2Zone);

    // 3. BACK WALL & ACOUSTIC PANELS
    const backWallGeo = new THREE.BoxGeometry(32, 6.5, 0.3);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f1422,
      roughness: 0.8,
      metalness: 0.2,
    });
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 3.25, -10.5);
    backWall.receiveShadow = true;
    archGroup.add(backWall);

    // Neon Horizontal Lighting Bar on Back Wall
    const lightBarGeo = new THREE.BoxGeometry(30, 0.08, 0.08);
    const lightBarMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
    lightBar.position.set(0, 5.2, -10.3);
    archGroup.add(lightBar);

    // 4. GLASS PARTITIONS & DOORS (SEPARATING PODS & MEETING ROOM)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      metalness: 0.8,
    });
    const glassFrameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.9,
    });

    // West Partition (Pod 1 Glass Wall)
    const p1GlassGeo = new THREE.BoxGeometry(0.08, 4.5, 9.5);
    const p1Glass = new THREE.Mesh(p1GlassGeo, glassMat);
    p1Glass.position.set(-10.2, 2.25, 0);
    archGroup.add(p1Glass);

    const p1FrameGeo = new THREE.BoxGeometry(0.12, 4.6, 0.15);
    const p1Frame = new THREE.Mesh(p1FrameGeo, glassFrameMat);
    p1Frame.position.set(-10.2, 2.3, -4.75);
    archGroup.add(p1Frame);

    // East Partition (Pod 2 Glass Wall)
    const p2GlassGeo = new THREE.BoxGeometry(0.08, 4.5, 9.5);
    const p2Glass = new THREE.Mesh(p2GlassGeo, glassMat);
    p2Glass.position.set(10.2, 2.25, 0);
    archGroup.add(p2Glass);

    // 5. SERVER RACKS IN NORTH CORNERS (With Flickering Status LEDs)
    const rackGeo = new THREE.BoxGeometry(1.6, 4.8, 1.4);
    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e17,
      roughness: 0.5,
      metalness: 0.8,
    });

    const rackWest = new THREE.Mesh(rackGeo, rackMat);
    rackWest.position.set(-12.5, 2.4, -9.0);
    rackWest.castShadow = true;
    archGroup.add(rackWest);

    const rackEast = new THREE.Mesh(rackGeo, rackMat);
    rackEast.position.set(12.5, 2.4, -9.0);
    rackEast.castShadow = true;
    archGroup.add(rackEast);

    // Blinking Server Status Point Lights
    const ledW = new THREE.PointLight(0x10b981, 1.8, 5, 2);
    ledW.position.set(-12.0, 3.2, -8.2);
    archGroup.add(ledW);
    this.serverLeds.push(ledW);

    const ledE = new THREE.PointLight(0x06b6d4, 1.8, 5, 2);
    ledE.position.set(12.0, 3.2, -8.2);
    archGroup.add(ledE);
    this.serverLeds.push(ledE);

    // 6. MODERN OFFICE POTTED PLANTS (Monstera / Ficus)
    const potGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.9, 16);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 });

    const createPlant = (x: number, z: number) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(x, 0, z);

      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.y = 0.45;
      pot.castShadow = true;
      plantGroup.add(pot);

      for (let i = 0; i < 5; i++) {
        const leafGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const leaf = new THREE.Mesh(leafGeo, plantMat);
        const ang = (i / 5) * Math.PI * 2;
        leaf.scale.set(1.1, 0.25, 0.8);
        leaf.position.set(Math.cos(ang) * 0.35, 1.0 + i * 0.12, Math.sin(ang) * 0.35);
        leaf.rotation.z = 0.35;
        plantGroup.add(leaf);
      }
      return plantGroup;
    };

    archGroup.add(createPlant(-10.5, 5.8));
    archGroup.add(createPlant(10.5, 5.8));

    this.scene.add(archGroup);
  }

  /**
   * Builds the Cylindrical Central Strategy Table at (0, 0, 0)
   */
  private initCentralStrategyTable(): void {
    const tableGroup = new THREE.Group();

    // 1. Base pedestal
    const baseGeo = new THREE.CylinderGeometry(2.3, 2.5, 0.25, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.125;
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    tableGroup.add(baseMesh);

    // 2. Main Strategy Table Surface
    const tableTopGeo = new THREE.CylinderGeometry(2.0, 2.1, 0.45, 48);
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.25,
      metalness: 0.85,
    });
    const tableTopMesh = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableTopMesh.position.y = 0.475;
    tableTopMesh.receiveShadow = true;
    tableTopMesh.castShadow = true;
    tableGroup.add(tableTopMesh);

    // 3. Glowing neon purple circular edge
    const edgeTorusGeo = new THREE.TorusGeometry(2.04, 0.035, 16, 64);
    const edgeTorusMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
    const edgeTorus = new THREE.Mesh(edgeTorusGeo, edgeTorusMat);
    edgeTorus.rotation.x = Math.PI / 2;
    edgeTorus.position.y = 0.71;
    tableGroup.add(edgeTorus);

    // 4. Inner holographic core
    const holoCoreGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.18, 32);
    const holoCoreMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });
    this.hologramCore = new THREE.Mesh(holoCoreGeo, holoCoreMat);
    this.hologramCore.position.y = 0.8;
    tableGroup.add(this.hologramCore);

    // 5. Floating Hologram Animated Rings
    const ringGeo = new THREE.TorusGeometry(1.0, 0.04, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    this.hologramRing = new THREE.Mesh(ringGeo, ringMat);
    this.hologramRing.position.y = 1.45;
    this.hologramRing.rotation.x = Math.PI / 3;
    tableGroup.add(this.hologramRing);

    // 6. Holographic Strategy Table Label
    const tableBadge = this.createLabelSprite('⚡ NEXUS COMMAND', '', '#8b5cf6', 3.2, 0.65, 'AI WAR ROOM HQ');
    tableBadge.position.set(0, 2.75, 0);
    tableGroup.add(tableBadge);

    this.scene.add(tableGroup);
  }

  private scoreboardTexture?: THREE.CanvasTexture;
  private scoreboardScreenMesh?: THREE.Mesh;

  /**
   * Builds the High-Tech Cyber Scoreboard TV on the back wall for live YouTube metrics
   */
  private initScoreboardDisplay(): void {
    const scoreboardGroup = new THREE.Group();
    scoreboardGroup.position.set(0, 3.8, -10.2);

    // 1. Heavy Cyber Bezel & Chassis
    const chassisGeo = new THREE.BoxGeometry(9.6, 4.2, 0.25);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x070913,
      metalness: 0.85,
      roughness: 0.25,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.castShadow = true;
    scoreboardGroup.add(chassis);

    // 2. Neon Red/Rose Edge Glow Trim
    const trimGeo = new THREE.BoxGeometry(9.68, 4.28, 0.04);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.z = 0.05;
    scoreboardGroup.add(trim);

    // 3. Screen Canvas & Texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    this.renderScoreboardCanvas(canvas, {
      totalViews: 0,
      subscriberCount: 0,
      totalVideos: 0,
      nextScheduled: 'Otomatik Beklemede',
      totalLikes: 0,
    });

    this.scoreboardTexture = new THREE.CanvasTexture(canvas);
    this.scoreboardTexture.minFilter = THREE.LinearFilter;

    const screenGeo = new THREE.PlaneGeometry(9.4, 4.0);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.scoreboardTexture,
      toneMapped: false,
    });
    this.scoreboardScreenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.scoreboardScreenMesh.position.z = 0.14;
    scoreboardGroup.add(this.scoreboardScreenMesh);

    // 4. Click HitBox on the Screen (Selecting youtube_manager opens YouTube Analytics Suite!)
    const hitGeo = new THREE.BoxGeometry(9.4, 4.0, 0.6);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.z = 0.2;
    hitBox.userData = { agentId: 'youtube_manager', isScoreboard: true };
    scoreboardGroup.add(hitBox);

    // 5. Ambient Cyber Neon Spot Light onto the room
    const tvLight = new THREE.PointLight(0xf43f5e, 2.2, 10, 1.8);
    tvLight.position.set(0, 0, 1.2);
    scoreboardGroup.add(tvLight);

    this.scene.add(scoreboardGroup);
  }

  /**
   * Draws dynamic high-resolution scoreboard graphics onto HTML Canvas
   */
  private renderScoreboardCanvas(
    canvas: HTMLCanvasElement,
    stats: {
      totalViews?: number;
      subscriberCount?: number;
      totalVideos?: number;
      nextScheduled?: string;
      totalLikes?: number;
      sumOfVideoViews?: number;
    }
  ): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Gradient (Cyber Black to Deep Red/Purple)
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#090a14');
    bgGrad.addColorStop(0.5, '#0f1122');
    bgGrad.addColorStop(1, '#1a0d1e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Digital Grid Lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Top Header Banner
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.fillRect(0, 0, canvas.width, 74);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, 74);

    ctx.font = 'bold 30px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔴 YOUTUBE PARTNER CANLI SCOREBOARD', 32, 38);

    ctx.textAlign = 'right';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText('● 24/7 OTOMATİK YAYIN AKTİF', canvas.width - 32, 38);

    // 4 Real-time Score Cards (Total Views, Live Subs, Published Shorts, Total Engagement)
    const totalViews = stats.totalViews || 0;
    const totalVideos = stats.totalVideos || 0;
    const totalLikes = stats.totalLikes || 0;
    const subscribers = stats.subscriberCount || 0;
    const avgViewsPerVideo = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
    const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0.0';

    const cards = [
      {
        label: 'TOPLAM İZLENME',
        value: totalViews.toLocaleString('tr-TR'),
        color: '#f43f5e',
        badge: avgViewsPerVideo > 0 ? `Ort. ${avgViewsPerVideo.toLocaleString('tr-TR')} / Video` : 'Canlı YouTube',
      },
      {
        label: 'ABONE SAYISI',
        value: subscribers.toLocaleString('tr-TR'),
        color: '#38bdf8',
        badge: subscribers > 0 ? `${subscribers.toLocaleString('tr-TR')} Aktif Abone` : 'Canlı Kanal',
      },
      {
        label: 'YÜKLENEN SHORTS',
        value: `${totalVideos} Video`,
        color: '#fbbf24',
        badge: 'Otopilot & Stüdyo',
      },
      {
        label: 'TOPLAM ETKİLEŞİM',
        value: `${totalLikes.toLocaleString('tr-TR')} Beğeni`,
        color: '#10b981',
        badge: totalViews > 0 ? `%${engagementRate} Etkileşim Oranı` : 'Topluluk Reaksiyonu',
      },
    ];

    const cardW = 220;
    const cardH = 160;
    const startX = 36;
    const gapX = 26;
    const cardY = 100;

    cards.forEach((c, idx) => {
      const x = startX + idx * (cardW + gapX);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, cardY, cardW, cardH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(c.label, x + 16, cardY + 32);

      ctx.font = 'bold 26px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(c.value, x + 16, cardY + 78);

      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = c.color;
      ctx.fillText(c.badge, x + 16, cardY + 124);
    });

    // Bottom Status Strip
    const bottomY = 290;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX, bottomY, canvas.width - startX * 2, 140, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText('⏱️ SIRADAKİ OTOPİLOT YAYINI:', startX + 24, bottomY + 45);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(stats.nextScheduled || '18:30 (10 dk öncesinde otonom üretim başlar)', startX + 340, bottomY + 45);

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('👉 DETAYLI KANAL VE VİDEO ANALİZLERİNİ AÇMAK İÇİN BU EKRANA TIKLAYIN', canvas.width / 2, bottomY + 102);
  }

  /**
   * Updates scoreboard texture when new real analytics arrive
   */
  public updateScoreboardStats(stats: {
    totalViews?: number;
    subscriberCount?: number;
    totalVideos?: number;
    nextScheduled?: string;
    totalLikes?: number;
    sumOfVideoViews?: number;
  }): void {
    if (!this.scoreboardTexture || !this.scoreboardTexture.image) return;
    this.renderScoreboardCanvas(this.scoreboardTexture.image, stats);
    this.scoreboardTexture.needsUpdate = true;
  }

  /**
   * Initializes 14 Desks and Characters across Pod 1, Pod 2, and Central Table
   */
  private init12AgentWorkstations(): void {
    const totalAgents = AGENTS_3D_ROSTER.length; // 14
    const meetingRadius = 3.2; // Tightly framing the center strategy table

    AGENTS_3D_ROSTER.forEach((baseMeta, index) => {
      let deskX = 0;
      let deskZ = 0;
      let deskRotY = 0;

      const isPod1 = baseMeta.pod === 1;
      const col = baseMeta.podIndex % 2; // 0 or 1
      const row = Math.floor(baseMeta.podIndex / 2); // 0, 1, 2

      const zOffsets = [-3.8, 0.0, 3.8];
      const zPos = zOffsets[row] || 0.0;

      if (baseMeta.id === 'security_supervisor') {
        // Stationed right at Central Table (West side)
        deskX = -2.7;
        deskZ = 0.0;
        deskRotY = Math.PI / 2;
      } else if (baseMeta.id === 'youtube_manager') {
        // Stationed right at Central Table (East side)
        deskX = 2.7;
        deskZ = 0.0;
        deskRotY = -Math.PI / 2;
      } else if (baseMeta.id === 'cliffhanger_architect') {
        // Stationed right at Central Table (South side, facing North towards table center)
        deskX = 0.0;
        deskZ = 2.8;
        deskRotY = Math.PI;
      } else if (isPod1) {
        deskX = col === 0 ? -4.5 : -7.5;
        deskZ = zPos;
        deskRotY = Math.PI / 2; // Facing towards center (+X)
      } else {
        deskX = col === 0 ? 4.5 : 7.5;
        deskZ = zPos;
        deskRotY = -Math.PI / 2; // Facing towards center (-X)
      }

      // Circular meeting spot around center table
      const angle = (index / totalAgents) * Math.PI * 2 + Math.PI / 12;
      let meetingX = Math.cos(angle) * meetingRadius;
      let meetingZ = Math.sin(angle) * meetingRadius;
      let meetingRotY = Math.atan2(-meetingX, -meetingZ);

      if (baseMeta.id === 'security_supervisor') {
        meetingX = -2.2;
        meetingZ = 0.0;
        meetingRotY = Math.PI / 2;
      } else if (baseMeta.id === 'youtube_manager') {
        meetingX = 2.2;
        meetingZ = 0.0;
        meetingRotY = -Math.PI / 2;
      } else if (baseMeta.id === 'cliffhanger_architect') {
        meetingX = 0.0;
        meetingZ = 2.2;
        meetingRotY = Math.PI;
      }

      const meta: Agent3DMeta = {
        ...baseMeta,
        deskPos: new THREE.Vector3(deskX, 0, deskZ),
        deskRotationY: deskRotY,
        meetingPos: new THREE.Vector3(meetingX, 0, meetingZ),
        meetingRotationY: meetingRotY,
      };

      const instance = this.createAgentWorkstation(meta);
      this.agents.set(meta.id, instance);
      this.agents.set(meta.role, instance);
    });
  }

  /**
   * Constructs the 3D meshes for a single agent workstation
   */
  private createAgentWorkstation(meta: Agent3DMeta): Agent3DInstance {
    const stationGroup = new THREE.Group();
    stationGroup.position.copy(meta.deskPos);
    stationGroup.rotation.y = meta.deskRotationY;

    // --- 1. THE DESK ---
    const deskGroup = new THREE.Group();

    // Table top
    const topGeo = new THREE.BoxGeometry(2.5, 0.09, 1.35);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.45,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 0.95;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    deskGroup.add(topMesh);

    // Accent glow strip along desk edge
    const deskTrimGeo = new THREE.BoxGeometry(2.52, 0.035, 0.035);
    const deskTrimMat = new THREE.MeshBasicMaterial({ color: meta.accentColor });
    const deskTrim = new THREE.Mesh(deskTrimGeo, deskTrimMat);
    deskTrim.position.set(0, 0.92, -0.66);
    deskGroup.add(deskTrim);

    // Sturdy metal legs
    const legGeo = new THREE.BoxGeometry(0.09, 0.95, 1.15);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.7,
    });
    const legLeft = new THREE.Mesh(legGeo, legMat);
    legLeft.position.set(-1.1, 0.475, 0);
    legLeft.castShadow = true;
    deskGroup.add(legLeft);

    const legRight = legLeft.clone();
    legRight.position.x = 1.1;
    deskGroup.add(legRight);

    // --- 2. CURVED ULTRAWIDE MONITOR ---
    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(0, 1.0, 0.38);

    const standBaseGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.035, 16);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const standBase = new THREE.Mesh(standBaseGeo, standMat);
    standBase.position.y = 0.018;
    monitorGroup.add(standBase);

    const standPoleGeo = new THREE.BoxGeometry(0.08, 0.48, 0.08);
    const standPole = new THREE.Mesh(standPoleGeo, standMat);
    standPole.position.set(0, 0.24, 0.05);
    monitorGroup.add(standPole);

    const screenBezelGeo = new THREE.BoxGeometry(1.9, 0.85, 0.06);
    const screenBezel = new THREE.Mesh(screenBezelGeo, standMat);
    screenBezel.position.set(0, 0.55, 0);
    monitorGroup.add(screenBezel);

    const screenGeo = new THREE.PlaneGeometry(1.82, 0.77);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      emissive: meta.accentColor,
      emissiveIntensity: 0.35,
      roughness: 0.2,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.55, -0.031);
    screenMesh.rotation.y = Math.PI;
    monitorGroup.add(screenMesh);

    const monitorLight = new THREE.PointLight(meta.accentColor, 0.9, 5.0, 1.4);
    monitorLight.position.set(0, 0.55, -0.4);
    monitorGroup.add(monitorLight);

    // --- WORK BEACON & STATUS LIGHT (Çalıştığını belirten yanıp sönen ışık) ---
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(0, 0.98, -0.02); // on top of monitor bezel

    const beaconPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8);
    const beaconPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const beaconPole = new THREE.Mesh(beaconPoleGeo, beaconPoleMat);
    beaconPole.position.y = 0.08;
    beaconGroup.add(beaconPole);

    // Flashing Beacon Bulb (Translucent Dome)
    const beaconBulbGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const beaconBulbMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const beaconBulbMesh = new THREE.Mesh(beaconBulbGeo, beaconBulbMat);
    beaconBulbMesh.position.y = 0.20;
    beaconGroup.add(beaconBulbMesh);

    // High intensity flashing point light
    const beaconLight = new THREE.PointLight(0xfbbf24, 0, 8.0, 1.4);
    beaconLight.position.set(0, 0.22, 0);
    beaconGroup.add(beaconLight);

    monitorGroup.add(beaconGroup);

    // Keyboard & Mouse
    const kbGeo = new THREE.BoxGeometry(0.8, 0.025, 0.28);
    const kbMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.6 });
    const kbMesh = new THREE.Mesh(kbGeo, kbMat);
    kbMesh.position.set(0, 0.965, -0.05);
    deskGroup.add(kbMesh);

    const mouseGeo = new THREE.BoxGeometry(0.12, 0.025, 0.18);
    const mouseMesh = new THREE.Mesh(mouseGeo, kbMat);
    mouseMesh.position.set(0.65, 0.965, -0.05);
    deskGroup.add(mouseMesh);

    // Coffee Mug on Desk
    const mugGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.16, 12);
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.set(-0.75, 1.03, -0.05);
    deskGroup.add(mug);

    deskGroup.add(monitorGroup);
    stationGroup.add(deskGroup);

    // Holographic Active Floor Spotlight Ring (2D'deki gibi ışık halkası)
    const floorRingGeo = new THREE.RingGeometry(1.4, 1.65, 32);
    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const floorRingMesh = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRingMesh.rotation.x = -Math.PI / 2;
    floorRingMesh.position.set(0, 0.015, -0.2);
    floorRingMesh.visible = false;
    stationGroup.add(floorRingMesh);

    // --- 3. ERGONOMIC CHAIR ---
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, -0.6);

    const seatGeo = new THREE.BoxGeometry(0.8, 0.09, 0.75);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
    const seatMesh = new THREE.Mesh(seatGeo, chairMat);
    seatMesh.position.y = 0.55;
    seatMesh.castShadow = true;
    chairGroup.add(seatMesh);

    const backGeo = new THREE.BoxGeometry(0.75, 0.9, 0.09);
    const backMesh = new THREE.Mesh(backGeo, chairMat);
    backMesh.position.set(0, 1.05, -0.32);
    backMesh.castShadow = true;
    chairGroup.add(backMesh);

    stationGroup.add(chairGroup);
    this.scene.add(stationGroup);

    // --- 4. STYLIZED 3D AGENT CHARACTER ---
    const characterGroup = new THREE.Group();
    characterGroup.position.copy(meta.deskPos);
    const chairOffset = new THREE.Vector3(0, 0, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), meta.deskRotationY);
    characterGroup.position.add(chairOffset);
    characterGroup.rotation.y = meta.deskRotationY;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.75, 0.42);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.4,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.98;
    bodyMesh.castShadow = true;
    characterGroup.add(bodyMesh);

    // Torso Accent Line
    const torsoStripeGeo = new THREE.BoxGeometry(0.16, 0.76, 0.43);
    const torsoStripeMat = new THREE.MeshBasicMaterial({ color: meta.accentColor });
    const torsoStripe = new THREE.Mesh(torsoStripeGeo, torsoStripeMat);
    torsoStripe.position.y = 0.98;
    characterGroup.add(torsoStripe);

    // Head
    const headGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.6,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.58;
    headMesh.castShadow = true;
    characterGroup.add(headMesh);

    // Visor Face
    const visorGeo = new THREE.BoxGeometry(0.4, 0.18, 0.08);
    const visorMat = new THREE.MeshBasicMaterial({ color: meta.accentColor });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 1.58, 0.22);
    characterGroup.add(visorMesh);

    // Arms
    const armsGroup = new THREE.Group();
    armsGroup.position.set(0, 0.98, 0);

    const armGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.38, 0, 0.15);
    leftArm.rotation.x = -Math.PI / 4;
    armsGroup.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.38;
    armsGroup.add(rightArm);

    characterGroup.add(armsGroup);

    // Prominent High-DPI Name & Avatar Sprite Badge
    const badgeSprite = this.createLabelSprite(
      meta.name,
      meta.avatar,
      `#${meta.accentColor.toString(16).padStart(6, '0')}`,
      2.7,
      0.65,
      meta.model
    );
    badgeSprite.position.set(0, 2.3, 0);
    characterGroup.add(badgeSprite);

    // Click & Hover Hitbox
    const hitBoxGeo = new THREE.BoxGeometry(2.3, 2.6, 2.3);
    const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
    hitBox.position.y = 1.3;
    hitBox.userData = { agentId: meta.id };
    characterGroup.add(hitBox);

    this.scene.add(characterGroup);

    return {
      meta,
      status: 'idle',
      characterGroup,
      headMesh,
      visorMesh,
      bodyMesh,
      armsGroup,
      leftArm,
      rightArm,
      screenMesh,
      monitorLight,
      badgeSprite,
      chairGroup,
      beaconGroup,
      beaconBulbMesh,
      beaconLight,
      floorRingMesh,
      baseY: characterGroup.position.y,
      currentTween: null,
    };
  }

  /**
   * Generates a sleek, high-DPI HTML Canvas Texture Sprite for 3D Agent Badges
   */
  private createLabelSprite(
    text: string,
    emoji: string,
    colorHex: string,
    width = 2.7,
    height = 0.65,
    subBadge?: string
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    // Rounded background pill
    ctx.fillStyle = 'rgba(10, 14, 26, 0.92)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(16, 16, 608, 128, 64);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 44px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = emoji ? `${emoji} ${text}` : text;
    ctx.fillText(label, 320, subBadge ? 65 : 80);

    if (subBadge) {
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = colorHex;
      ctx.fillText(`[${subBadge}]`, 320, 110);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(width, height, 1);
    return sprite;
  }

  /**
   * Dynamically redraws 3D Agent Overhead Badge Canvas Texture for Working / Idle state
   */
  private updateAgentBadgeTexture(agent: Agent3DInstance, isWorking: boolean): void {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    const colorHex = isWorking
      ? '#f59e0b'
      : `#${agent.meta.accentColor.toString(16).padStart(6, '0')}`;

    // Rounded background pill
    ctx.fillStyle = isWorking ? 'rgba(24, 15, 6, 0.96)' : 'rgba(10, 14, 26, 0.92)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = isWorking ? 9 : 6;
    if (isWorking) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.roundRect(16, 16, 608, 128, 64);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 44px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = `${agent.meta.avatar} ${agent.meta.name}`;
    ctx.fillText(label, 320, 65);

    if (isWorking) {
      ctx.font = '900 24px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.fillText('🔥 ŞU AN ÇALIŞIYOR', 320, 110);
    } else {
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = colorHex;
      ctx.fillText(`[${agent.meta.model}]`, 320, 110);
    }

    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.minFilter = THREE.LinearFilter;
    const mat = agent.badgeSprite.material as THREE.SpriteMaterial;
    if (mat.map) mat.map.dispose();
    mat.map = newTexture;
    mat.needsUpdate = true;
  }

  /**
   * Updates an agent's operational status ('idle' | 'working' | 'meeting') with TWEEN animations
   */
  public setAgentStatus(agentId: string, status: AgentStatus3D): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`[Office3D] Agent not found: ${agentId}`);
      return;
    }

    if (agent.status === status) return;
    const oldStatus = agent.status;
    agent.status = status;

    if (agent.currentTween) {
      agent.currentTween.stop();
      agent.currentTween = null;
    }

    // 1. MONITOR SCREEN, BEACON LIGHT & BADGE RESPONSE
    if (status === 'working') {
      (agent.screenMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xf59e0b); // Golden Amber
      (agent.screenMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.5;
      agent.monitorLight.color.setHex(0xf59e0b);
      agent.monitorLight.intensity = 4.0;
      agent.floorRingMesh.visible = true;
      this.updateAgentBadgeTexture(agent, true);
    } else if (status === 'idle') {
      (agent.screenMesh.material as THREE.MeshStandardMaterial).emissive.setHex(agent.meta.accentColor);
      (agent.screenMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
      agent.monitorLight.color.setHex(agent.meta.accentColor);
      agent.monitorLight.intensity = 0.8;
      agent.beaconLight.intensity = 0;
      (agent.beaconBulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      agent.floorRingMesh.visible = false;
      this.updateAgentBadgeTexture(agent, false);
    } else if (status === 'meeting') {
      (agent.screenMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x0f172a);
      (agent.screenMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
      agent.monitorLight.intensity = 0.2;
      agent.beaconLight.intensity = 0;
      (agent.beaconBulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      agent.floorRingMesh.visible = false;
      this.updateAgentBadgeTexture(agent, false);
    }

    // 2. MOVEMENT & POSITIONAL TWEEN
    if (status === 'meeting' && oldStatus !== 'meeting') {
      // Walk smoothly to the circular Strategy Table spot
      const targetPos = agent.meta.meetingPos;
      const targetRotY = agent.meta.meetingRotationY;

      agent.currentTween = new TWEEN.Tween(agent.characterGroup.position)
        .to({ x: targetPos.x, y: 0, z: targetPos.z }, 1300)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          agent.characterGroup.lookAt(0, agent.characterGroup.position.y, 0);
        })
        .onComplete(() => {
          agent.characterGroup.rotation.y = targetRotY;
          agent.currentTween = null;
        })
        .start();
    } else if ((status === 'idle' || status === 'working') && oldStatus === 'meeting') {
      // Return back to chair at the desk
      const chairOffset = new THREE.Vector3(0, 0, -0.6).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        agent.meta.deskRotationY
      );
      const targetDeskChairPos = agent.meta.deskPos.clone().add(chairOffset);

      agent.currentTween = new TWEEN.Tween(agent.characterGroup.position)
        .to({ x: targetDeskChairPos.x, y: 0, z: targetDeskChairPos.z }, 1300)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onComplete(() => {
          agent.characterGroup.rotation.y = agent.meta.deskRotationY;
          agent.currentTween = null;
        })
        .start();
    }
  }

  /**
   * Retrieves current status for an agent
   */
  public getAgentStatus(agentId: string): AgentStatus3D {
    return this.agents.get(agentId)?.status || 'idle';
  }

  /**
   * Retrieves metadata for an agent
   */
  public getAgentMeta(agentId: string): Agent3DMeta | undefined {
    return this.agents.get(agentId)?.meta;
  }

  /**
   * Triggers the Autonomous Agency Meeting:
   * All 12 agents stand up and glide to the central Strategy Table
   */
  public startMeeting(agentIds?: string[]): void {
    const targets = agentIds && agentIds.length > 0
      ? agentIds
      : Array.from(new Set(Array.from(this.agents.values()).map((a) => a.meta.id)));

    targets.forEach((id, idx) => {
      setTimeout(() => {
        if (!this.isDisposed) {
          this.setAgentStatus(id, 'meeting');
        }
      }, idx * 45);
    });
  }

  /**
   * Ends the meeting: All agents return to their desks
   */
  public endMeeting(): void {
    const uniqueAgents = Array.from(new Set(Array.from(this.agents.values()).map((a) => a.meta.id)));
    uniqueAgents.forEach((id, idx) => {
      setTimeout(() => {
        if (!this.isDisposed) {
          this.setAgentStatus(id, 'idle');
        }
      }, idx * 45);
    });
  }

  /**
   * Resets all agents to idle at their desks
   */
  public resetAllAgents(): void {
    this.endMeeting();
  }

  /**
   * Connects directly to local Ollama API (http://localhost:11434/api/generate)
   */
  public async callOllama(
    agentId: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`[Office3D] Agent ${agentId} bulunamadı.`);
    }

    const host = this.options.ollamaHost || 'http://localhost:11434';
    const model = agent.meta.model;

    this.setAgentStatus(agentId, 'working');

    try {
      const response = await fetch(`${host.replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_ctx: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama hatası (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.response || '';
    } finally {
      if (!this.isDisposed) {
        this.setAgentStatus(agentId, 'idle');
      }
    }
  }

  /**
   * Starts a consensus meeting with Ollama
   */
  public async startMeetingConsensus(
    topic: string,
    customPrompt?: string
  ): Promise<Record<string, string>> {
    this.startMeeting();

    const results: Record<string, string> = {};

    try {
      const defaultPrompt = customPrompt || `Aşağıdaki video konusu için 12 ajanlı ajans masasında en viral stratejiyi özetle: "${topic}"`;
      const ceoAnswer = await this.callOllama('ceo', defaultPrompt, 'Sen Genel Yayın Yönetmenisin.');
      results['ceo'] = ceoAnswer;
      return results;
    } finally {
      setTimeout(() => {
        if (!this.isDisposed) {
          this.endMeeting();
        }
      }, 3000);
    }
  }

  /**
   * Sets up mouse interaction (Raycasting for Hover Speech Bubble & Clicks)
   */
  private initEventListeners(): void {
    const dom = this.renderer.domElement;

    // Mouse Move -> Hover Detection
    dom.addEventListener('mousemove', (event) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      let foundId: string | null = null;
      for (const hit of intersects) {
        if (hit.object.userData?.agentId) {
          foundId = hit.object.userData.agentId;
          break;
        }
      }

      if (foundId !== this.hoveredAgentId) {
        this.hoveredAgentId = foundId;
        dom.style.cursor = foundId ? 'pointer' : 'default';

        if (this.options.onHoverAgent) {
          const meta = foundId ? this.agents.get(foundId)?.meta || null : null;
          this.options.onHoverAgent(meta, { x: event.clientX, y: event.clientY });
        }
      } else if (foundId && this.options.onHoverAgent) {
        const meta = this.agents.get(foundId)?.meta || null;
        this.options.onHoverAgent(meta, { x: event.clientX, y: event.clientY });
      }
    });

    dom.addEventListener('mouseleave', () => {
      this.hoveredAgentId = null;
      dom.style.cursor = 'default';
      if (this.options.onHoverAgent) {
        this.options.onHoverAgent(null);
      }
    });

    // Click on agent to open dossier
    dom.addEventListener('click', (event) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      for (const hit of intersects) {
        if (hit.object.userData?.agentId) {
          const selectedId = hit.object.userData.agentId;
          if (this.options.onSelectAgent) {
            this.options.onSelectAgent(selectedId);
          }
          break;
        }
      }
    });

    // Double-click resets camera view
    dom.addEventListener('dblclick', () => {
      this.resetCameraView();
    });

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      this.resizeObserver.observe(this.container);
    }

    window.addEventListener('resize', this.handleWindowResize);
  }

  private handleWindowResize = () => {
    this.resize();
  };

  /**
   * Updates renderer and camera viewport on container resize
   */
  public resize(): void {
    if (this.isDisposed || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    const aspect = width / height;

    this.camera.left = (-this.defaultFrustum * aspect) / 2;
    this.camera.right = (this.defaultFrustum * aspect) / 2;
    this.camera.top = this.defaultFrustum / 2;
    this.camera.bottom = -this.defaultFrustum / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * 60 FPS Animation & Render Loop
   */
  private animate = (): void => {
    if (this.isDisposed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update TWEEN animations
    TWEEN.update();

    // 2. Update OrbitControls damping
    this.controls.update();

    // 3. Rotate Holographic Center Rings
    if (this.hologramRing) {
      this.hologramRing.rotation.z += 0.016;
      this.hologramRing.rotation.y += 0.012;
    }
    if (this.hologramCore) {
      this.hologramCore.rotation.y += 0.025;
    }

    // 4. Server Rack Blinking Status LEDs
    if (this.serverLeds.length > 0) {
      this.serverLeds[0].intensity = 1.2 + 0.8 * Math.sin(elapsedTime * 9.5);
      this.serverLeds[1].intensity = 1.2 + 0.8 * Math.cos(elapsedTime * 8.2);
    }

    // 5. Update Agent Character Behaviors
    const processedIds = new Set<string>();
    this.agents.forEach((agent) => {
      if (processedIds.has(agent.meta.id)) return;
      processedIds.add(agent.meta.id);

      if (agent.status === 'working') {
        // --- 1. YANIP SÖNEN ÇALIŞMA IŞIĞI (Flashing Strobe Beacon & Monitor) ---
        const flashVal = Math.sin(elapsedTime * 14);
        const isFlashOn = flashVal > -0.2;
        const strobeIntensity = isFlashOn ? (5.5 + 3.0 * Math.sin(elapsedTime * 28)) : 0.15;

        agent.beaconLight.intensity = strobeIntensity;
        agent.beaconLight.color.setHex(0xfbbf24);
        (agent.beaconBulbMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xfbbf24);
        (agent.beaconBulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isFlashOn ? 5.0 : 0.2;

        // Monitor & desk light flickers with high-speed data stream pulse
        agent.monitorLight.intensity = 3.2 + 1.4 * Math.sin(elapsedTime * 18);
        (agent.screenMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.4 + 0.8 * Math.sin(elapsedTime * 22);

        // Holographic floor spotlight ring pulses and rotates beneath desk
        if (agent.floorRingMesh.visible) {
          (agent.floorRingMesh.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.3 * Math.sin(elapsedTime * 8);
          agent.floorRingMesh.rotation.z += 0.025;
        }

        // --- 2. 2D'DE OLDUĞU GİBİ TEPKİ VERME (Keyboard Typing, Head Bob & Pulse) ---
        // Fast mechanical keyboard typing with alternating left/right arms
        agent.leftArm.rotation.x = -Math.PI / 4 + 0.24 * Math.sin(elapsedTime * 24);
        agent.rightArm.rotation.x = -Math.PI / 4 + 0.24 * Math.cos(elapsedTime * 24 + 1.2);

        // Head bobbing and tilted toward the screen attentively
        agent.headMesh.rotation.x = 0.14 + 0.06 * Math.sin(elapsedTime * 16);
        agent.headMesh.rotation.y = 0.08 * Math.sin(elapsedTime * 6);

        // Subtle energetic bob
        const fastWave = Math.sin(elapsedTime * 24 + agent.meta.podIndex);
        agent.characterGroup.position.y = 0.02 * fastWave;

        // Overhead badge breathing scale pulse
        agent.badgeSprite.scale.set(
          2.95 + 0.28 * Math.sin(elapsedTime * 6),
          0.72 + 0.07 * Math.sin(elapsedTime * 6),
          1
        );
      } else if (agent.status === 'idle') {
        const breathWave = Math.sin(elapsedTime * 2.2 + agent.meta.podIndex * 0.5);
        agent.characterGroup.position.y = 0.008 * breathWave;
        agent.armsGroup.position.y = 0.98;
        agent.leftArm.rotation.x = -Math.PI / 4;
        agent.rightArm.rotation.x = -Math.PI / 4;
        agent.headMesh.rotation.x = 0;
        agent.headMesh.rotation.y = 0;
        agent.monitorLight.intensity = 0.8;
        agent.beaconLight.intensity = 0;
        (agent.beaconBulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        if (agent.floorRingMesh.visible) agent.floorRingMesh.visible = false;
        agent.badgeSprite.scale.set(2.7, 0.65, 1);
      } else if (agent.status === 'meeting') {
        const meetingWave = Math.sin(elapsedTime * 1.8 + agent.meta.podIndex * 0.7);
        agent.characterGroup.position.y = 0.01 * meetingWave;
        agent.leftArm.rotation.x = -Math.PI / 4;
        agent.rightArm.rotation.x = -Math.PI / 4;
        agent.headMesh.rotation.x = 0;
        agent.headMesh.rotation.y = 0.15 * Math.sin(elapsedTime * 2);
        agent.beaconLight.intensity = 0;
        (agent.beaconBulbMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        if (agent.floorRingMesh.visible) agent.floorRingMesh.visible = false;
        agent.badgeSprite.scale.set(2.7, 0.65, 1);
      }
    });

    // 6. Render Scene
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Cleans up all Three.js resources, OrbitControls, and WebGL contexts
   */
  public dispose(): void {
    this.isDisposed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.handleWindowResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.controls) {
      this.controls.dispose();
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.agents.clear();
  }
}
