var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// server/config.js
var require_config = __commonJS({
  "server/config.js"(exports2, module2) {
    module2.exports = {
      PORT: Number(process.env.PORT) || 3e3,
      CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
      SESSION_MS: (Number(process.env.SESSION_MINUTES) || 30) * 60 * 1e3,
      // oda (masa) seansı
      WARN_BEFORE_MS: 5 * 60 * 1e3,
      // "son 5 dakika" uyarısı
      MAX_PLAYERS: 12,
      RECONNECT_GRACE_MS: 90 * 1e3,
      // telefon kilitlenirse oyuncu bu süre odada kalır
      ROOM_CLEANUP_MS: 10 * 60 * 1e3,
      // seans bitince oda bellekten bu süre sonra silinir
      // İstatistik sayfası için anahtar: /api/istatistik?anahtar=...
      // Boş bırakılırsa istatistik uç noktası kapalıdır.
      STATS_KEY: process.env.STATS_KEY || "",
      BRAND_URL: "/",
      SITE_URL: process.env.SITE_URL || "https://nfcdunyasi.com"
    };
  }
});

// server/utils.js
var require_utils = __commonJS({
  "server/utils.js"(exports2, module2) {
    var crypto = require("crypto");
    var CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var UserError = class extends Error {
      constructor(message) {
        super(message);
        this.userMessage = message;
      }
    };
    var randInt = (n) => crypto.randomInt(n);
    var pick = (arr) => arr[randInt(arr.length)];
    var uid = () => crypto.randomUUID();
    function randomCode(len = 4) {
      let s = "";
      for (let i = 0; i < len; i++) s += CODE_CHARS[randInt(CODE_CHARS.length)];
      return s;
    }
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    function cleanNickname(raw) {
      return String(raw ?? "").replace(/[<>"'`]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
    }
    function createLimiter2(max, windowMs) {
      let count = 0;
      let start = Date.now();
      return () => {
        const now = Date.now();
        if (now - start > windowMs) {
          start = now;
          count = 0;
        }
        return ++count <= max;
      };
    }
    module2.exports = { UserError, randInt, pick, uid, randomCode, shuffle, cleanNickname, createLimiter: createLimiter2 };
  }
});

// server/games/hesabiKimOder.js
var require_hesabiKimOder = __commonJS({
  "server/games/hesabiKimOder.js"(exports2, module2) {
    var { pick, randInt } = require_utils();
    var SPIN_MS = 5200;
    var MESSAGES = [
      "A\u011Fan\u0131n eli tutulmaz, hesap sende! \u{1F4B8}",
      "C\xFCzdan\u0131 \xE7\u0131kar kral, bug\xFCn senin g\xFCn\xFCn \u{1F451}",
      "Kader b\xF6yle yazm\u0131\u015F, itiraz kabul edilmez \u{1F3B2}",
      "Garson abi, hesap \u015Fu arkada\u015Fta! \u{1F64B}",
      "Burs yatt\u0131 m\u0131? Yatmad\u0131ysa da yatt\u0131 say \u{1F605}",
      "Kart\u0131 uzat, biz tatl\u0131ya bak\u0131yoruz \u{1F370}",
      "Bug\xFCn\xFCn sponsoru sensin, alk\u0131\u015Flar! \u{1F44F}",
      "Kimse bir \u015Fey yemedi ama sen \xF6d\xFCyorsun \u{1F607}",
      "\xC7ark konu\u015Ftu, masa sustu \u{1F910}"
    ];
    module2.exports = {
      meta: {
        id: "hesabi-kim-oder",
        name: "Hesab\u0131 Kim \xD6der?",
        emoji: "\u{1F4B8}",
        category: "sans",
        color: "#FFD23F",
        description: "\xC7ark d\xF6ner, kader konu\u015Fur. Kime \xE7\u0131karsa hesap onda.",
        minPlayers: 2,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        const s = {
          phase: "idle",
          slots: [],
          // dönüş anındaki oyuncular (çark dilimleri)
          spinId: 0,
          // her dönüşte artar; istemci yeni animasyonu buradan anlar
          rotation: 0,
          // çarkın toplam dönüş açısı (derece)
          winnerId: null,
          message: null,
          spunBy: null,
          history: []
          // son kurbanlar
        };
        function spin(playerId) {
          if (s.phase === "spinning") return;
          const players = api.players();
          if (players.length < 2) return api.toast("\xC7ark i\xE7in en az 2 ki\u015Fi laz\u0131m.", playerId);
          s.slots = players.map((p) => ({ id: p.id, nickname: p.nickname }));
          const n = s.slots.length;
          const index = randInt(n);
          const seg = 360 / n;
          const jitter = (randInt(61) - 30) / 100 * seg;
          const turns = 5 + randInt(3);
          s.rotation = turns * 360 + (360 - (index * seg + seg / 2)) + jitter;
          s.winnerId = s.slots[index].id;
          s.spinId += 1;
          s.phase = "spinning";
          s.message = null;
          s.spunBy = api.nickname(playerId);
          api.update();
          api.setTimer(() => {
            s.phase = "result";
            s.message = pick(MESSAGES);
            s.history = [s.slots[index].nickname, ...s.history].slice(0, 5);
            api.update();
          }, SPIN_MS);
        }
        return {
          start() {
          },
          handle(playerId, action) {
            if (action === "spin") spin(playerId);
          },
          // Beklerken çark canlı oyuncu listesini gösterir
          playerJoined() {
            if (s.phase === "idle") api.update();
          },
          playerLeft() {
            if (s.phase === "idle") api.update();
          },
          view(playerId) {
            const slots = s.phase === "idle" ? api.players() : s.slots;
            const winner = s.phase === "result" ? s.slots.find((x) => x.id === s.winnerId) : null;
            return {
              phase: s.phase,
              slots,
              spinId: s.spinId,
              rotation: s.phase === "idle" ? 0 : s.rotation,
              spinMs: SPIN_MS,
              spunBy: s.spunBy,
              winner,
              isMe: !!winner && winner.id === playerId,
              message: s.message,
              history: s.history
            };
          }
        };
      }
    };
  }
});

// server/games/aramizdakiCasus.js
var require_aramizdakiCasus = __commonJS({
  "server/games/aramizdakiCasus.js"(exports2, module2) {
    var { pick, shuffle } = require_utils();
    var MIN_PLAYERS = 3;
    var DISCUSS_MS = 3 * 60 * 1e3;
    var GUESS_MS = 30 * 1e3;
    var PACKS = {
      "Mekanlar": [
        "Kad\u0131k\xF6y iskelesi",
        "\xDCniversite kantini",
        "Yurt odas\u0131",
        "Hal\u0131 saha",
        "Metrob\xFCs",
        "K\xFCt\xFCphane",
        "Sahil yolu",
        "AVM",
        "D\xFC\u011F\xFCn salonu",
        "Berber",
        "Sinema",
        "Konser alan\u0131",
        "Dershane",
        "Vapur"
      ],
      "Yemek & \u0130\xE7ecek": [
        "Islak hamburger",
        "Kokore\xE7",
        "Midye dolma",
        "\xC7i\u011F k\xF6fte",
        "Ka\u015Farl\u0131 tost",
        "Ayran",
        "Simit",
        "Lahmacun",
        "Mant\u0131",
        "Menemen",
        "Kumpir",
        "T\xFCrk kahvesi",
        "D\xF6ner",
        "Pide"
      ],
      "\xD6\u011Frenci Hayat\u0131": [
        "Final haftas\u0131",
        "B\xFCt\xFCnleme",
        "Yoklama",
        "Staj",
        "Erasmus",
        "Ev arkada\u015F\u0131",
        "Burs",
        "\xD6dev teslimi",
        "Grup projesi",
        "Mezuniyet",
        "Haz\u0131rl\u0131k s\u0131n\u0131f\u0131",
        "KYK yurdu",
        "Not ortalamas\u0131",
        "Sunum"
      ],
      "G\xFCndelik": [
        "Bayram ziyareti",
        "K\u0131na gecesi",
        "Do\u011Fum g\xFCn\xFC",
        "Kamp",
        "Derbi ma\xE7\u0131",
        "Piknik",
        "Ta\u015F\u0131nma g\xFCn\xFC",
        "\u0130\u015F g\xF6r\xFC\u015Fmesi",
        "N\xF6bet\xE7i eczane",
        "Trafik cezas\u0131",
        "Tatil valizi",
        "Market s\u0131ras\u0131"
      ]
    };
    var ACTIVE_PHASES = ["reveal", "discuss", "vote", "spyGuess"];
    module2.exports = {
      meta: {
        id: "aramizdaki-casus",
        name: "Aram\u0131zdaki Casus",
        emoji: "\u{1F576}\uFE0F",
        category: "blof",
        color: "#FF7A66",
        description: "Herkes ayn\u0131 kelimeyi bilir, biri hari\xE7. Soru sor, casusu bul.",
        minPlayers: MIN_PLAYERS,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        let s = null;
        let round = 0;
        let phaseTimer = null;
        const scores = /* @__PURE__ */ new Map();
        const setPhaseTimer = (fn, ms) => {
          clearPhaseTimer();
          phaseTimer = api.setTimer(() => {
            phaseTimer = null;
            fn();
          }, ms);
        };
        const clearPhaseTimer = () => {
          if (phaseTimer) api.clearTimer(phaseTimer);
          phaseTimer = null;
        };
        const active = () => s.participants.filter((id) => api.isConnected(id));
        const isParticipant = (id) => !!s && s.participants.includes(id);
        function addScore(id, points) {
          const entry = scores.get(id) ?? { nickname: s.names[id], score: 0 };
          entry.nickname = s.names[id] ?? entry.nickname;
          entry.score += points;
          scores.set(id, entry);
        }
        function newRound() {
          clearPhaseTimer();
          const players = api.players();
          if (players.length < MIN_PLAYERS) {
            s = { phase: "waiting", participants: [], names: {} };
            return api.update();
          }
          round += 1;
          const category = pick(Object.keys(PACKS));
          const participants = players.map((p) => p.id);
          s = {
            phase: "reveal",
            round,
            category,
            word: pick(PACKS[category]),
            participants,
            names: Object.fromEntries(players.map((p) => [p.id, p.nickname])),
            spyId: pick(participants),
            seen: /* @__PURE__ */ new Set(),
            votes: /* @__PURE__ */ new Map(),
            // voterId -> targetId
            firstSpeakerId: null,
            discussEndsAt: null,
            guessEndsAt: null,
            guessOptions: null,
            spyGuess: null,
            accusedId: null,
            tally: {},
            result: null
          };
          api.update();
        }
        function startDiscuss() {
          const speakers = active();
          if (!speakers.length) return;
          s.phase = "discuss";
          s.firstSpeakerId = pick(speakers);
          s.discussEndsAt = Date.now() + DISCUSS_MS;
          setPhaseTimer(startVote, DISCUSS_MS);
          api.update();
        }
        function startVote() {
          clearPhaseTimer();
          s.phase = "vote";
          s.votes = /* @__PURE__ */ new Map();
          api.update();
        }
        function resolveVotes() {
          clearPhaseTimer();
          const tally = {};
          for (const target of s.votes.values()) tally[target] = (tally[target] || 0) + 1;
          s.tally = tally;
          const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
          const top = ranked[0];
          const tie = ranked.length > 1 && ranked[1][1] === top[1];
          if (!top || tie) return finish(true, "tie");
          s.accusedId = top[0];
          if (s.accusedId !== s.spyId) return finish(true, "wrong");
          const decoys = shuffle(PACKS[s.category].filter((w) => w !== s.word)).slice(0, 5);
          s.guessOptions = shuffle([s.word, ...decoys]);
          s.phase = "spyGuess";
          s.guessEndsAt = Date.now() + GUESS_MS;
          setPhaseTimer(() => finish(false, "timeout"), GUESS_MS);
          api.update();
        }
        function finish(spyWon, reason) {
          clearPhaseTimer();
          s.phase = "result";
          s.result = { spyWon, reason };
          if (spyWon) addScore(s.spyId, 2);
          else s.participants.filter((id) => id !== s.spyId).forEach((id) => addScore(id, 1));
          api.update();
        }
        function checkRevealDone() {
          if (s.phase === "reveal" && active().every((id) => s.seen.has(id))) startDiscuss();
          else api.update();
        }
        function checkVotesDone() {
          if (s.phase === "vote" && active().every((id) => s.votes.has(id))) resolveVotes();
          else api.update();
        }
        return {
          start() {
            newRound();
          },
          handle(playerId, action, payload, { isHost }) {
            if (!s) return;
            switch (action) {
              case "seen":
                if (s.phase === "reveal" && isParticipant(playerId)) {
                  s.seen.add(playerId);
                  checkRevealDone();
                }
                break;
              case "startDiscuss":
                if (isHost && s.phase === "reveal") startDiscuss();
                break;
              case "startVote":
                if (isHost && s.phase === "discuss") startVote();
                break;
              case "vote": {
                const target = payload.targetId;
                if (s.phase !== "vote" || !isParticipant(playerId)) return;
                if (!s.participants.includes(target) || target === playerId) return;
                s.votes.set(playerId, target);
                checkVotesDone();
                break;
              }
              case "forceResolve":
                if (isHost && s.phase === "vote" && s.votes.size > 0) resolveVotes();
                break;
              case "guess":
                if (s.phase === "spyGuess" && playerId === s.spyId && s.guessOptions.includes(payload.word)) {
                  s.spyGuess = payload.word;
                  const correct = payload.word === s.word;
                  finish(correct, correct ? "guessed" : "caught");
                }
                break;
              case "nextRound":
                if (isHost && (s.phase === "result" || s.phase === "waiting")) newRound();
                break;
              default:
                break;
            }
          },
          playerJoined() {
            if (s) api.update();
          },
          // Bağlantı koptu: onu beklemeden faz ilerleyebilsin
          playerLeft() {
            if (!s) return;
            if (s.phase === "reveal") checkRevealDone();
            else if (s.phase === "vote") checkVotesDone();
            else api.update();
          },
          // Tamamen çıktı: casus kaçtıysa tur biter
          playerRemoved(id) {
            if (s && id === s.spyId && ACTIVE_PHASES.includes(s.phase)) finish(false, "spyLeft");
          },
          dispose() {
            clearPhaseTimer();
          },
          view(playerId) {
            if (!s) return { phase: "loading" };
            const scoreboard = [...scores.entries()].map(([id, v2]) => ({ id, nickname: v2.nickname, score: v2.score })).sort((a, b) => b.score - a.score);
            if (s.phase === "waiting") {
              return { phase: "waiting", round, minPlayers: MIN_PLAYERS, playerCount: api.players().length, scoreboard };
            }
            const me = isParticipant(playerId);
            const activeIds = active();
            const v = {
              phase: s.phase,
              round: s.round,
              category: s.category,
              isParticipant: me,
              participants: s.participants.map((id) => ({ id, nickname: s.names[id], connected: api.isConnected(id) })),
              scoreboard
            };
            if (me) {
              v.role = playerId === s.spyId ? "spy" : "citizen";
              v.word = v.role === "citizen" ? s.word : null;
            }
            switch (s.phase) {
              case "reveal":
                v.seen = s.seen.has(playerId);
                v.seenCount = activeIds.filter((id) => s.seen.has(id)).length;
                v.total = activeIds.length;
                break;
              case "discuss":
                v.firstSpeakerId = s.firstSpeakerId;
                v.discussEndsAt = s.discussEndsAt;
                break;
              case "vote":
                v.myVote = s.votes.get(playerId) ?? null;
                v.votedCount = activeIds.filter((id) => s.votes.has(id)).length;
                v.total = activeIds.length;
                break;
              case "spyGuess":
                v.accusedId = s.accusedId;
                v.guessOptions = s.guessOptions;
                v.guessEndsAt = s.guessEndsAt;
                break;
              case "result":
                Object.assign(v, {
                  spyId: s.spyId,
                  secretWord: s.word,
                  tally: s.tally,
                  accusedId: s.accusedId,
                  spyGuess: s.spyGuess,
                  result: s.result
                });
                break;
              default:
                break;
            }
            return v;
          }
        };
      }
    };
  }
});

// server/games/_shared.js
var require_shared = __commonJS({
  "server/games/_shared.js"(exports2, module2) {
    var { shuffle } = require_utils();
    var Scoreboard = class {
      constructor(api) {
        this.api = api;
        this.map = /* @__PURE__ */ new Map();
      }
      add(id, points = 1) {
        const entry = this.map.get(id) ?? { nickname: this.api.nickname(id), score: 0 };
        if (this.api.isConnected(id)) entry.nickname = this.api.nickname(id);
        entry.score += points;
        this.map.set(id, entry);
      }
      list() {
        return [...this.map.entries()].map(([id, v]) => ({ id, nickname: v.nickname, score: v.score })).sort((a, b) => b.score - a.score);
      }
    };
    function makeDeck(cards) {
      let pile = [];
      return () => {
        if (!pile.length) pile = shuffle(cards);
        return pile.pop();
      };
    }
    var AnswerRound = class {
      constructor(api, ids) {
        this.api = api;
        this.ids = ids;
        this.answers = /* @__PURE__ */ new Map();
      }
      canAnswer(id) {
        return this.ids.includes(id);
      }
      active() {
        return this.ids.filter((id) => this.api.isConnected(id));
      }
      done() {
        const act = this.active();
        return act.length > 0 && act.every((id) => this.answers.has(id));
      }
      progress() {
        const act = this.active();
        return { answeredCount: act.filter((id) => this.answers.has(id)).length, total: act.length };
      }
      people() {
        return this.ids.map((id) => ({
          id,
          nickname: this.api.nickname(id),
          connected: this.api.isConnected(id),
          done: this.answers.has(id)
        }));
      }
    };
    module2.exports = { Scoreboard, makeDeck, AnswerRound };
  }
});

// server/games/dogrulukCesaret.js
var require_dogrulukCesaret = __commonJS({
  "server/games/dogrulukCesaret.js"(exports2, module2) {
    var { pick, shuffle } = require_utils();
    var { Scoreboard, makeDeck } = require_shared();
    var TRUTHS = [
      "Telefonunda en son arad\u0131\u011F\u0131n \u015Fey neydi? G\xF6ster ya da d\xFCr\xFCst\xE7e s\xF6yle.",
      "Hi\xE7 uyuyakal\u0131p yalan bir bahane uydurdun mu? Ne dedin?",
      "Masadakilerden hangisinin hayat\u0131n\u0131 bir g\xFCnl\xFC\u011F\xFCne ya\u015Famak isterdin?",
      "Galeride silmeye k\u0131yamad\u0131\u011F\u0131n en sa\xE7ma foto\u011Fraf ne?",
      "Kimsenin bilmedi\u011Fi gizli bir yetene\u011Fin var m\u0131?",
      "En son kime k\xFC\xE7\xFCk bir yalan s\xF6yledin?",
      "\xC7ocukken en b\xFCy\xFCk korkun neydi?",
      "Bu masadan biriyle \u0131ss\u0131z adaya d\xFC\u015Fsen kimi se\xE7erdin, neden?",
      "Birinin mesaj\u0131n\u0131 bilerek g\xF6r\xFCld\xFCde b\u0131rakt\u0131\u011F\u0131n oldu mu?",
      "Son zamanlarda tekrar tekrar dinledi\u011Fin \u015Fark\u0131 hangisi?",
      "Ald\u0131\u011F\u0131n en k\xF6t\xFC hediye neydi?",
      "Bir g\xFCn g\xF6r\xFCnmez olsan ilk nereye giderdin?",
      "En son neye \xE7ok sinirlendin?",
      "Masadaki herkese birer d\xFCr\xFCst iltifat et.",
      "Hayat\u0131nda yapt\u0131\u011F\u0131n en spontane \u015Fey ne?",
      "G\xF6rd\xFC\u011F\xFCn en sa\xE7ma r\xFCya neydi?",
      "Hi\xE7 yanl\u0131\u015F ki\u015Fiye mesaj att\u0131n m\u0131? Ne yaz\u0131yordu?",
      "10 y\u0131l sonra kendini nerede g\xF6r\xFCyorsun?",
      "Bu masada s\u0131rlar\u0131n\u0131 en \xE7ok kime emanet edersin?",
      "Sosyal medyada en son neyi be\u011Fendin?",
      "Seni en \xE7ok ne g\xFCld\xFCr\xFCr?",
      "Hangi \xFCnl\xFCyle bir g\xFCn ge\xE7irmek isterdin?",
      "Masadakilerle ilgili ilk izlenimin neydi? Birini se\xE7.",
      "Hayat\u0131nda en \xE7ok gurur duydu\u011Fun an hangisi?",
      "Bir s\xFCper g\xFCc\xFCn olsa hangisi olurdu?",
      "En uzun ka\xE7 saat telefonsuz kald\u0131n?",
      "Hi\xE7 s\u0131rf ka\xE7mak i\xE7in hasta numaras\u0131 yapt\u0131n m\u0131?",
      "En sevdi\u011Fin \xE7izgi film karakteri kimdi?",
      "Bir filmde a\u011Flad\u0131\u011F\u0131n oldu mu? Hangisi?",
      "\u015Eu an masada en a\xE7 olan kim sence?"
    ];
    var DARES = [
      'Sonraki turun sonuna kadar her c\xFCmleni "efendim" diye bitir.',
      "Masadakilerden birini 20 saniye taklit et, di\u011Ferleri kim oldu\u011Funu bilsin.",
      "Telefonundaki son foto\u011Fraf\u0131 masaya g\xF6ster.",
      "En sevdi\u011Fin \u015Fark\u0131y\u0131 m\u0131r\u0131ldan, masa \u015Fark\u0131y\u0131 bilsin.",
      "10 saniye boyunca g\xFClmeden masadakilerin g\xF6z\xFCne bak.",
      "Bir sonraki tura kadar sadece f\u0131s\u0131ldayarak konu\u015F.",
      "Sa\u011F\u0131ndaki ki\u015Fiye 3 i\xE7ten iltifat et.",
      "Bir haber spikeri gibi bug\xFCn\xFC anlat.",
      "Oturdu\u011Fun yerde en iyi dans hareketini g\xF6ster.",
      "Bir hayvan se\xE7 ve k\u0131s\u0131k sesle onu taklit et, masa bilsin.",
      "Masadakilerden birine \u015Fiir tad\u0131nda bir iltifat uydur.",
      "Bir sonraki turu yabanc\u0131 aksanla oyna.",
      "\xDCnl\xFC bir film sahnesini canland\u0131r, masa filmi tahmin etsin.",
      "20 saniye g\xF6z k\u0131rpmadan dayan.",
      'Masadakilerden birinin sesini taklit ederek "hesap bende" de.',
      "Tekerlemeyi h\u0131zl\u0131ca 3 kez s\xF6yle: \u015Eu k\xF6\u015Fe yaz k\xF6\u015Fesi, \u015Fu k\xF6\u015Fe k\u0131\u015F k\xF6\u015Fesi.",
      "Solundaki ki\u015Fiye yeni bir lakap bul, bu seans herkes ona \xF6yle seslensin.",
      "15 saniyede 10 meyve say.",
      "Bir reklam m\xFCzi\u011Fi uydur ve s\xF6yle.",
      "Masadaki bir e\u015Fyay\u0131 20 saniye boyunca satmaya \xE7al\u0131\u015F.",
      "Masadan biriyle bak\u0131\u015Fma yar\u0131\u015F\u0131 yap, ilk g\xFClen kaybeder.",
      "G\xF6zlerini kapat, masadakilerden biri konu\u015Fsun, sesinden kim oldu\u011Funu bil.",
      "En son izledi\u011Fin diziyi 3 kelimeyle anlat.",
      "A\u011Fz\u0131nda limon varm\u0131\u015F gibi 10 saniye y\xFCz ifadesi yap.",
      "G\xFClmeden bir f\u0131kra anlat.",
      "Sonraki turda sorulan her \u015Feye soruyla cevap ver.",
      "Masadakilerden birinin nas\u0131l g\xFCld\xFC\u011F\xFCn\xFC taklit et.",
      'Bir dakika boyunca "ben" kelimesini kullanmadan konu\u015F.',
      "Masadaki herkesin ad\u0131n\u0131 tersten s\xF6yle.",
      "Bir sonraki sipari\u015Fini robot sesiyle masaya duyur."
    ];
    var TYPES = { truth: "Do\u011Fruluk", dare: "Cesaret" };
    module2.exports = {
      meta: {
        id: "dogruluk-cesaret",
        name: "Do\u011Fruluk mu Cesaret mi?",
        emoji: "\u{1F3AF}",
        category: "parti",
        color: "#FF8FB1",
        description: "S\u0131ra sana gelince se\xE7: d\xFCr\xFCst bir cevap m\u0131, k\xFC\xE7\xFCk bir g\xF6rev mi?",
        minPlayers: 2,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        const scores = new Scoreboard(api);
        const passes = /* @__PURE__ */ new Map();
        const decks = { truth: makeDeck(TRUTHS), dare: makeDeck(DARES) };
        let order = [];
        let turn = 0;
        let s = { phase: "loading", round: 0 };
        function nextTurn() {
          const players = api.players();
          if (players.length < 2) {
            s = { phase: "waiting", round: s.round };
            return api.update();
          }
          order = order.filter((id) => api.isConnected(id));
          const fresh = shuffle(players.map((p) => p.id).filter((id) => !order.includes(id)));
          order.push(...fresh);
          const targetId = order[turn % order.length];
          turn += 1;
          s = {
            phase: "choose",
            round: s.round + 1,
            targetId,
            askerId: pick(order.filter((id) => id !== targetId)),
            type: null,
            card: null,
            swapped: false,
            outcome: null
          };
          api.update();
        }
        const canControl = (id, isHost) => id === s.targetId || isHost && !api.isConnected(s.targetId);
        return {
          start() {
            nextTurn();
          },
          handle(playerId, action, payload, { isHost }) {
            switch (action) {
              case "choose": {
                if (s.phase !== "choose" || !canControl(playerId, isHost)) return;
                const type = payload.type === "random" ? pick(["truth", "dare"]) : payload.type;
                if (!TYPES[type]) return;
                s.type = type;
                s.card = decks[type]();
                s.phase = "card";
                api.update();
                break;
              }
              case "swap":
                if (s.phase !== "card" || s.swapped || !canControl(playerId, isHost)) return;
                s.card = decks[s.type]();
                s.swapped = true;
                api.update();
                break;
              case "done":
              case "pass":
                if (s.phase !== "card") return;
                if (!(canControl(playerId, isHost) || playerId === s.askerId)) return;
                s.outcome = action;
                s.phase = "outcome";
                if (action === "done") scores.add(s.targetId, s.type === "dare" ? 2 : 1);
                else passes.set(s.targetId, (passes.get(s.targetId) ?? 0) + 1);
                api.update();
                api.setTimer(nextTurn, 3500);
                break;
              case "skip":
                if (isHost && (s.phase === "choose" || s.phase === "card" || s.phase === "waiting")) nextTurn();
                break;
              default:
                break;
            }
          },
          playerJoined() {
            if (s.phase === "waiting") nextTurn();
            else api.update();
          },
          playerLeft() {
            api.update();
          },
          playerRemoved(id) {
            if (id === s.targetId && (s.phase === "choose" || s.phase === "card")) nextTurn();
          },
          view(playerId) {
            return {
              phase: s.phase,
              round: s.round,
              targetId: s.targetId,
              target: s.targetId ? api.nickname(s.targetId) : null,
              asker: s.askerId ? api.nickname(s.askerId) : null,
              isTarget: playerId === s.targetId,
              isAsker: playerId === s.askerId,
              targetConnected: s.targetId ? api.isConnected(s.targetId) : true,
              type: s.type,
              typeLabel: s.type ? TYPES[s.type] : null,
              card: s.card,
              swapped: s.swapped,
              outcome: s.outcome,
              scoreboard: scores.list().map((x) => ({ ...x, passes: passes.get(x.id) ?? 0 }))
            };
          }
        };
      }
    };
  }
});

// server/games/benHic.js
var require_benHic = __commonJS({
  "server/games/benHic.js"(exports2, module2) {
    var { makeDeck, AnswerRound } = require_shared();
    var LIVES = 5;
    var CARDS = [
      "bir s\u0131nava hi\xE7 \xE7al\u0131\u015Fmadan girmedim.",
      "derste uyuyakalmad\u0131m.",
      "otob\xFCste ya da metroda dura\u011F\u0131m\u0131 ka\xE7\u0131rmad\u0131m.",
      "bir mesaj\u0131 yanl\u0131\u015F ki\u015Fiye g\xF6ndermedim.",
      "bir diziyi tek gecede bitirmedim.",
      "sabaha kadar ders \xE7al\u0131\u015Fmad\u0131m.",
      'yere d\xFC\u015Fen yeme\u011Fi "3 saniye kural\u0131" deyip yemedim.',
      "alarm\u0131 erteledi\u011Fim i\xE7in ge\xE7 kalmad\u0131m.",
      'birinin ad\u0131n\u0131 unutup "kanka" diye ge\xE7i\u015Ftirmedim.',
      "kendi kendime konu\u015Furken yakalanmad\u0131m.",
      "bir filmde a\u011Flamad\u0131m.",
      "telefonum elimdeyken telefonumu aramad\u0131m.",
      "bana de\u011Fil de arkamdakine el sallayana kar\u015F\u0131l\u0131k vermedim.",
      "bir grup projesinde neredeyse hi\xE7bir \u015Fey yapmad\u0131m.",
      "spor salonuna yaz\u0131l\u0131p bir ay i\xE7inde b\u0131rakmad\u0131m.",
      "yemek yaparken bir \u015Feyi yakmad\u0131m.",
      "evde tek ba\u015F\u0131ma dans etmedim.",
      "eski sevgilimin profiline bakmad\u0131m.",
      "kasada c\xFCzdan\u0131m\u0131 unuttu\u011Fumu fark etmedim.",
      "tatl\u0131y\u0131 yemekten \xF6nce yemedim.",
      "bir ma\xE7 sonucu y\xFCz\xFCnden b\xFCt\xFCn g\xFCn moralim bozuk gezmedim.",
      "payla\u015Fmak i\xE7in ayn\u0131 foto\u011Fraf\u0131 20 kez \xE7ekmedim.",
      "yolda tan\u0131d\u0131k birini g\xF6r\xFCp g\xF6rmezden gelmedim.",
      "kulakl\u0131k tak\u0131l\u0131 san\u0131p \u015Fark\u0131y\u0131 herkese dinletmedim.",
      "bir yeme\u011Fi s\u0131rf foto\u011Fraf\u0131 g\xFCzel diye sipari\u015F etmedim.",
      'bir filmin ortas\u0131nda uyuyup sonra "izledim" demedim.',
      "birine s\xFCrpriz do\u011Fum g\xFCn\xFC d\xFCzenlemedim.",
      "kahveyi ya da \xE7ay\u0131 \xFCst\xFCme d\xF6kmedim.",
      "gece yar\u0131s\u0131 buzdolab\u0131na bask\u0131n yapmad\u0131m.",
      "bir oyunu kaybedip trip atmad\u0131m.",
      "bir \u015Fark\u0131n\u0131n s\xF6zlerini y\u0131llarca yanl\u0131\u015F s\xF6ylemedim.",
      "\u015Farj\u0131m %1 iken panik yapmad\u0131m.",
      "birinin do\u011Fum g\xFCn\xFCn\xFC unutup sonradan fark etmedim.",
      "sesli mesaj\u0131 2 kat h\u0131zda dinlemedim.",
      "s\u0131nav sonucunu ailemden saklamad\u0131m.",
      "bir uygulaman\u0131n s\xF6zle\u015Fmesini okuyup kabul etmedim.",
      "otob\xFCse yeti\u015Fmek i\xE7in ko\u015Fup yine de ka\xE7\u0131rmad\u0131m.",
      "bir tart\u0131\u015Fmay\u0131 kazanmak i\xE7in uydurma bir bilgi s\xF6ylemedim."
    ];
    module2.exports = {
      meta: {
        id: "ben-hic",
        name: "Ben Hi\xE7\u2026",
        emoji: "\u{1F64A}",
        category: "parti",
        color: "#B9A8FF",
        description: "Yapt\u0131ysan itiraf et, parma\u011F\u0131n\u0131 indir. Son kalan kazan\u0131r.",
        minPlayers: 2,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        const deck = makeDeck(CARDS);
        const lives = /* @__PURE__ */ new Map();
        let s = { phase: "loading", round: 0 };
        let round = null;
        const alive = () => api.players().filter((p) => (lives.get(p.id) ?? LIVES) > 0);
        function nextCard() {
          api.players().forEach((p) => {
            if (!lives.has(p.id)) lives.set(p.id, LIVES);
          });
          const players = api.players();
          const standing = alive();
          if (players.length < 2) {
            s = { phase: "waiting", round: s.round };
            return api.update();
          }
          if (standing.length <= 1) {
            s = { phase: "over", round: s.round, winnerId: standing[0]?.id ?? null };
            return api.update();
          }
          round = new AnswerRound(api, standing.map((p) => p.id));
          s = { phase: "answer", round: s.round + 1, card: deck(), did: [] };
          api.update();
        }
        function reveal() {
          s.phase = "reveal";
          s.did = [...round.answers.entries()].filter(([, v]) => v).map(([id]) => id);
          s.did.forEach((id) => lives.set(id, Math.max(0, (lives.get(id) ?? LIVES) - 1)));
          api.update();
        }
        return {
          start() {
            nextCard();
          },
          handle(playerId, action, payload, { isHost }) {
            if (action === "answer" && s.phase === "answer" && round.canAnswer(playerId)) {
              round.answers.set(playerId, !!payload.did);
              if (round.done()) reveal();
              else api.update();
            }
            if (action === "reveal" && isHost && s.phase === "answer" && round.answers.size > 0) reveal();
            if (action === "next" && isHost && (s.phase === "reveal" || s.phase === "waiting")) nextCard();
            if (action === "restart" && isHost && s.phase === "over") {
              lives.clear();
              nextCard();
            }
          },
          playerJoined() {
            if (s.phase === "waiting") nextCard();
            else api.update();
          },
          playerLeft() {
            if (s.phase === "answer" && round.done()) reveal();
            else api.update();
          },
          view(playerId) {
            const myLives = lives.get(playerId) ?? LIVES;
            const v = {
              phase: s.phase,
              round: s.round,
              card: s.card,
              maxLives: LIVES,
              myLives,
              amIn: s.phase === "answer" ? round.canAnswer(playerId) : myLives > 0,
              lives: api.players().map((p) => ({ id: p.id, nickname: p.nickname, lives: lives.get(p.id) ?? LIVES })).sort((a, b) => b.lives - a.lives)
            };
            if (s.phase === "answer") {
              Object.assign(v, round.progress(), {
                people: round.people(),
                myAnswer: round.answers.has(playerId) ? round.answers.get(playerId) : null
              });
            }
            if (s.phase === "reveal") v.did = s.did.map((id) => ({ id, nickname: api.nickname(id) }));
            if (s.phase === "over") v.winner = s.winnerId ? api.nickname(s.winnerId) : null;
            return v;
          }
        };
      }
    };
  }
});

// server/games/kimYapar.js
var require_kimYapar = __commonJS({
  "server/games/kimYapar.js"(exports2, module2) {
    var { makeDeck, AnswerRound } = require_shared();
    var QUESTIONS = [
      "Masada ilk kim evlenir?",
      "Kim her yere en ge\xE7 gelir?",
      "Kim bir g\xFCn \xFCnl\xFC olur?",
      "Kim hesap gelince tuvalete ka\xE7ar?",
      "Kim s\u0131nav sabah\u0131 \xE7al\u0131\u015Fmaya ba\u015Flar?",
      "Zombi k\u0131yametinde ilk kim yakalan\u0131r?",
      "Kim en uzun sesli mesaj\u0131 atar?",
      "Kim bir g\xFCn kendi i\u015Fini kurar?",
      "Kim mesajlara en ge\xE7 d\xF6ner?",
      "Kim en iyi s\u0131r tutar?",
      "Tatilde en a\u011F\u0131r bavul kimin olur?",
      "Kim yurt d\u0131\u015F\u0131na yerle\u015Fir?",
      "Kim bir yar\u0131\u015Fma program\u0131n\u0131 kazan\u0131r?",
      "Kim en \xE7ok dizi izler?",
      "Kim en kolay kand\u0131r\u0131l\u0131r?",
      "Masan\u0131n en komi\u011Fi kim?",
      "Kim Survivor'da en uzun dayan\u0131r?",
      "Kim men\xFCye 10 dakika bak\u0131p yine ayn\u0131 \u015Feyi s\xF6yler?",
      "Kim yedi\u011Fi her \u015Feyin foto\u011Fraf\u0131n\u0131 \xE7eker?",
      'Kim "5 dakikaya oraday\u0131m" deyip daha evden \xE7\u0131kmam\u0131\u015Ft\u0131r?',
      "Kim milyoner olur?",
      "Kim kavgadan sonra ilk \xF6z\xFCr diler?",
      "Kim en iyi ev arkada\u015F\u0131 olur?",
      "Karaokede mikrofonu kim b\u0131rakmaz?",
      "Kim en iyi yeme\u011Fi yapar?",
      "Kim kaybolsa GPS bile bulamaz?",
      "Kim bir g\xFCn kitap yazar?",
      "Kim en \xE7ok alarm kurar?",
      "Kim bir tart\u0131\u015Fmay\u0131 asla kaybetmez?",
      "Kim 80 ya\u015F\u0131nda bile en gen\xE7 ruhlu olur?"
    ];
    module2.exports = {
      meta: {
        id: "kim-yapar",
        name: "Kim Yapar?",
        emoji: "\u{1F5F3}\uFE0F",
        category: "parti",
        color: "#7FD3FF",
        description: "Gizli oylama, herkesin \xF6n\xFCnde if\u015Fa. Kimse kimin oy verdi\u011Fini bilmez.",
        minPlayers: 3,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        const deck = makeDeck(QUESTIONS);
        const badges = /* @__PURE__ */ new Map();
        let s = { phase: "loading", round: 0 };
        let round = null;
        function nextQuestion() {
          const players = api.players();
          if (players.length < 3) {
            s = { phase: "waiting", round: s.round };
            return api.update();
          }
          round = new AnswerRound(api, players.map((p) => p.id));
          s = { phase: "vote", round: s.round + 1, question: deck(), results: null, winners: [] };
          api.update();
        }
        function reveal() {
          const tally = {};
          for (const target of round.answers.values()) tally[target] = (tally[target] || 0) + 1;
          const max = Math.max(0, ...Object.values(tally));
          s.results = Object.entries(tally).map(([id, votes]) => ({ id, nickname: api.nickname(id), votes })).sort((a, b) => b.votes - a.votes);
          s.winners = s.results.filter((r) => r.votes === max).map((r) => r.id);
          s.winners.forEach((id) => badges.set(id, [...badges.get(id) ?? [], s.question]));
          s.phase = "reveal";
          api.update();
        }
        return {
          start() {
            nextQuestion();
          },
          handle(playerId, action, payload, { isHost }) {
            if (action === "vote" && s.phase === "vote" && round.canAnswer(playerId) && round.ids.includes(payload.targetId)) {
              round.answers.set(playerId, payload.targetId);
              if (round.done()) reveal();
              else api.update();
            }
            if (action === "reveal" && isHost && s.phase === "vote" && round.answers.size > 0) reveal();
            if (action === "next" && isHost && (s.phase === "reveal" || s.phase === "waiting")) nextQuestion();
          },
          playerJoined() {
            if (s.phase === "waiting") nextQuestion();
            else api.update();
          },
          playerLeft() {
            if (s.phase === "vote" && round.done()) reveal();
            else api.update();
          },
          view(playerId) {
            const v = {
              phase: s.phase,
              round: s.round,
              question: s.question,
              badges: [...badges.entries()].map(([id, list]) => ({ id, nickname: api.nickname(id), count: list.length, last: list[list.length - 1] })).sort((a, b) => b.count - a.count)
            };
            if (s.phase === "vote") {
              Object.assign(v, round.progress(), {
                amIn: round.canAnswer(playerId),
                myVote: round.answers.get(playerId) ?? null,
                candidates: round.people()
              });
            }
            if (s.phase === "reveal") {
              v.results = s.results;
              v.winners = s.winners.map((id) => api.nickname(id));
              v.iWon = s.winners.includes(playerId);
            }
            return v;
          }
        };
      }
    };
  }
});

// server/games/tostunaDovus.js
var require_tostunaDovus = __commonJS({
  "server/games/tostunaDovus.js"(exports2, module2) {
    var { randInt } = require_utils();
    var { Scoreboard } = require_shared();
    var MIN_WAIT = 2e3;
    var MAX_EXTRA_WAIT = 4e3;
    var GO_WINDOW_MS = 4e3;
    var HUMAN_MIN_MS = 90;
    module2.exports = {
      meta: {
        id: "tostuna-dovus",
        name: "Tostuna D\xF6v\xFC\u015F",
        emoji: "\u26A1",
        category: "refleks",
        color: "#3DDC97",
        description: "Ekran ye\u015File d\xF6nd\xFC\u011F\xFC an bas. En h\u0131zl\u0131 parmak puan\u0131 kapar.",
        minPlayers: 2,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        const scores = new Scoreboard(api);
        let s = { phase: "ready", round: 0, goId: 0 };
        let timer = null;
        const clear = () => {
          if (timer) api.clearTimer(timer);
          timer = null;
        };
        const activeIn = () => s.participants.filter((id) => api.isConnected(id) && !s.early.has(id));
        function startRound() {
          clear();
          const players = api.players();
          if (players.length < 2) return api.toast("En az 2 ki\u015Fi laz\u0131m.");
          s = {
            phase: "wait",
            round: s.round + 1,
            goId: s.goId,
            participants: players.map((p) => p.id),
            early: /* @__PURE__ */ new Set(),
            times: /* @__PURE__ */ new Map(),
            ranking: null
          };
          api.update();
          timer = api.setTimer(go, MIN_WAIT + randInt(MAX_EXTRA_WAIT));
        }
        function go() {
          s.phase = "go";
          s.goId += 1;
          api.update();
          timer = api.setTimer(finish, GO_WINDOW_MS);
        }
        function maybeFinish() {
          if (s.phase === "go" && activeIn().every((id) => s.times.has(id))) finish();
          else if (s.phase === "wait" && activeIn().length === 0) finish();
          else api.update();
        }
        function finish() {
          clear();
          s.phase = "result";
          s.ranking = [...s.times.entries()].map(([id, ms]) => ({ id, nickname: api.nickname(id), ms })).sort((a, b) => a.ms - b.ms);
          if (s.ranking[0]) scores.add(s.ranking[0].id, 1);
          s.earlyNames = [...s.early].map((id) => api.nickname(id));
          api.update();
        }
        return {
          start() {
          },
          handle(playerId, action, payload) {
            if (action === "start" && (s.phase === "ready" || s.phase === "result")) return startRound();
            if (action !== "tap" || !s.participants?.includes(playerId)) return;
            if (s.early.has(playerId) || s.times.has(playerId)) return;
            const ms = Number(payload.ms);
            const tooEarly = s.phase === "wait" || !Number.isFinite(ms) || ms < HUMAN_MIN_MS;
            if (s.phase !== "wait" && s.phase !== "go") return;
            if (tooEarly) s.early.add(playerId);
            else s.times.set(playerId, Math.min(Math.round(ms), GO_WINDOW_MS));
            maybeFinish();
          },
          playerLeft() {
            if (s.phase === "go" || s.phase === "wait") maybeFinish();
            else api.update();
          },
          playerJoined() {
            api.update();
          },
          dispose() {
            clear();
          },
          view(playerId) {
            const inRound = !!s.participants?.includes(playerId);
            return {
              phase: s.phase,
              round: s.round,
              goId: s.goId,
              amIn: inRound,
              myEarly: inRound && s.early.has(playerId),
              myTime: inRound ? s.times.get(playerId) ?? null : null,
              tappedCount: s.times ? s.times.size : 0,
              total: s.participants ? activeIn().length + (s.early?.size ?? 0) : 0,
              ranking: s.ranking,
              earlyNames: s.earlyNames ?? [],
              scoreboard: scores.list()
            };
          }
        };
      }
    };
  }
});

// server/games/buMuSuMu.js
var require_buMuSuMu = __commonJS({
  "server/games/buMuSuMu.js"(exports2, module2) {
    var { makeDeck, AnswerRound } = require_shared();
    var DILEMMAS = [
      ["Bir y\u0131l internetsiz", "Bir y\u0131l tatl\u0131s\u0131z"],
      ["Ge\xE7mi\u015Fe gitmek", "Gelece\u011Fe gitmek"],
      ["Her yere 20 dk erken", "Her yere 20 dk ge\xE7"],
      ["U\xE7abilmek", "G\xF6r\xFCnmez olmak"],
      ["S\u0131n\u0131rs\u0131z \xE7ay", "S\u0131n\u0131rs\u0131z kahve"],
      ["Deniz tatili", "Kamp"],
      ["\xD6m\xFCr boyu sadece d\xF6ner", "\xD6m\xFCr boyu sadece lahmacun"],
      ["Kedi", "K\xF6pek"],
      ["Zengin ama s\u0131k\u0131c\u0131 hayat", "Az parayla maceral\u0131 hayat"],
      ["T\xFCm dilleri konu\u015Fmak", "T\xFCm enstr\xFCmanlar\u0131 \xE7almak"],
      ["Hi\xE7 bitmeyen \u015Farj", "Hi\xE7 bitmeyen internet paketi"],
      ["Yaz", "K\u0131\u015F"],
      ["Film", "Dizi"],
      ["Simit", "Po\u011Fa\xE7a"],
      ["Ayran", "Kola"],
      ["Mant\u0131", "\u0130skender"],
      ["Konser", "Ma\xE7"],
      ["D\xFC\u015F\xFCnceleri okumak", "Gelece\u011Fi g\xF6rmek"],
      ["Hep \u015Fark\u0131 s\xF6yleyerek konu\u015Fmak", "Hep kafiyeli konu\u015Fmak"],
      ["\xDCnl\xFC olmak", "Zengin olmak"],
      ["Kitap", "Podcast"],
      ["Uzayda bir hafta", "Okyanus alt\u0131nda bir hafta"],
      ["Yaz\u0131l\u0131 s\u0131nav", "S\xF6zl\xFC s\u0131nav"],
      ["Tek ba\u015F\u0131na tatil", "Kalabal\u0131k tatil"],
      ["Evde film gecesi", "D\u0131\u015Far\u0131da gece gezmesi"],
      ["Her sabah 5'te kalkmak", "Her gece 3'te yatmak"],
      ["S\u0131cak \xE7orba", "Dondurma"],
      ["Otob\xFCs", "Vapur"],
      ["Hayvanlarla konu\u015Fmak", "Bitkileri b\xFCy\xFCtme g\xFCc\xFC"],
      ["Telefonsuz bir ay", "Arkada\u015Fs\u0131z bir ay"],
      ["Her g\xFCn ayn\u0131 k\u0131yafet", "Her g\xFCn ayn\u0131 yemek"],
      ["S\xFCper h\u0131zl\u0131 okumak", "Hi\xE7 uyumaya ihtiya\xE7 duymamak"],
      ["Menemen so\u011Fanl\u0131", "Menemen so\u011Fans\u0131z"],
      ["Sahilde g\xFCn bat\u0131m\u0131", "Da\u011Fda g\xFCn do\u011Fumu"]
    ];
    module2.exports = {
      meta: {
        id: "bu-mu-su-mu",
        name: "Bu mu \u015Eu mu?",
        emoji: "\u2696\uFE0F",
        category: "parti",
        color: "#FFB443",
        description: "\u0130ki se\xE7enek, tek karar. Masa ikiye b\xF6l\xFCn\xFCyor mu?",
        minPlayers: 2,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        const deck = makeDeck(DILEMMAS);
        let s = { phase: "loading", round: 0 };
        let round = null;
        let unanimous = 0;
        function next() {
          const players = api.players();
          if (players.length < 2) {
            s = { phase: "waiting", round: s.round };
            return api.update();
          }
          round = new AnswerRound(api, players.map((p) => p.id));
          s = { phase: "answer", round: s.round + 1, options: deck(), sides: null };
          api.update();
        }
        function reveal() {
          const sides = [[], []];
          for (const [id, choice] of round.answers) sides[choice].push(api.nickname(id));
          s.sides = sides;
          if (sides[0].length === 0 || sides[1].length === 0) unanimous += 1;
          s.phase = "reveal";
          api.update();
        }
        return {
          start() {
            next();
          },
          handle(playerId, action, payload, { isHost }) {
            if (action === "pick" && s.phase === "answer" && round.canAnswer(playerId) && (payload.choice === 0 || payload.choice === 1)) {
              round.answers.set(playerId, payload.choice);
              if (round.done()) reveal();
              else api.update();
            }
            if (action === "reveal" && isHost && s.phase === "answer" && round.answers.size > 0) reveal();
            if (action === "next" && isHost && (s.phase === "reveal" || s.phase === "waiting")) next();
          },
          playerJoined() {
            if (s.phase === "waiting") next();
            else api.update();
          },
          playerLeft() {
            if (s.phase === "answer" && round.done()) reveal();
            else api.update();
          },
          view(playerId) {
            const v = { phase: s.phase, round: s.round, options: s.options, unanimous };
            if (s.phase === "answer") {
              Object.assign(v, round.progress(), {
                amIn: round.canAnswer(playerId),
                myChoice: round.answers.has(playerId) ? round.answers.get(playerId) : null,
                people: round.people()
              });
            }
            if (s.phase === "reveal") {
              v.sides = s.sides;
              v.myChoice = round.answers.has(playerId) ? round.answers.get(playerId) : null;
            }
            return v;
          }
        };
      }
    };
  }
});

// server/games/bilBakalim.js
var require_bilBakalim = __commonJS({
  "server/games/bilBakalim.js"(exports2, module2) {
    var { shuffle } = require_utils();
    var { Scoreboard, AnswerRound } = require_shared();
    var QUESTIONS_PER_GAME = 10;
    var ANSWER_MS = 15e3;
    var REVEAL_MS = 5e3;
    var BANK = [
      ["T\xFCrkiye'nin ba\u015Fkenti neresidir?", "Ankara", "\u0130stanbul", "\u0130zmir", "Bursa"],
      ['"K\u0131z\u0131l Gezegen" olarak bilinen gezegen hangisi?', "Mars", "Ven\xFCs", "J\xFCpiter", "Merk\xFCr"],
      ["Nasreddin Hoca hangi il\xE7eyle \xF6zde\u015Fle\u015Fmi\u015Ftir?", "Ak\u015Fehir", "Safranbolu", "Beypazar\u0131", "Birgi"],
      ["Mona Lisa tablosunu kim yapm\u0131\u015Ft\u0131r?", "Leonardo da Vinci", "Picasso", "Van Gogh", "Rembrandt"],
      ["D\xFCnyan\u0131n en b\xFCy\xFCk okyanusu hangisidir?", "Pasifik", "Atlas", "Hint", "Arktik"],
      ["T\xFCrkiye'nin en y\xFCksek da\u011F\u0131 hangisidir?", "A\u011Fr\u0131 Da\u011F\u0131", "Erciyes", "Uluda\u011F", "Paland\xF6ken"],
      ["Suyun kimyasal form\xFCl\xFC nedir?", "H\u2082O", "CO\u2082", "O\u2082", "NaCl"],
      ["\u0130stiklal Mar\u015F\u0131'n\u0131n \u015Fairi kimdir?", "Mehmet Akif Ersoy", "Nam\u0131k Kemal", "Naz\u0131m Hikmet", "Yahya Kemal"],
      ["Hangisi bir memelidir?", "Yunus", "K\xF6pekbal\u0131\u011F\u0131", "Ahtapot", "Penguen"],
      ["Futbolda bir tak\u0131m sahaya ka\xE7 oyuncuyla \xE7\u0131kar?", "11", "10", "9", "12"],
      ["Pizza hangi \xFClkenin mutfa\u011F\u0131ndan \xE7\u0131km\u0131\u015Ft\u0131r?", "\u0130talya", "Fransa", "Yunanistan", "\u0130spanya"],
      ["Hangisi daha h\u0131zl\u0131 yay\u0131l\u0131r?", "I\u015F\u0131k", "Ses", "\u0130kisi e\u015Fit", "R\xFCzg\xE2r"],
      ["Tamam\u0131 T\xFCrkiye s\u0131n\u0131rlar\u0131 i\xE7inde kalan en uzun nehir hangisi?", "K\u0131z\u0131l\u0131rmak", "F\u0131rat", "Sakarya", "Ye\u015Fil\u0131rmak"],
      ["Van G\xF6l\xFC hangi b\xF6lgemizdedir?", "Do\u011Fu Anadolu", "\u0130\xE7 Anadolu", "Karadeniz", "G\xFCneydo\u011Fu Anadolu"],
      ["G\xFCne\u015F Sistemi'nin en b\xFCy\xFCk gezegeni hangisi?", "J\xFCpiter", "Sat\xFCrn", "Nept\xFCn", "D\xFCnya"],
      ["Peri bacalar\u0131yla \xFCnl\xFC Kapadokya hangi ilimizdedir?", "Nev\u015Fehir", "Konya", "Kayseri", "Aksaray"],
      ["Standart bir piyanoda ka\xE7 tu\u015F vard\u0131r?", "88", "76", "64", "100"],
      ["Galata Kulesi hangi \u015Fehirdedir?", "\u0130stanbul", "\u0130zmir", "Trabzon", "Antalya"],
      ["Kanguru hangi \xFClkenin simgesidir?", "Avustralya", "Yeni Zelanda", "G\xFCney Afrika", "Brezilya"],
      ["Yaz Olimpiyatlar\u0131 ka\xE7 y\u0131lda bir d\xFCzenlenir?", "4", "2", "3", "5"],
      ['"Sefiller" roman\u0131n\u0131n yazar\u0131 kimdir?', "Victor Hugo", "Tolstoy", "Dostoyevski", "Balzac"],
      ["\u0130nsan v\xFCcudunun en b\xFCy\xFCk organ\u0131 hangisidir?", "Deri", "Karaci\u011Fer", "Akci\u011Fer", "Beyin"],
      ["Everest Da\u011F\u0131 hangi s\u0131rada\u011Flardad\u0131r?", "Himalayalar", "Alpler", "And Da\u011Flar\u0131", "Kafkaslar"],
      ["Hangisi bir programlama dilidir?", "Python", "Pusula", "Mozaik", "Karakalem"],
      ["Pamukkale travertenleri hangi ilimizdedir?", "Denizli", "Mu\u011Fla", "Ayd\u0131n", "Burdur"],
      ["Mavi ile sar\u0131 kar\u0131\u015F\u0131nca hangi renk olur?", "Ye\u015Fil", "Mor", "Turuncu", "Kahverengi"],
      ["Truva At\u0131 efsanesi hangi ilimizdeki antik kentle ilgilidir?", "\xC7anakkale", "\u0130zmir", "Bal\u0131kesir", "Bursa"],
      ["Kurtulu\u015F Sava\u015F\u0131'n\u0131n ba\u015Flang\u0131c\u0131 say\u0131lan tarih hangisi?", "19 May\u0131s 1919", "23 Nisan 1920", "29 Ekim 1923", "30 A\u011Fustos 1922"],
      ["Satran\xE7 tahtas\u0131nda ka\xE7 kare vard\u0131r?", "64", "48", "81", "100"],
      ["Hangisi bir ku\u015F de\u011Fildir?", "Yarasa", "Penguen", "Deveku\u015Fu", "Kivi"],
      ["T\xFCrk\xE7ede ka\xE7 harf vard\u0131r?", "29", "26", "28", "31"],
      ["Ay'a ilk ayak basan insan kimdir?", "Neil Armstrong", "Yuri Gagarin", "Buzz Aldrin", "Elon Musk"]
    ];
    module2.exports = {
      meta: {
        id: "bil-bakalim",
        name: "Bil Bakal\u0131m",
        emoji: "\u{1F9E0}",
        category: "bilgi",
        color: "#FFF6E9",
        description: "10 soruluk bilgi yar\u0131\u015Fmas\u0131. Hem do\u011Fru hem h\u0131zl\u0131 olan kazan\u0131r.",
        minPlayers: 2,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        let scores = new Scoreboard(api);
        let queue = [];
        let s = { phase: "loading" };
        let round = null;
        let timer = null;
        const clear = () => {
          if (timer) api.clearTimer(timer);
          timer = null;
        };
        function newGame() {
          scores = new Scoreboard(api);
          queue = shuffle(BANK).slice(0, QUESTIONS_PER_GAME);
          s = { phase: "loading", index: 0 };
          nextQuestion();
        }
        function nextQuestion() {
          clear();
          if (!queue.length) {
            s = { phase: "final", index: s.index };
            return api.update();
          }
          const [question, correct, ...wrong] = queue.shift();
          const options = shuffle([correct, ...wrong]);
          round = new AnswerRound(api, api.players().map((p) => p.id));
          s = {
            phase: "question",
            index: s.index + 1,
            question,
            options,
            correctIndex: options.indexOf(correct),
            startedAt: Date.now(),
            endsAt: Date.now() + ANSWER_MS,
            gained: {}
          };
          api.update();
          timer = api.setTimer(reveal, ANSWER_MS);
        }
        function reveal() {
          clear();
          for (const [id, a] of round.answers) {
            if (a.choice !== s.correctIndex) continue;
            const speed = Math.max(0, 1 - (a.at - s.startedAt) / ANSWER_MS);
            const points = 500 + Math.round(500 * speed);
            s.gained[id] = points;
            scores.add(id, points);
          }
          s.phase = "reveal";
          api.update();
          timer = api.setTimer(nextQuestion, REVEAL_MS);
        }
        return {
          start() {
            newGame();
          },
          handle(playerId, action, payload, { isHost }) {
            if (action === "answer" && s.phase === "question" && round.canAnswer(playerId) && !round.answers.has(playerId)) {
              const choice = Number(payload.choice);
              if (!(choice >= 0 && choice < s.options.length)) return;
              round.answers.set(playerId, { choice, at: Date.now() });
              if (round.done()) reveal();
              else api.update();
            }
            if (action === "restart" && isHost && s.phase === "final") newGame();
          },
          playerJoined() {
            api.update();
          },
          playerLeft() {
            if (s.phase === "question" && round.done()) reveal();
            else api.update();
          },
          dispose() {
            clear();
          },
          view(playerId) {
            const v = { phase: s.phase, index: s.index, questionCount: QUESTIONS_PER_GAME, scoreboard: scores.list() };
            if (s.phase === "question" || s.phase === "reveal") {
              Object.assign(v, round.progress(), {
                question: s.question,
                options: s.options,
                endsAt: s.endsAt,
                amIn: round.canAnswer(playerId),
                myChoice: round.answers.get(playerId)?.choice ?? null
              });
            }
            if (s.phase === "reveal") {
              v.correctIndex = s.correctIndex;
              v.myGain = s.gained[playerId] ?? 0;
              v.correctNames = Object.keys(s.gained).map((id) => api.nickname(id));
            }
            return v;
          }
        };
      }
    };
  }
});

// server/games/tahminUstasi.js
var require_tahminUstasi = __commonJS({
  "server/games/tahminUstasi.js"(exports2, module2) {
    var { makeDeck, AnswerRound, Scoreboard } = require_shared();
    var QUESTIONS = [
      ["T\xFCrkiye'de ka\xE7 il var?", 81, "il", [1, 200]],
      ["Cumhuriyet hangi y\u0131l ilan edildi?", 1923, "y\u0131l\u0131", [1800, 2e3]],
      ["\u0130stanbul hangi y\u0131l fethedildi?", 1453, "y\u0131l\u0131", [1e3, 1700]],
      ["Malazgirt Meydan Muharebesi hangi y\u0131l yap\u0131ld\u0131?", 1071, "y\u0131l\u0131", [800, 1400]],
      ["A\u011Fr\u0131 Da\u011F\u0131 ka\xE7 metredir?", 5137, "metre", [2e3, 9e3]],
      ["Yeti\u015Fkin bir insanda ka\xE7 kemik vard\u0131r?", 206, "kemik", [50, 500]],
      ["Everest Da\u011F\u0131 yakla\u015F\u0131k ka\xE7 metredir?", 8849, "metre", [5e3, 12e3]],
      ["I\u015F\u0131k saniyede yakla\u015F\u0131k ka\xE7 km yol al\u0131r?", 299792, "km", [1e3, 1e6]],
      ["Standart bir iskambil destesinde (jokersiz) ka\xE7 kart var?", 52, "kart", [10, 100]],
      ["Periyodik tabloda ka\xE7 element var?", 118, "element", [50, 200]],
      ["Mustafa Kemal Atat\xFCrk hangi y\u0131l do\u011Fdu?", 1881, "y\u0131l\u0131", [1800, 1950]],
      ["TBMM hangi y\u0131l a\xE7\u0131ld\u0131?", 1920, "y\u0131l\u0131", [1850, 1950]],
      ["\u0130nsan Ay'a ilk kez hangi y\u0131l ayak bast\u0131?", 1969, "y\u0131l\u0131", [1900, 2020]],
      ["Bir maraton ka\xE7 kilometredir?", 42.195, "km", [5, 100]],
      ["\u0130lk FIFA D\xFCnya Kupas\u0131 hangi y\u0131l d\xFCzenlendi?", 1930, "y\u0131l\u0131", [1850, 2e3]],
      ["Be\u015Fikta\u015F hangi y\u0131l kuruldu?", 1903, "y\u0131l\u0131", [1850, 1950]],
      ["Galatasaray hangi y\u0131l kuruldu?", 1905, "y\u0131l\u0131", [1850, 1950]],
      ["Fenerbah\xE7e hangi y\u0131l kuruldu?", 1907, "y\u0131l\u0131", [1850, 1950]],
      ["Bir g\xFCnde ka\xE7 saniye var?", 86400, "saniye", [1e3, 2e5]],
      ["Standart bir piyanoda ka\xE7 tu\u015F var?", 88, "tu\u015F", [20, 200]],
      ["Olimpiyat bayra\u011F\u0131nda ka\xE7 halka var?", 5, "halka", [1, 20]],
      ["T\xFCrkiye 2002 D\xFCnya Kupas\u0131'n\u0131 ka\xE7\u0131nc\u0131 s\u0131rada bitirdi?", 3, ". s\u0131ra", [1, 32]],
      ["Bir y\u0131lda ka\xE7 tam hafta var?", 52, "hafta", [10, 100]],
      ["T\xFCrk alfabesinde ka\xE7 harf var?", 29, "harf", [10, 50]],
      ["Suyun deniz seviyesinde kaynama noktas\u0131 ka\xE7 \xB0C?", 100, "\xB0C", [0, 300]]
    ];
    module2.exports = {
      meta: {
        id: "tahmin-ustasi",
        name: "Tahmin Ustas\u0131",
        emoji: "\u{1F522}",
        category: "bilgi",
        color: "#8EE3D8",
        description: "Cevab\u0131 bilmek \u015Fart de\u011Fil. Say\u0131ya en \xE7ok yakla\u015Fan kazan\u0131r.",
        minPlayers: 2,
        maxPlayers: 12,
        ready: true
      },
      create(api) {
        const deck = makeDeck(QUESTIONS);
        const scores = new Scoreboard(api);
        let s = { phase: "loading", round: 0 };
        let round = null;
        function next() {
          const players = api.players();
          if (players.length < 2) {
            s = { phase: "waiting", round: s.round };
            return api.update();
          }
          const [question, answer, unit, range] = deck();
          round = new AnswerRound(api, players.map((p) => p.id));
          s = { phase: "answer", round: s.round + 1, question, answer, unit, range, ranking: null };
          api.update();
        }
        function reveal() {
          const ranking = [...round.answers.entries()].map(([id, guess]) => ({ id, nickname: api.nickname(id), guess, diff: Math.abs(guess - s.answer) })).sort((a, b) => a.diff - b.diff);
          const best = ranking[0]?.diff;
          ranking.forEach((r) => {
            r.win = r.diff === best;
            r.exact = r.diff === 0;
            if (r.win) scores.add(r.id, r.exact ? 3 : 1);
          });
          s.ranking = ranking;
          s.phase = "reveal";
          api.update();
        }
        return {
          start() {
            next();
          },
          handle(playerId, action, payload, { isHost }) {
            if (action === "guess" && s.phase === "answer" && round.canAnswer(playerId)) {
              const guess = Number(String(payload.value ?? "").replace(",", "."));
              if (!Number.isFinite(guess) || Math.abs(guess) > 1e9) return api.toast("Ge\xE7erli bir say\u0131 yaz.", playerId);
              round.answers.set(playerId, guess);
              if (round.done()) reveal();
              else api.update();
            }
            if (action === "reveal" && isHost && s.phase === "answer" && round.answers.size > 0) reveal();
            if (action === "next" && isHost && (s.phase === "reveal" || s.phase === "waiting")) next();
          },
          playerJoined() {
            if (s.phase === "waiting") next();
            else api.update();
          },
          playerLeft() {
            if (s.phase === "answer" && round.done()) reveal();
            else api.update();
          },
          view(playerId) {
            const v = { phase: s.phase, round: s.round, question: s.question, unit: s.unit, range: s.range, scoreboard: scores.list() };
            if (s.phase === "answer") {
              Object.assign(v, round.progress(), {
                amIn: round.canAnswer(playerId),
                myGuess: round.answers.has(playerId) ? round.answers.get(playerId) : null,
                people: round.people()
              });
            }
            if (s.phase === "reveal") Object.assign(v, { answer: s.answer, ranking: s.ranking });
            return v;
          }
        };
      }
    };
  }
});

// server/games/index.js
var require_games = __commonJS({
  "server/games/index.js"(exports2, module2) {
    var hesabiKimOder = require_hesabiKimOder();
    var aramizdakiCasus = require_aramizdakiCasus();
    var dogrulukCesaret = require_dogrulukCesaret();
    var benHic = require_benHic();
    var kimYapar = require_kimYapar();
    var tostunaDovus = require_tostunaDovus();
    var buMuSuMu = require_buMuSuMu();
    var bilBakalim = require_bilBakalim();
    var tahminUstasi = require_tahminUstasi();
    var CATEGORIES = [
      { id: "hepsi", name: "Hepsi" },
      { id: "sans", name: "\u015Eans" },
      { id: "parti", name: "Parti" },
      { id: "blof", name: "Bl\xF6f" },
      { id: "refleks", name: "Refleks" },
      { id: "bilgi", name: "Bilgi" }
    ];
    var MODULES = [
      hesabiKimOder,
      aramizdakiCasus,
      dogrulukCesaret,
      benHic,
      kimYapar,
      tostunaDovus,
      buMuSuMu,
      bilBakalim,
      tahminUstasi
    ];
    var registry = new Map(MODULES.map((m) => [m.meta.id, m]));
    function getCatalog() {
      return { categories: CATEGORIES, games: MODULES.map((m) => ({ ...m.meta })) };
    }
    function getGame(id) {
      return registry.get(id);
    }
    module2.exports = { getCatalog, getGame };
  }
});

// server/RoomManager.js
var require_RoomManager = __commonJS({
  "server/RoomManager.js"(exports2, module2) {
    var config2 = require_config();
    var games2 = require_games();
    var { randomCode, uid, cleanNickname, UserError } = require_utils();
    var RoomManager2 = class {
      constructor(io2) {
        this.io = io2;
        this.rooms = /* @__PURE__ */ new Map();
        this.stats = { since: Date.now(), roomsCreated: 0, playersJoined: 0, bySource: {}, gamesStarted: {} };
      }
      count() {
        return this.rooms.size;
      }
      /* ======================= Giriş / Çıkış ======================= */
      // source: QR'ın hangi işletmeden okutulduğu (?kaynak=cafe-x). Sadece istatistik içindir.
      create(socket, { nickname, source } = {}) {
        const nick = this._requireNick(nickname);
        const room = this._createRoom(this._cleanSource(source));
        this._count(room.source, "rooms");
        return this._enter(socket, room, nick);
      }
      join(socket, { code, nickname } = {}) {
        const nick = this._requireNick(nickname);
        const room = this.rooms.get(String(code ?? "").trim().toUpperCase());
        if (!room) throw new UserError("Bu kodla a\xE7\u0131k bir oda yok. Kodu kontrol et.");
        if (room.ended) throw new UserError("Bu masan\u0131n s\xFCresi doldu.");
        if (this._connectedCount(room) >= config2.MAX_PLAYERS) throw new UserError("Oda dolu.");
        return this._enter(socket, room, nick);
      }
      getStats() {
        let players = 0;
        this.rooms.forEach((r) => {
          players += this._connectedCount(r);
        });
        return { ...this.stats, activeRooms: this.rooms.size, activePlayers: players };
      }
      // Sayfa yenilendiğinde / bağlantı koptuğunda aynı oyuncu olarak geri dön
      resume(socket, { code, token } = {}) {
        const room = this.rooms.get(String(code ?? "").toUpperCase());
        if (!room) throw new UserError("Oda art\u0131k a\xE7\u0131k de\u011Fil.");
        const player = [...room.players.values()].find((p) => p.token === token);
        if (!player) throw new UserError("Bu odadaki oturumun bulunamad\u0131.");
        if (room.ended) {
          socket.emit("session:ended", this._endPayload(room));
          return { ok: true, ended: true };
        }
        const oldSocketId = player.socketId;
        this._attach(socket, room, player);
        if (oldSocketId && oldSocketId !== socket.id) this.io.sockets.sockets.get(oldSocketId)?.disconnect(true);
        room.game?.playerJoined?.(player.id);
        return { ok: true, code: room.code, playerId: player.id, room: this._publicRoom(room) };
      }
      leave(socket) {
        const ctx = this._ctx(socket, false);
        if (!ctx) return { ok: true };
        socket.leave(ctx.room.code);
        socket.data.code = null;
        this._removePlayer(ctx.room, ctx.player.id);
        return { ok: true };
      }
      handleDisconnect(socket) {
        const ctx = this._ctx(socket, false);
        if (!ctx) return;
        const { room, player } = ctx;
        if (player.socketId !== socket.id) return;
        player.connected = false;
        if (room.hostId === player.id) this._reassignHost(room);
        room.game?.playerLeft?.(player.id);
        this._broadcastRoom(room);
        player.dropTimer = setTimeout(() => this._removePlayer(room, player.id), config2.RECONNECT_GRACE_MS);
      }
      /* ======================= Oyun akışı ======================= */
      selectGame(socket, gameId) {
        const { room, player } = this._ctx(socket);
        this._requireActive(room);
        this._requireHost(room, player);
        const mod = games2.getGame(gameId);
        if (!mod || !mod.meta.ready) throw new UserError("Bu oyun hen\xFCz haz\u0131r de\u011Fil.");
        if (this._connectedCount(room) < mod.meta.minPlayers) {
          throw new UserError(`${mod.meta.name} i\xE7in en az ${mod.meta.minPlayers} ki\u015Fi laz\u0131m.`);
        }
        this._disposeGame(room);
        room.gameId = mod.meta.id;
        room.game = mod.create(this._createGameApi(room));
        this.stats.gamesStarted[mod.meta.id] = (this.stats.gamesStarted[mod.meta.id] ?? 0) + 1;
        this._broadcastRoom(room);
        room.game.start?.();
        this._sendGameState(room);
        return { ok: true };
      }
      exitGame(socket) {
        const { room, player } = this._ctx(socket);
        this._requireActive(room);
        this._requireHost(room, player);
        this._disposeGame(room);
        this._broadcastRoom(room);
        return { ok: true };
      }
      gameAction(socket, action, payload) {
        const { room, player } = this._ctx(socket);
        this._requireActive(room);
        if (!room.game) throw new UserError("\u015Eu an oynanan bir oyun yok.");
        if (typeof action !== "string" || action.length > 32) throw new UserError("Ge\xE7ersiz hamle.");
        room.game.handle(
          player.id,
          action,
          payload && typeof payload === "object" ? payload : {},
          { isHost: room.hostId === player.id }
        );
        return { ok: true };
      }
      /* ======================= 30 dk seans ======================= */
      _createRoom(source) {
        let code;
        do
          code = randomCode(4);
        while (this.rooms.has(code));
        const now = Date.now();
        const room = {
          code,
          source,
          hostId: null,
          players: /* @__PURE__ */ new Map(),
          createdAt: now,
          endsAt: now + config2.SESSION_MS,
          ended: false,
          gameId: null,
          game: null,
          gameTimers: /* @__PURE__ */ new Set(),
          timers: {}
        };
        room.timers.session = setTimeout(() => this.endSession(room), config2.SESSION_MS);
        if (config2.SESSION_MS > config2.WARN_BEFORE_MS) {
          room.timers.warn = setTimeout(
            () => this.io.to(code).emit("toast", { text: "Son 5 dakika! \u23F3" }),
            config2.SESSION_MS - config2.WARN_BEFORE_MS
          );
        }
        this.rooms.set(code, room);
        return room;
      }
      endSession(room) {
        if (room.ended) return;
        room.ended = true;
        this._disposeGame(room);
        clearTimeout(room.timers.warn);
        this.io.to(room.code).emit("session:ended", this._endPayload(room));
        this._broadcastRoom(room);
        room.timers.cleanup = setTimeout(() => this._destroy(room), config2.ROOM_CLEANUP_MS);
      }
      _destroy(room) {
        Object.values(room.timers).forEach(clearTimeout);
        this._disposeGame(room);
        room.players.forEach((p) => clearTimeout(p.dropTimer));
        this.rooms.delete(room.code);
        this.io.socketsLeave(room.code);
      }
      _cleanSource(raw) {
        const src = String(raw ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
        return src || "direkt";
      }
      _count(source, field) {
        const entry = this.stats.bySource[source] ??= { rooms: 0, players: 0 };
        entry[field] += 1;
        if (field === "rooms") this.stats.roomsCreated += 1;
        else this.stats.playersJoined += 1;
      }
      /* ======================= Oyuncu yardımcıları ======================= */
      _enter(socket, room, nick) {
        if (socket.data.code) this.leave(socket);
        const player = {
          id: uid(),
          token: uid(),
          nickname: this._uniqueNick(room, nick),
          socketId: null,
          connected: false,
          joinedAt: Date.now(),
          dropTimer: null
        };
        room.players.set(player.id, player);
        this._count(room.source, "players");
        this._attach(socket, room, player);
        room.game?.playerJoined?.(player.id);
        return {
          ok: true,
          code: room.code,
          playerId: player.id,
          token: player.token,
          room: this._publicRoom(room)
        };
      }
      _attach(socket, room, player) {
        clearTimeout(player.dropTimer);
        player.dropTimer = null;
        player.socketId = socket.id;
        player.connected = true;
        socket.join(room.code);
        socket.data.code = room.code;
        socket.data.playerId = player.id;
        if (!room.players.get(room.hostId)?.connected) room.hostId = player.id;
        this._broadcastRoom(room);
        if (room.game) this._sendGameStateTo(room, player);
      }
      _removePlayer(room, playerId) {
        const player = room.players.get(playerId);
        if (!player) return;
        clearTimeout(player.dropTimer);
        room.players.delete(playerId);
        if (room.hostId === playerId) this._reassignHost(room);
        room.game?.playerLeft?.(playerId);
        room.game?.playerRemoved?.(playerId);
        if (room.players.size === 0) {
          if (!room.ended) this._destroy(room);
          return;
        }
        this._broadcastRoom(room);
      }
      _reassignHost(room) {
        const next = [...room.players.values()].filter((p) => p.connected && p.id !== room.hostId).sort((a, b) => a.joinedAt - b.joinedAt)[0];
        if (next) {
          room.hostId = next.id;
          this.io.to(room.code).emit("toast", { text: `\u{1F451} Oda sahibi art\u0131k ${next.nickname}` });
        } else if (!room.players.has(room.hostId)) {
          room.hostId = room.players.keys().next().value ?? null;
        }
      }
      _uniqueNick(room, nick) {
        const taken = new Set([...room.players.values()].map((p) => p.nickname.toLocaleLowerCase("tr")));
        if (!taken.has(nick.toLocaleLowerCase("tr"))) return nick;
        for (let i = 2; ; i++) {
          const candidate = `${nick.slice(0, 13)} ${i}`;
          if (!taken.has(candidate.toLocaleLowerCase("tr"))) return candidate;
        }
      }
      _requireNick(raw) {
        const nick = cleanNickname(raw);
        if (nick.length < 2) throw new UserError("Takma ad\u0131n en az 2 harf olsun.");
        return nick;
      }
      _requireHost(room, player) {
        if (room.hostId !== player.id) throw new UserError("Bunu sadece oda sahibi yapabilir \u{1F451}");
      }
      _requireActive(room) {
        if (room.ended) throw new UserError("Masan\u0131n s\xFCresi doldu.");
      }
      _ctx(socket, strict = true) {
        const room = this.rooms.get(socket.data.code);
        const player = room?.players.get(socket.data.playerId);
        if (!room || !player) {
          if (strict) throw new UserError("\xD6nce bir odaya kat\u0131l.");
          return null;
        }
        return { room, player };
      }
      _connectedPlayers(room) {
        return [...room.players.values()].filter((p) => p.connected).sort((a, b) => a.joinedAt - b.joinedAt);
      }
      _connectedCount(room) {
        return this._connectedPlayers(room).length;
      }
      /* ======================= Oyun modülü köprüsü ======================= */
      // Oyun modüllerinin sunucu ile konuştuğu tek arayüz. Socket.io'yu bilmezler.
      _createGameApi(room) {
        return {
          players: () => this._connectedPlayers(room).map((p) => ({ id: p.id, nickname: p.nickname })),
          nickname: (id) => room.players.get(id)?.nickname ?? "Biri",
          isConnected: (id) => !!room.players.get(id)?.connected,
          hostId: () => room.hostId,
          update: () => this._sendGameState(room),
          toast: (text, playerId) => {
            if (!playerId) return this.io.to(room.code).emit("toast", { text });
            const sid = room.players.get(playerId)?.socketId;
            if (sid) this.io.to(sid).emit("toast", { text });
          },
          setTimer: (fn, ms) => {
            const t = setTimeout(() => {
              room.gameTimers.delete(t);
              try {
                fn();
              } catch (err) {
                console.error("[game timer]", err);
              }
            }, ms);
            room.gameTimers.add(t);
            return t;
          },
          clearTimer: (t) => {
            clearTimeout(t);
            room.gameTimers.delete(t);
          }
        };
      }
      _disposeGame(room) {
        room.gameTimers.forEach(clearTimeout);
        room.gameTimers.clear();
        room.game?.dispose?.();
        room.game = null;
        room.gameId = null;
      }
      /* ======================= Yayın ======================= */
      _publicRoom(room) {
        return {
          code: room.code,
          hostId: room.hostId,
          players: [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => ({ id: p.id, nickname: p.nickname, connected: p.connected, isHost: p.id === room.hostId })),
          endsAt: room.endsAt,
          sessionMs: config2.SESSION_MS,
          serverNow: Date.now(),
          // istemci saat farkını düzeltmek için
          gameId: room.gameId,
          ended: room.ended
        };
      }
      _endPayload() {
        return { brandUrl: config2.BRAND_URL };
      }
      _broadcastRoom(room) {
        this.io.to(room.code).emit("room:state", this._publicRoom(room));
      }
      // Her oyuncuya KENDİ görünümü gider: casusun kim olduğu gibi gizli bilgiler sızmaz
      _sendGameState(room) {
        if (!room.game) return;
        for (const p of room.players.values()) if (p.connected) this._sendGameStateTo(room, p);
      }
      _sendGameStateTo(room, player) {
        if (!room.game || !player.socketId) return;
        this.io.to(player.socketId).emit("game:state", { gameId: room.gameId, view: room.game.view(player.id) });
      }
    };
    module2.exports = RoomManager2;
  }
});

// server/index.js
var path = require("path");
var http = require("http");
var express = require("express");
var { Server } = require("socket.io");
var config = require_config();
var games = require_games();
var RoomManager = require_RoomManager();
var { createLimiter } = require_utils();
var app = express();
var server = http.createServer(app);
var io = new Server(server, {
  cors: { origin: config.CORS_ORIGIN },
  pingInterval: 1e4,
  pingTimeout: 2e4
});
var rooms = new RoomManager(io);
app.get("/", (_req, res) => res.redirect(`${config.SITE_URL}/oyun/`));
app.get("/q/:source", (req, res) => {
  res.redirect(`${config.SITE_URL}/oyun/?kaynak=${encodeURIComponent(req.params.source)}`);
});
app.get("/oda/:code", (req, res) => {
  res.redirect(`${config.SITE_URL}/oyun/?oda=${encodeURIComponent(req.params.code)}`);
});
app.get("/api/istatistik", (req, res) => {
  if (!config.STATS_KEY || req.query.anahtar !== config.STATS_KEY) return res.status(404).end();
  res.json(rooms.getStats());
});
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.count() }));
io.on("connection", (socket) => {
  socket.emit("catalog", games.getCatalog());
  const allow = createLimiter(30, 1e3);
  const on = (event, fn) => {
    socket.on(event, (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {
      };
      if (!allow()) return reply({ ok: false, error: "Biraz yava\u015F, \xE7ok h\u0131zl\u0131 bas\u0131yorsun \u{1F642}" });
      try {
        reply(fn(payload && typeof payload === "object" ? payload : {}) || { ok: true });
      } catch (err) {
        if (!err.userMessage) console.error(`[${event}]`, err);
        reply({ ok: false, error: err.userMessage || "Beklenmeyen bir hata oldu, tekrar dene." });
      }
    });
  };
  on("room:create", (p) => rooms.create(socket, p));
  on("room:join", (p) => rooms.join(socket, p));
  on("room:resume", (p) => rooms.resume(socket, p));
  on("room:leave", () => rooms.leave(socket));
  on("game:select", (p) => rooms.selectGame(socket, p.gameId));
  on("game:exit", () => rooms.exitGame(socket));
  on("game:action", (p) => rooms.gameAction(socket, p.action, p.payload));
  socket.on("disconnect", () => rooms.handleDisconnect(socket));
});
server.listen(config.PORT, () => {
  console.log(`NFC D\xFCnyas\u0131 \xE7al\u0131\u015F\u0131yor:  http://localhost:${config.PORT}   (oyun: /oyun/)`);
  console.log(`\xD6rnek i\u015Fletme QR linki: http://localhost:${config.PORT}/q/ornek-kafe`);
});
