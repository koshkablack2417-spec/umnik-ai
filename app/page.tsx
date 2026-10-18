"use client";

import { FormEvent, useEffect, useState } from "react";
import { providers, type ProviderId } from "@/lib/providers";

type Message = { role: "user" | "assistant"; text: string };
type Theme = "auto" | "light" | "dark";
type Language = "ru" | "en" | "es" | "fr" | "sv" | "ja" | "zh" | "de" | "it" | "pt" | "ar" | "ko" | "hi" | "nl" | "pl" | "tr" | "uk" | "fi" | "no" | "da";
const languages: {id: Language; name: string}[] = [
  {id:"ru",name:"Русский"},{id:"en",name:"English"},{id:"es",name:"Español"},{id:"fr",name:"Français"},
  {id:"sv",name:"Svenska"},{id:"ja",name:"日本語"},{id:"zh",name:"中文"},{id:"de",name:"Deutsch"},
  {id:"it",name:"Italiano"},{id:"pt",name:"Português"},{id:"ar",name:"العربية"},{id:"ko",name:"한국어"},
  {id:"hi",name:"हिन्दी"},{id:"nl",name:"Nederlands"},{id:"pl",name:"Polski"},{id:"tr",name:"Türkçe"},
  {id:"uk",name:"Українська"},{id:"fi",name:"Suomi"},{id:"no",name:"Norsk"},{id:"da",name:"Dansk"}
];
const copy: Record<Language, Record<string,string>> = {
  ru:{workspace:"AI-пространство",newChat:"＋　Новый чат",models:"AI-ПОМОЩНИКИ",tools:"ИНСТРУМЕНТЫ",images:"Изображения",video:"Видео",plugins:"Плагины",soon:"СКОРО",ready:"Сервис готов",eyebrow:"ТВОЙ AI. ТВОИ ИДЕИ.",headline:"Привет! Что будем",headline2:"придумывать?",intro:"Задавай вопросы, учись новому и превращай идеи в реальные проекты — в одном месте.",placeholder:"Спроси Умник AI о чём угодно...",send:"Отправить ↑",thinking:"Думаю…",hint:"Enter — отправить · Shift + Enter — новая строка",notice:"Умник AI может ошибаться. Не отправляй пароли, коды подтверждения и другую личную информацию.",settings:"Внешний вид",theme:"Тема",auto:"Авто",light:"Светлая",dark:"Тёмная",language:"Язык",s1:"Разобраться в сложном",s1t:"Объясни квантовую физику простыми словами",s2:"Создать что-то новое",s2t:"Придумай идею приложения, которое помогает учиться",s3:"Помочь с учёбой",s3t:"Составь план подготовки к контрольной на неделю",s4:"Написать текст",s4t:"Помоги написать интересное вступление для проекта"},
  en:{workspace:"AI workspace",newChat:"＋　New chat",models:"AI ASSISTANTS",tools:"TOOLS",images:"Images",video:"Video",plugins:"Plugins",soon:"SOON",ready:"Service ready",eyebrow:"YOUR AI. YOUR IDEAS.",headline:"Hello! What shall we",headline2:"dream up?",intro:"Ask questions, learn something new, and turn ideas into real projects — all in one place.",placeholder:"Ask Umnik AI anything...",send:"Send ↑",thinking:"Thinking…",hint:"Enter to send · Shift + Enter for a new line",notice:"Umnik AI can make mistakes. Don’t share passwords, verification codes, or other personal information.",settings:"Appearance",theme:"Theme",auto:"Auto",light:"Light",dark:"Dark",language:"Language",s1:"Understand something complex",s1t:"Explain quantum physics in simple terms",s2:"Create something new",s2t:"Invent an app idea that helps people learn",s3:"Help with studying",s3t:"Make a one-week study plan",s4:"Write something",s4t:"Help me write an interesting project introduction"},
  es:{workspace:"Espacio de IA",newChat:"＋　Nuevo chat",models:"ASISTENTES IA",tools:"HERRAMIENTAS",images:"Imágenes",video:"Vídeo",plugins:"Complementos",soon:"PRONTO",ready:"Servicio listo",eyebrow:"TU IA. TUS IDEAS.",headline:"¡Hola! ¿Qué vamos a",headline2:"imaginar?",intro:"Haz preguntas, aprende y convierte ideas en proyectos reales, todo en un mismo lugar.",placeholder:"Pregúntale cualquier cosa a Umnik AI...",send:"Enviar ↑",thinking:"Pensando…",hint:"Enter para enviar · Shift + Enter para nueva línea",notice:"Umnik AI puede equivocarse. No compartas contraseñas ni códigos de verificación.",settings:"Apariencia",theme:"Tema",auto:"Automático",light:"Claro",dark:"Oscuro",language:"Idioma",s1:"Entender algo complejo",s1t:"Explica la física cuántica de forma sencilla",s2:"Crear algo nuevo",s2t:"Inventa una idea de app para aprender",s3:"Ayuda con los estudios",s3t:"Crea un plan de estudio semanal",s4:"Escribir un texto",s4t:"Ayúdame a escribir una introducción interesante"},
  fr:{workspace:"Espace IA",newChat:"＋　Nouvelle discussion",models:"ASSISTANTS IA",tools:"OUTILS",images:"Images",video:"Vidéo",plugins:"Extensions",soon:"BIENTÔT",ready:"Service prêt",eyebrow:"TON IA. TES IDÉES.",headline:"Bonjour ! Qu’allons-nous",headline2:"imaginer ?",intro:"Pose des questions, apprends et transforme tes idées en projets concrets, au même endroit.",placeholder:"Demande n’importe quoi à Umnik AI…",send:"Envoyer ↑",thinking:"Réflexion…",hint:"Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne",notice:"Umnik AI peut se tromper. Ne partage pas tes mots de passe ni tes codes de vérification.",settings:"Apparence",theme:"Thème",auto:"Auto",light:"Clair",dark:"Sombre",language:"Langue",s1:"Comprendre un sujet complexe",s1t:"Explique la physique quantique simplement",s2:"Créer quelque chose",s2t:"Imagine une application pour apprendre",s3:"Aide aux études",s3t:"Crée un planning de révision sur une semaine",s4:"Écrire un texte",s4t:"Aide-moi à rédiger une introduction intéressante"},
  sv:{workspace:"AI-arbetsyta",newChat:"＋　Ny chatt",models:"AI-ASSISTENTER",tools:"VERKTYG",images:"Bilder",video:"Video",plugins:"Tillägg",soon:"SNART",ready:"Tjänsten är redo",eyebrow:"DIN AI. DINA IDÉER.",headline:"Hej! Vad ska vi",headline2:"hitta på?",intro:"Ställ frågor, lär dig nytt och gör idéer till riktiga projekt – på ett ställe.",placeholder:"Fråga Umnik AI om vad som helst…",send:"Skicka ↑",thinking:"Tänker…",hint:"Enter för att skicka · Shift + Enter för ny rad",notice:"Umnik AI kan ha fel. Dela inte lösenord eller verifieringskoder.",settings:"Utseende",theme:"Tema",auto:"Auto",light:"Ljust",dark:"Mörkt",language:"Språk",s1:"Förstå något svårt",s1t:"Förklara kvantfysik på ett enkelt sätt",s2:"Skapa något nytt",s2t:"Hitta på en appidé som hjälper människor att lära sig",s3:"Hjälp med studier",s3t:"Gör en studieplan för en vecka",s4:"Skriv en text",s4t:"Hjälp mig skriva en intressant inledning"},
  ja:{workspace:"AI ワークスペース",newChat:"＋　新しいチャット",models:"AIアシスタント",tools:"ツール",images:"画像",video:"動画",plugins:"プラグイン",soon:"近日公開",ready:"サービス利用可能",eyebrow:"あなたのAI、あなたのアイデア。",headline:"こんにちは！何を",headline2:"考えましょうか？",intro:"質問したり、新しいことを学んだり、アイデアをプロジェクトに変えたり。すべてここで。",placeholder:"Umnik AIに何でも聞いてください…",send:"送信 ↑",thinking:"考え中…",hint:"Enterで送信 · Shift + Enterで改行",notice:"Umnik AIは間違えることがあります。パスワードや確認コードを共有しないでください。",settings:"表示設定",theme:"テーマ",auto:"自動",light:"ライト",dark:"ダーク",language:"言語",s1:"難しいことを理解する",s1t:"量子物理学をわかりやすく説明して",s2:"新しいものを作る",s2t:"学習に役立つアプリのアイデアを考えて",s3:"勉強を手伝う",s3t:"1週間の学習計画を作って",s4:"文章を書く",s4t:"プロジェクトの魅力的な導入文を考えて"},
  zh:{workspace:"AI 工作空间",newChat:"＋　新建聊天",models:"AI 助手",tools:"工具",images:"图像",video:"视频",plugins:"插件",soon:"即将推出",ready:"服务已就绪",eyebrow:"你的 AI，你的创意。",headline:"你好！我们来",headline2:"创造什么？",intro:"在一个地方提问、学习新知识，并将想法变成真正的项目。",placeholder:"向 Umnik AI 提出任何问题…",send:"发送 ↑",thinking:"思考中…",hint:"Enter 发送 · Shift + Enter 换行",notice:"Umnik AI 可能会出错。请勿分享密码或验证码。",settings:"外观",theme:"主题",auto:"自动",light:"浅色",dark:"深色",language:"语言",s1:"理解复杂知识",s1t:"用简单的语言解释量子物理",s2:"创造新事物",s2t:"想一个帮助学习的应用创意",s3:"学习帮助",s3t:"制定一周学习计划",s4:"撰写文字",s4t:"帮我写一段有趣的项目开场白"},
  de:{workspace:"KI-Arbeitsbereich",newChat:"＋　Neuer Chat",models:"KI-ASSISTENTEN",tools:"WERKZEUGE",images:"Bilder",video:"Video",plugins:"Plugins",soon:"BALD",ready:"Dienst bereit",eyebrow:"DEINE KI. DEINE IDEEN.",headline:"Hallo! Was wollen wir",headline2:"uns ausdenken?",intro:"Stelle Fragen, lerne Neues und verwandle Ideen in echte Projekte – alles an einem Ort.",placeholder:"Frag Umnik AI alles…",send:"Senden ↑",thinking:"Denke nach…",hint:"Enter zum Senden · Shift + Enter für neue Zeile",notice:"Umnik AI kann Fehler machen. Teile keine Passwörter oder Bestätigungscodes.",settings:"Darstellung",theme:"Design",auto:"Auto",light:"Hell",dark:"Dunkel",language:"Sprache",s1:"Komplexes verstehen",s1t:"Erkläre Quantenphysik einfach",s2:"Etwas Neues schaffen",s2t:"Erfinde eine Lern-App-Idee",s3:"Lernhilfe",s3t:"Erstelle einen Lernplan für eine Woche",s4:"Text schreiben",s4t:"Hilf mir mit einer interessanten Projekteinleitung"},
  it:{workspace:"Spazio IA",newChat:"＋　Nuova chat",models:"ASSISTENTI IA",tools:"STRUMENTI",images:"Immagini",video:"Video",plugins:"Plugin",soon:"PRESTO",ready:"Servizio pronto",eyebrow:"LA TUA IA. LE TUE IDEE.",headline:"Ciao! Cosa possiamo",headline2:"inventare?",intro:"Fai domande, impara e trasforma le idee in progetti reali, tutto in un unico posto.",placeholder:"Chiedi qualsiasi cosa a Umnik AI…",send:"Invia ↑",thinking:"Sto pensando…",hint:"Invio per inviare · Maiusc + Invio per andare a capo",notice:"Umnik AI può sbagliare. Non condividere password o codici di verifica.",settings:"Aspetto",theme:"Tema",auto:"Auto",light:"Chiaro",dark:"Scuro",language:"Lingua",s1:"Capire qualcosa di complesso",s1t:"Spiega la fisica quantistica in modo semplice",s2:"Creare qualcosa di nuovo",s2t:"Inventa un'idea di app per imparare",s3:"Aiuto per lo studio",s3t:"Crea un piano di studio settimanale",s4:"Scrivere un testo",s4t:"Aiutami a scrivere un'introduzione interessante"},
  pt:{workspace:"Espaço de IA",newChat:"＋　Novo chat",models:"ASSISTENTES IA",tools:"FERRAMENTAS",images:"Imagens",video:"Vídeo",plugins:"Plugins",soon:"EM BREVE",ready:"Serviço pronto",eyebrow:"A TUA IA. AS TUAS IDEIAS.",headline:"Olá! O que vamos",headline2:"imaginar?",intro:"Faz perguntas, aprende e transforma ideias em projetos reais, tudo num só lugar.",placeholder:"Pergunta qualquer coisa ao Umnik AI…",send:"Enviar ↑",thinking:"A pensar…",hint:"Enter para enviar · Shift + Enter para nova linha",notice:"O Umnik AI pode errar. Não partilhes palavras-passe nem códigos de verificação.",settings:"Aparência",theme:"Tema",auto:"Auto",light:"Claro",dark:"Escuro",language:"Idioma",s1:"Compreender algo complexo",s1t:"Explica a física quântica de forma simples",s2:"Criar algo novo",s2t:"Inventa uma ideia de app para aprender",s3:"Ajuda nos estudos",s3t:"Cria um plano de estudo semanal",s4:"Escrever um texto",s4t:"Ajuda-me a escrever uma introdução interessante"},
  ar:{workspace:"مساحة الذكاء الاصطناعي",newChat:"＋　محادثة جديدة",models:"مساعدو الذكاء الاصطناعي",tools:"الأدوات",images:"الصور",video:"الفيديو",plugins:"الإضافات",soon:"قريبًا",ready:"الخدمة جاهزة",eyebrow:"ذكاؤك الاصطناعي. أفكارك.",headline:"مرحبًا! ماذا سن",headline2:"بتكر اليوم؟",intro:"اطرح الأسئلة وتعلّم أشياء جديدة وحوّل الأفكار إلى مشاريع حقيقية في مكان واحد.",placeholder:"اسأل Umnik AI عن أي شيء…",send:"إرسال ↑",thinking:"جارٍ التفكير…",hint:"Enter للإرسال · Shift + Enter لسطر جديد",notice:"قد يخطئ Umnik AI. لا تشارك كلمات المرور أو رموز التحقق.",settings:"المظهر",theme:"السمة",auto:"تلقائي",light:"فاتح",dark:"داكن",language:"اللغة",s1:"فهم موضوع معقد",s1t:"اشرح فيزياء الكم ببساطة",s2:"ابتكار شيء جديد",s2t:"ابتكر فكرة تطبيق يساعد على التعلم",s3:"المساعدة في الدراسة",s3t:"أنشئ خطة دراسة لأسبوع",s4:"كتابة نص",s4t:"ساعدني في كتابة مقدمة جذابة للمشروع"},
  ko:{workspace:"AI 작업 공간",newChat:"＋　새 채팅",models:"AI 도우미",tools:"도구",images:"이미지",video:"동영상",plugins:"플러그인",soon:"출시 예정",ready:"서비스 준비 완료",eyebrow:"나의 AI, 나의 아이디어.",headline:"안녕하세요! 무엇을",headline2:"만들어 볼까요?",intro:"질문하고 새로운 것을 배우며 아이디어를 실제 프로젝트로 바꿔 보세요.",placeholder:"Umnik AI에게 무엇이든 물어보세요…",send:"보내기 ↑",thinking:"생각 중…",hint:"Enter 전송 · Shift + Enter 줄 바꿈",notice:"Umnik AI는 실수할 수 있습니다. 비밀번호나 인증 코드를 공유하지 마세요.",settings:"모양",theme:"테마",auto:"자동",light:"라이트",dark:"다크",language:"언어",s1:"복잡한 내용 이해하기",s1t:"양자 물리학을 쉽게 설명해 줘",s2:"새로운 것 만들기",s2t:"학습에 도움이 되는 앱 아이디어를 내 줘",s3:"공부 도움",s3t:"일주일 학습 계획을 만들어 줘",s4:"글쓰기",s4t:"흥미로운 프로젝트 소개글을 써 줘"},
  hi:{workspace:"AI कार्यक्षेत्र",newChat:"＋　नई चैट",models:"AI सहायक",tools:"टूल",images:"चित्र",video:"वीडियो",plugins:"प्लगइन",soon:"जल्द",ready:"सेवा तैयार",eyebrow:"आपका AI। आपके विचार।",headline:"नमस्ते! आज क्या",headline2:"बनाएँ?",intro:"सवाल पूछें, नई चीज़ें सीखें और विचारों को वास्तविक परियोजनाओं में बदलें।",placeholder:"Umnik AI से कुछ भी पूछें…",send:"भेजें ↑",thinking:"सोच रहा है…",hint:"भेजने के लिए Enter · नई पंक्ति के लिए Shift + Enter",notice:"Umnik AI गलत हो सकता है। पासवर्ड या सत्यापन कोड साझा न करें।",settings:"दिखावट",theme:"थीम",auto:"ऑटो",light:"हल्का",dark:"गहरा",language:"भाषा",s1:"कठिन विषय समझें",s1t:"क्वांटम भौतिकी को सरल शब्दों में समझाएँ",s2:"कुछ नया बनाएँ",s2t:"सीखने में मदद करने वाले ऐप का विचार दें",s3:"पढ़ाई में मदद",s3t:"एक सप्ताह की पढ़ाई की योजना बनाएँ",s4:"कुछ लिखें",s4t:"मेरे प्रोजेक्ट के लिए दिलचस्प परिचय लिखने में मदद करें"},
  nl:{workspace:"AI-werkruimte",newChat:"＋　Nieuwe chat",models:"AI-ASSISTENTEN",tools:"HULPMIDDELEN",images:"Afbeeldingen",video:"Video",plugins:"Plug-ins",soon:"BINNENKORT",ready:"Dienst gereed",eyebrow:"JOUW AI. JOUW IDEEËN.",headline:"Hoi! Wat zullen we",headline2:"bedenken?",intro:"Stel vragen, leer iets nieuws en maak van ideeën echte projecten — op één plek.",placeholder:"Vraag Umnik AI alles…",send:"Verzenden ↑",thinking:"Denkt na…",hint:"Enter om te verzenden · Shift + Enter voor nieuwe regel",notice:"Umnik AI kan fouten maken. Deel geen wachtwoorden of verificatiecodes.",settings:"Weergave",theme:"Thema",auto:"Auto",light:"Licht",dark:"Donker",language:"Taal",s1:"Iets ingewikkelds begrijpen",s1t:"Leg kwantumfysica eenvoudig uit",s2:"Iets nieuws maken",s2t:"Bedenk een app om mensen te helpen leren",s3:"Hulp bij studeren",s3t:"Maak een studieplanning voor een week",s4:"Een tekst schrijven",s4t:"Help me een interessante projectintroductie schrijven"},
  pl:{workspace:"Przestrzeń AI",newChat:"＋　Nowy czat",models:"ASYSTENCI AI",tools:"NARZĘDZIA",images:"Obrazy",video:"Wideo",plugins:"Wtyczki",soon:"WKRÓTCE",ready:"Usługa gotowa",eyebrow:"TWOJE AI. TWOJE POMYSŁY.",headline:"Cześć! Co dziś",headline2:"wymyślimy?",intro:"Zadawaj pytania, ucz się nowych rzeczy i zamieniaj pomysły w prawdziwe projekty.",placeholder:"Zapytaj Umnik AI o cokolwiek…",send:"Wyślij ↑",thinking:"Myślę…",hint:"Enter — wyślij · Shift + Enter — nowa linia",notice:"Umnik AI może się mylić. Nie udostępniaj haseł ani kodów weryfikacyjnych.",settings:"Wygląd",theme:"Motyw",auto:"Auto",light:"Jasny",dark:"Ciemny",language:"Język",s1:"Zrozum coś trudnego",s1t:"Wyjaśnij prosto fizykę kwantową",s2:"Stwórz coś nowego",s2t:"Wymyśl aplikację pomagającą w nauce",s3:"Pomoc w nauce",s3t:"Ułóż tygodniowy plan nauki",s4:"Napisz tekst",s4t:"Pomóż napisać ciekawe wprowadzenie do projektu"},
  tr:{workspace:"Yapay zekâ alanı",newChat:"＋　Yeni sohbet",models:"YAPAY ZEKÂ ASİSTANLARI",tools:"ARAÇLAR",images:"Görseller",video:"Video",plugins:"Eklentiler",soon:"YAKINDA",ready:"Hizmet hazır",eyebrow:"YAPAY ZEKÂN. FİKİRLERİN.",headline:"Merhaba! Ne",headline2:"tasarlayalım?",intro:"Sorular sor, yeni şeyler öğren ve fikirlerini gerçek projelere dönüştür.",placeholder:"Umnik AI'ye istediğini sor…",send:"Gönder ↑",thinking:"Düşünüyor…",hint:"Göndermek için Enter · Yeni satır için Shift + Enter",notice:"Umnik AI hata yapabilir. Parola veya doğrulama kodlarını paylaşma.",settings:"Görünüm",theme:"Tema",auto:"Otomatik",light:"Açık",dark:"Koyu",language:"Dil",s1:"Zor bir konuyu anla",s1t:"Kuantum fiziğini basitçe açıkla",s2:"Yeni bir şey oluştur",s2t:"Öğrenmeye yardımcı bir uygulama fikri bul",s3:"Derslere yardım",s3t:"Bir haftalık çalışma planı yap",s4:"Bir metin yaz",s4t:"İlgi çekici bir proje girişi yazmama yardım et"},
  uk:{workspace:"AI-простір",newChat:"＋　Новий чат",models:"AI-ПОМІЧНИКИ",tools:"ІНСТРУМЕНТИ",images:"Зображення",video:"Відео",plugins:"Плагіни",soon:"НЕЗАБАРОМ",ready:"Сервіс готовий",eyebrow:"ТВІЙ AI. ТВОЇ ІДЕЇ.",headline:"Привіт! Що будемо",headline2:"вигадувати?",intro:"Став запитання, навчайся нового та перетворюй ідеї на реальні проєкти.",placeholder:"Запитай Умник AI про будь-що…",send:"Надіслати ↑",thinking:"Думаю…",hint:"Enter — надіслати · Shift + Enter — новий рядок",notice:"Умник AI може помилятися. Не надсилай паролі та коди підтвердження.",settings:"Вигляд",theme:"Тема",auto:"Авто",light:"Світла",dark:"Темна",language:"Мова",s1:"Зрозуміти складне",s1t:"Поясни квантову фізику простими словами",s2:"Створити щось нове",s2t:"Придумай ідею навчального застосунку",s3:"Допомога з навчанням",s3t:"Склади план навчання на тиждень",s4:"Написати текст",s4t:"Допоможи написати цікаве вступне слово до проєкту"},
  fi:{workspace:"AI-työtila",newChat:"＋　Uusi keskustelu",models:"AI-AVUSTAJAT",tools:"TYÖKALUT",images:"Kuvat",video:"Video",plugins:"Lisäosat",soon:"TULOSSA",ready:"Palvelu valmis",eyebrow:"SINUN AI. SINUN IDEASI.",headline:"Hei! Mitä",headline2:"keksitään?",intro:"Kysy, opi uutta ja muuta ideat oikeiksi projekteiksi yhdessä paikassa.",placeholder:"Kysy Umnik AI:lta mitä vain…",send:"Lähetä ↑",thinking:"Mietin…",hint:"Enter lähettää · Shift + Enter rivinvaihto",notice:"Umnik AI voi erehtyä. Älä jaa salasanoja tai vahvistuskoodeja.",settings:"Ulkoasu",theme:"Teema",auto:"Auto",light:"Vaalea",dark:"Tumma",language:"Kieli",s1:"Ymmärrä vaikea asia",s1t:"Selitä kvanttifysiikka yksinkertaisesti",s2:"Luo jotain uutta",s2t:"Keksi oppimista helpottava sovellusidea",s3:"Apua opiskeluun",s3t:"Laadi viikon opiskelusuunnitelma",s4:"Kirjoita teksti",s4t:"Auta kirjoittamaan kiinnostava projektin johdanto"},
  no:{workspace:"AI-arbeidsområde",newChat:"＋　Ny chat",models:"AI-ASSISTENTER",tools:"VERKTØY",images:"Bilder",video:"Video",plugins:"Programtillegg",soon:"KOMMER",ready:"Tjenesten er klar",eyebrow:"DIN AI. DINE IDEER.",headline:"Hei! Hva skal vi",headline2:"finne på?",intro:"Still spørsmål, lær noe nytt og gjør ideer om til ekte prosjekter – på ett sted.",placeholder:"Spør Umnik AI om hva som helst…",send:"Send ↑",thinking:"Tenker…",hint:"Enter for å sende · Shift + Enter for ny linje",notice:"Umnik AI kan ta feil. Ikke del passord eller bekreftelseskoder.",settings:"Utseende",theme:"Tema",auto:"Auto",light:"Lys",dark:"Mørk",language:"Språk",s1:"Forstå noe vanskelig",s1t:"Forklar kvantefysikk på en enkel måte",s2:"Skap noe nytt",s2t:"Finn på en appidé som hjelper folk å lære",s3:"Hjelp med studier",s3t:"Lag en studieplan for en uke",s4:"Skriv en tekst",s4t:"Hjelp meg med en interessant prosjektintroduksjon"},
  da:{workspace:"AI-arbejdsområde",newChat:"＋　Ny chat",models:"AI-ASSISTENTER",tools:"VÆRKTØJER",images:"Billeder",video:"Video",plugins:"Plugins",soon:"KOMMER SNART",ready:"Tjenesten er klar",eyebrow:"DIN AI. DINE IDEER.",headline:"Hej! Hvad skal vi",headline2:"finde på?",intro:"Stil spørgsmål, lær nyt, og gør idéer til rigtige projekter – alt på ét sted.",placeholder:"Spørg Umnik AI om hvad som helst…",send:"Send ↑",thinking:"Tænker…",hint:"Enter for at sende · Shift + Enter for ny linje",notice:"Umnik AI kan tage fejl. Del ikke adgangskoder eller bekræftelseskoder.",settings:"Udseende",theme:"Tema",auto:"Auto",light:"Lys",dark:"Mørk",language:"Sprog",s1:"Forstå noget svært",s1t:"Forklar kvantefysik på en enkel måde",s2:"Skab noget nyt",s2t:"Find på en appidé, der hjælper folk med at lære",s3:"Hjælp til studier",s3t:"Lav en studieplan for en uge",s4:"Skriv en tekst",s4t:"Hjælp mig med en interessant projektindledning"}
};

export default function Home() {
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>("auto");
  const [language, setLanguage] = useState<Language>("ru");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("umnik-theme") as Theme | null;
      const savedLanguage = localStorage.getItem("umnik-language") as Language | null;
      if (savedTheme && ["auto","light","dark"].includes(savedTheme)) setTheme(savedTheme);
      if (savedLanguage && languages.some((item) => item.id === savedLanguage)) setLanguage(savedLanguage);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("umnik-theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("umnik-language", language); } catch {}
  }, [language]);

  const t = copy[language];
  const suggestions = [
    { icon: "✦", title: t.s1, text: t.s1t },
    { icon: "⌘", title: t.s2, text: t.s2t },
    { icon: "↗", title: t.s3, text: t.s3t },
    { icon: "✎", title: t.s4, text: t.s4t },
  ];

  async function sendMessage(value = input) {
    const message = value.trim();
    if (!message || loading) return;
    setInput("");
    setError("");
    setMessages((old) => [...old, { role: "user", text: message }]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, provider, language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((old) => [...old, { role: "assistant", text: data.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to AI.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandIcon">✦</span><span>Умник AI</span></div>
        <button className="newChat" onClick={() => { setMessages([]); setError(""); }}>{t.newChat}</button>
        <div>
          <div className="sideLabel">{t.models}</div>
          <div className="modelList">
            {providers.map((item) => (
              <button key={item.id} className={`model ${provider === item.id ? "active" : ""}`} onClick={() => setProvider(item.id)} title={item.enabled ? item.description : t.soon}>
                <span className="dot" /><span>{item.name}</span>{!item.enabled && <span className="soon">{t.soon}</span>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="sideLabel">{t.tools}</div>
          <div className="modelList">
            <button className="model" onClick={() => { window.location.href = "/studio"; }}>▧　{t.images} <span className="soon">AI</span></button>
            <button className="model" onClick={() => { window.location.href = "/studio"; }}>▷　{t.video} <span className="soon">AI</span></button>
            <button className="model" onClick={() => setError(language === "ru" ? "Плагины будут добавлены в следующих версиях." : "Plugins will be added in a future version.")}>⊞　{t.plugins} <span className="soon">{t.soon}</span></button>
          </div>
        </div>
        <div className="sideBottom">Умник AI · 0.2.0<br/>{t.soon === "СКОРО" ? "Некоторые функции ещё в разработке." : "Some features are still in development."}</div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="mobileBrand"><span className="brandIcon">✦</span>Умник AI</div>
          <div className="topTitle">{t.workspace}</div>
          <div className="topRight">
            <label className="settingControl"><span>{t.theme}</span><select className="modelSelect" value={theme} onChange={(event) => setTheme(event.target.value as Theme)} aria-label={t.theme}><option value="auto">{t.auto}</option><option value="light">{t.light}</option><option value="dark">{t.dark}</option></select></label>
            <label className="settingControl"><span>{t.language}</span><select className="modelSelect languageSelect" value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t.language}>{languages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <span className="status">{t.ready}</span><span className="avatar">У</span>
          </div>
        </header>

        <div className="content">
          {messages.length === 0 ? (
            <section className="hero">
              <div className="eyebrow">{t.eyebrow}</div>
              <h1>{t.headline}<br/><span className="gradient">{t.headline2}</span></h1>
              <p>{t.intro}</p>
            </section>
          ) : (
            <section className="chatArea" aria-live="polite">
              {messages.map((message, index) => <div key={index} className={`bubble ${message.role}`}>{message.text}</div>)}
              {loading && <div className="bubble assistant">{t.thinking}</div>}
            </section>
          )}

          {messages.length === 0 && <div className="suggestions">
            {suggestions.map((item) => <button key={item.title} className="suggestion" onClick={() => void sendMessage(item.text)}><strong>{item.icon}　{item.title}</strong>{item.text}</button>)}
          </div>}

          <form className="composer" onSubmit={handleSubmit}>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
            <div className="composerFoot">
              <select className="modelSelect" value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)} aria-label="AI model">
                {providers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.enabled ? "" : ` — ${t.soon.toLowerCase()}`}</option>)}
              </select>
              <span className="composerHint">{t.hint}</span>
              <button className="send" type="submit" disabled={loading || !input.trim()}>{loading ? t.thinking : t.send}</button>
            </div>
          </form>
          {error && <div className="error" role="alert">{error}</div>}
          <div className="notice">{t.notice}</div>
        </div>
      </section>
    </main>
  );
}
