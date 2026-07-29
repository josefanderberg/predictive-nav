/**
 * Site catalog for the predictive navigation bar.
 *
 * Each entry:
 *   name     – the word people actually type ("blocket", "svtplay")
 *   url      – default destination
 *   weight   – 1..100, how likely this user is to type it (higher = more likely)
 *   regional – optional overrides keyed by language prefix (navigator.language)
 *
 * Tuned for a Swedish user: Swedish everyday sites carry high weights.
 * The predictor also merges the user's own top sites (chrome.topSites) on top
 * of this list, which is what really makes predictions accurate.
 *
 * This is plain data — add, remove or re-weight entries freely.
 */
export const SEED_SITES = [
  // --- search, mail & productivity ---------------------------------------
  { name: "google", url: "https://www.google.com", weight: 100, category: "productivity" },
  { name: "gmail", url: "https://mail.google.com", weight: 88, category: "productivity" },
  { name: "maps", url: "https://maps.google.com", weight: 70, category: "productivity" },
  { name: "translate", url: "https://translate.google.com", weight: 55, category: "productivity" },
  { name: "drive", url: "https://drive.google.com", weight: 58, category: "productivity" },
  { name: "calendar", url: "https://calendar.google.com", weight: 52, category: "productivity" },
  { name: "outlook", url: "https://outlook.live.com", weight: 66, category: "productivity" },
  { name: "hotmail", url: "https://outlook.live.com", weight: 40, category: "productivity" },
  { name: "office", url: "https://www.office.com", weight: 50, category: "productivity" },
  { name: "teams", url: "https://teams.microsoft.com", weight: 54, category: "productivity" },
  { name: "onedrive", url: "https://onedrive.live.com", weight: 40, category: "productivity" },
  { name: "dropbox", url: "https://www.dropbox.com", weight: 38, category: "productivity" },
  { name: "notion", url: "https://www.notion.so", weight: 44, category: "productivity" },
  { name: "slack", url: "https://slack.com", weight: 46, category: "productivity" },
  { name: "zoom", url: "https://zoom.us", weight: 44, category: "productivity" },
  { name: "figma", url: "https://www.figma.com", weight: 42, category: "productivity" },
  { name: "canva", url: "https://www.canva.com", weight: 42, category: "productivity" },
  { name: "wikipedia", url: "https://sv.wikipedia.org", weight: 72, category: "productivity" },
  { name: "docs", url: "https://docs.google.com", weight: 52, category: "productivity" },
  { name: "photos", url: "https://photos.google.com", weight: 44, category: "productivity" },
  { name: "icloud", url: "https://www.icloud.com", weight: 52, category: "productivity" },
  { name: "apple", url: "https://www.apple.com/se/", weight: 60, category: "productivity" },
  { name: "microsoft", url: "https://www.microsoft.com", weight: 50, category: "productivity" },
  { name: "samsung", url: "https://www.samsung.com/se/", weight: 44, category: "shopping" },
  { name: "duolingo", url: "https://www.duolingo.com", weight: 46, category: "productivity" },
  { name: "trello", url: "https://trello.com", weight: 33, category: "productivity" },

  // --- social & messaging -------------------------------------------------
  { name: "facebook", url: "https://www.facebook.com", weight: 85, category: "social" },
  { name: "instagram", url: "https://www.instagram.com", weight: 84, category: "social" },
  { name: "tiktok", url: "https://www.tiktok.com", weight: 76, category: "social" },
  { name: "snapchat", url: "https://web.snapchat.com", weight: 62, category: "social" },
  { name: "whatsapp", url: "https://web.whatsapp.com", weight: 64, category: "social" },
  { name: "messenger", url: "https://www.messenger.com", weight: 58, category: "social" },
  { name: "discord", url: "https://discord.com", weight: 60, category: "social" },
  { name: "telegram", url: "https://web.telegram.org", weight: 48, category: "social" },
  { name: "reddit", url: "https://www.reddit.com", weight: 74, category: "social" },
  { name: "x", url: "https://x.com", weight: 66, category: "social" },
  { name: "twitter", url: "https://x.com", weight: 66, category: "social" },
  { name: "pinterest", url: "https://www.pinterest.com", weight: 50, category: "social" },
  { name: "linkedin", url: "https://www.linkedin.com", weight: 68, category: "social" },
  { name: "threads", url: "https://www.threads.com", weight: 40, category: "social" },

  // --- streaming & entertainment -----------------------------------------
  { name: "youtube", url: "https://www.youtube.com", weight: 95, category: "streaming" },
  { name: "netflix", url: "https://www.netflix.com", weight: 80, category: "streaming" },
  { name: "spotify", url: "https://open.spotify.com", weight: 78, category: "streaming" },
  { name: "svtplay", url: "https://www.svtplay.se", weight: 76, category: "streaming" },
  { name: "tv4play", url: "https://www.tv4play.se", weight: 62, category: "streaming" },
  { name: "viaplay", url: "https://viaplay.se", weight: 60, category: "streaming" },
  { name: "disneyplus", url: "https://www.disneyplus.com", weight: 58, category: "streaming" },
  { name: "max", url: "https://www.max.com", weight: 56, category: "streaming" },
  { name: "primevideo", url: "https://www.primevideo.com", weight: 52, category: "streaming" },
  { name: "twitch", url: "https://www.twitch.tv", weight: 58, category: "streaming" },
  { name: "soundcloud", url: "https://soundcloud.com", weight: 36, category: "streaming" },
  { name: "imdb", url: "https://www.imdb.com", weight: 48, category: "streaming" },

  // --- news ---------------------------------------------------------------
  { name: "aftonbladet", url: "https://www.aftonbladet.se", weight: 82, category: "news" },
  { name: "expressen", url: "https://www.expressen.se", weight: 74, category: "news" },
  { name: "dn", url: "https://www.dn.se", weight: 70, category: "news" },
  { name: "svd", url: "https://www.svd.se", weight: 62, category: "news" },
  { name: "gp", url: "https://www.gp.se", weight: 50, category: "news" },
  { name: "svt", url: "https://www.svt.se", weight: 72, category: "news" },
  { name: "tv4", url: "https://www.tv4.se", weight: 54, category: "news" },
  { name: "omni", url: "https://omni.se", weight: 52, category: "news" },
  { name: "di", url: "https://www.di.se", weight: 50, category: "news" },
  { name: "bbc", url: "https://www.bbc.com", weight: 52, category: "news" },
  { name: "cnn", url: "https://www.cnn.com", weight: 44, category: "news" },
  { name: "nytimes", url: "https://www.nytimes.com", weight: 42, category: "news" },
  { name: "guardian", url: "https://www.theguardian.com", weight: 40, category: "news" },
  { name: "reuters", url: "https://www.reuters.com", weight: 36, category: "news" },

  // --- Swedish classifieds & marketplaces ---------------------------------
  { name: "blocket", url: "https://www.blocket.se", weight: 84, category: "marketplace" },
  { name: "tradera", url: "https://www.tradera.com", weight: 70, category: "marketplace" },
  { name: "sellpy", url: "https://www.sellpy.se", weight: 48, category: "marketplace" },
  { name: "hemnet", url: "https://www.hemnet.se", weight: 74, category: "marketplace" },
  { name: "booli", url: "https://www.booli.se", weight: 46, category: "marketplace" },

  // --- Swedish shopping & groceries ---------------------------------------
  { name: "ica", url: "https://www.ica.se", weight: 72, category: "grocery" },
  { name: "coop", url: "https://www.coop.se", weight: 58, category: "grocery" },
  { name: "willys", url: "https://www.willys.se", weight: 60, category: "grocery" },
  { name: "lidl", url: "https://www.lidl.se", weight: 58, category: "grocery" },
  { name: "hemkop", url: "https://www.hemkop.se", weight: 50, category: "grocery" },
  { name: "citygross", url: "https://www.citygross.se", weight: 44, category: "grocery" },
  { name: "mathem", url: "https://www.mathem.se", weight: 48, category: "grocery" },
  { name: "foodora", url: "https://www.foodora.se", weight: 56, category: "grocery" },
  { name: "prisjakt", url: "https://www.prisjakt.nu", weight: 62, category: "shopping-se" },
  { name: "elgiganten", url: "https://www.elgiganten.se", weight: 64, category: "shopping-se" },
  { name: "power", url: "https://www.power.se", weight: 58, category: "shopping-se" },
  { name: "netonnet", url: "https://www.netonnet.se", weight: 56, category: "shopping-se" },
  { name: "kjell", url: "https://www.kjell.com/se", weight: 52, category: "shopping-se" },
  { name: "mediamarkt", url: "https://www.mediamarkt.se", weight: 48, category: "shopping-se" },
  { name: "dustin", url: "https://www.dustinhome.se", weight: 40, category: "shopping-se" },
  { name: "webhallen", url: "https://www.webhallen.com", weight: 52, category: "shopping-se" },
  { name: "inet", url: "https://www.inet.se", weight: 50, category: "shopping-se" },
  { name: "komplett", url: "https://www.komplett.se", weight: 46, category: "shopping-se" },
  { name: "clasohlson", url: "https://www.clasohlson.com", weight: 52, category: "diy" },
  { name: "jula", url: "https://www.jula.se", weight: 54, category: "diy" },
  { name: "biltema", url: "https://www.biltema.se", weight: 54, category: "diy" },
  { name: "bauhaus", url: "https://www.bauhaus.se", weight: 48, category: "diy" },
  { name: "byggmax", url: "https://www.byggmax.se", weight: 46, category: "diy" },
  { name: "cdon", url: "https://cdon.se", weight: 44, category: "shopping-se" },
  { name: "apotea", url: "https://www.apotea.se", weight: 60, category: "health-beauty" },
  { name: "apoteket", url: "https://www.apoteket.se", weight: 56, category: "health-beauty" },
  { name: "lyko", url: "https://lyko.com", weight: 44, category: "health-beauty" },
  { name: "boozt", url: "https://www.boozt.com", weight: 44, category: "health-beauty" },
  { name: "systembolaget", url: "https://www.systembolaget.se", weight: 62, category: "shopping-se" },
  { name: "ikea", url: "https://www.ikea.com/se/sv/", weight: 70, category: "shopping-se" },
  { name: "hm", url: "https://www2.hm.com/sv_se/", weight: 58, category: "shopping-se" },
  { name: "ahlens", url: "https://www.ahlens.se", weight: 50, category: "shopping-se" },
  { name: "stadium", url: "https://www.stadium.se", weight: 52, category: "shopping-se" },
  { name: "xxl", url: "https://www.xxl.se", weight: 48, category: "shopping-se" },
  { name: "intersport", url: "https://www.intersport.se", weight: 42, category: "shopping-se" },
  { name: "lindex", url: "https://www.lindex.com", weight: 44, category: "shopping-se" },
  { name: "kappahl", url: "https://www.kappahl.com", weight: 42, category: "shopping-se" },
  { name: "ellos", url: "https://www.ellos.se", weight: 44, category: "shopping-se" },
  { name: "nelly", url: "https://nelly.com", weight: 38, category: "shopping-se" },
  { name: "rusta", url: "https://www.rusta.com", weight: 46, category: "shopping-se" },
  { name: "mio", url: "https://www.mio.se", weight: 44, category: "shopping-se" },

  // --- telecom & utilities --------------------------------------------------
  { name: "telia", url: "https://www.telia.se", weight: 58, category: "telecom" },
  { name: "tele2", url: "https://www.tele2.se", weight: 50, category: "telecom" },
  { name: "tre", url: "https://www.tre.se", weight: 46, category: "telecom" },
  { name: "telenor", url: "https://www.telenor.se", weight: 46, category: "telecom" },
  { name: "comviq", url: "https://www.comviq.se", weight: 38, category: "telecom" },
  { name: "vattenfall", url: "https://www.vattenfall.se", weight: 46, category: "utilities" },
  { name: "eon", url: "https://www.eon.se", weight: 42, category: "utilities" },
  { name: "circlek", url: "https://www.circlek.se", weight: 38, category: "utilities" },
  { name: "okq8", url: "https://www.okq8.se", weight: 40, category: "utilities" },
  { name: "preem", url: "https://www.preem.se", weight: 36, category: "utilities" },

  // --- books & audio --------------------------------------------------------
  { name: "adlibris", url: "https://www.adlibris.com", weight: 48, category: "books" },
  { name: "bokus", url: "https://www.bokus.com", weight: 44, category: "books" },
  { name: "storytel", url: "https://www.storytel.com", weight: 46, category: "books" },
  { name: "sverigesradio", url: "https://sverigesradio.se", weight: 52, category: "news" },
  { name: "fotbollskanalen", url: "https://www.fotbollskanalen.se", weight: 44, category: "news" },
  { name: "smhi", url: "https://www.smhi.se", weight: 56, category: "public" },
  { name: "trafikverket", url: "https://www.trafikverket.se", weight: 44, category: "public" },
  { name: "ticketmaster", url: "https://www.ticketmaster.se", weight: 42, category: "streaming" },
  { name: "wolt", url: "https://wolt.com/sv", weight: 48, category: "grocery" },
  { name: "ubereats", url: "https://www.ubereats.com/se", weight: 34, category: "grocery" },
  { name: "bahnhof", url: "https://bahnhof.se", weight: 36, category: "telecom" },
  { name: "bookbeat", url: "https://www.bookbeat.com", weight: 30, category: "books" },
  { name: "sydsvenskan", url: "https://www.sydsvenskan.se", weight: 34, category: "news" },
  { name: "filmstaden", url: "https://www.filmstaden.se", weight: 44, category: "streaming" },
  { name: "discoveryplus", url: "https://www.discoveryplus.se", weight: 36, category: "streaming" },
  { name: "atg", url: "https://www.atg.se", weight: 42, category: "gaming" },

  // --- more Swedish retail ---------------------------------------------------
  { name: "elon", url: "https://www.elon.se", weight: 40, category: "shopping-se" },
  { name: "teknikmagasinet", url: "https://www.teknikmagasinet.se", weight: 32, category: "shopping-se" },
  { name: "jollyroom", url: "https://www.jollyroom.se", weight: 40, category: "shopping-se" },
  { name: "granngarden", url: "https://www.granngarden.se", weight: 36, category: "diy" },
  { name: "zooplus", url: "https://www.zooplus.se", weight: 38, category: "shopping" },

  // --- gyms, care & booking ---------------------------------------------------
  { name: "sats", url: "https://www.sats.se", weight: 45, category: "fitness" },
  { name: "nordicwellness", url: "https://nordicwellness.se", weight: 47, category: "fitness" },
  { name: "fitness24seven", url: "https://se.fitness24seven.com", weight: 40, category: "fitness" },
  { name: "actic", url: "https://www.actic.se", weight: 30, category: "fitness" },
  { name: "bokadirekt", url: "https://www.bokadirekt.se", weight: 46, category: "fitness" },
  { name: "apotekhjartat", url: "https://www.apotekhjartat.se", weight: 58, category: "health-beauty" },
  { name: "meds", url: "https://www.meds.se", weight: 33, category: "health-beauty" },
  { name: "doktor", url: "https://doktor.se", weight: 40, category: "health-beauty" },
  { name: "mindoktor", url: "https://www.mindoktor.se", weight: 36, category: "health-beauty" },

  // --- global shopping ----------------------------------------------------
  {
    name: "amazon",
    category: "shopping",
    url: "https://www.amazon.com",
    weight: 78,
    regional: {
      sv: "https://www.amazon.se",
      de: "https://www.amazon.de",
      fr: "https://www.amazon.fr",
      es: "https://www.amazon.es",
      it: "https://www.amazon.it",
      nl: "https://www.amazon.nl",
      pl: "https://www.amazon.pl",
      "en-GB": "https://www.amazon.co.uk",
    },
  },
  { name: "ebay", url: "https://www.ebay.com", weight: 50, category: "shopping" },
  { name: "aliexpress", url: "https://www.aliexpress.com", weight: 52, category: "shopping" },
  { name: "temu", url: "https://www.temu.com", weight: 50, category: "shopping" },
  { name: "etsy", url: "https://www.etsy.com", weight: 40, category: "shopping" },
  { name: "zalando", url: "https://www.zalando.se", weight: 58, category: "shopping" },
  { name: "asos", url: "https://www.asos.com", weight: 42, category: "shopping" },
  { name: "shein", url: "https://www.shein.com", weight: 46, category: "shopping" },
  { name: "nike", url: "https://www.nike.com", weight: 46, category: "shopping" },
  { name: "adidas", url: "https://www.adidas.se", weight: 44, category: "shopping" },
  { name: "zara", url: "https://www.zara.com", weight: 44, category: "shopping" },

  // --- banks, finance & insurance -----------------------------------------
  { name: "swedbank", url: "https://www.swedbank.se", weight: 76, category: "finance" },
  { name: "seb", url: "https://seb.se", weight: 68, category: "finance" },
  { name: "nordea", url: "https://www.nordea.se", weight: 68, category: "finance" },
  { name: "handelsbanken", url: "https://www.handelsbanken.se", weight: 62, category: "finance" },
  { name: "lansforsakringar", url: "https://www.lansforsakringar.se", weight: 56, category: "finance" },
  { name: "avanza", url: "https://www.avanza.se", weight: 66, category: "finance" },
  { name: "nordnet", url: "https://www.nordnet.se", weight: 56, category: "finance" },
  { name: "klarna", url: "https://www.klarna.com/se/", weight: 64, category: "finance" },
  { name: "folksam", url: "https://www.folksam.se", weight: 44, category: "finance" },
  { name: "trygghansa", url: "https://www.trygghansa.se", weight: 40, category: "finance" },
  { name: "paypal", url: "https://www.paypal.com", weight: 54, category: "finance" },
  { name: "revolut", url: "https://www.revolut.com", weight: 42, category: "finance" },
  { name: "wise", url: "https://wise.com", weight: 36, category: "finance" },

  // --- government, health & public services -------------------------------
  { name: "skatteverket", url: "https://www.skatteverket.se", weight: 66, category: "public" },
  { name: "forsakringskassan", url: "https://www.forsakringskassan.se", weight: 62, category: "public" },
  { name: "csn", url: "https://www.csn.se", weight: 54, category: "public" },
  { name: "arbetsformedlingen", url: "https://arbetsformedlingen.se", weight: 50, category: "public" },
  { name: "bankid", url: "https://www.bankid.com", weight: 52, category: "public" },
  { name: "postnord", url: "https://www.postnord.se", weight: 58, category: "public" },
  { name: "transportstyrelsen", url: "https://www.transportstyrelsen.se", weight: 46, category: "public" },
  { name: "bolagsverket", url: "https://bolagsverket.se", weight: 36, category: "public" },
  { name: "kry", url: "https://www.kry.se", weight: 40, category: "public" },
  { name: "1177", url: "https://www.1177.se", weight: 62, category: "public" },
  { name: "vardguiden", url: "https://www.1177.se", weight: 34, category: "public" },
  { name: "kivra", url: "https://kivra.se", weight: 54, category: "public" },
  { name: "polisen", url: "https://polisen.se", weight: 44, category: "public" },
  { name: "migrationsverket", url: "https://www.migrationsverket.se", weight: 34, category: "public" },
  { name: "pensionsmyndigheten", url: "https://www.pensionsmyndigheten.se", weight: 34, category: "public" },

  // --- lookup & directories -----------------------------------------------
  { name: "hitta", url: "https://www.hitta.se", weight: 54, category: "directory" },
  { name: "eniro", url: "https://www.eniro.se", weight: 44, category: "directory" },
  { name: "ratsit", url: "https://www.ratsit.se", weight: 46, category: "directory" },
  { name: "allabolag", url: "https://www.allabolag.se", weight: 42, category: "directory" },

  // --- travel & transport --------------------------------------------------
  { name: "sj", url: "https://www.sj.se", weight: 64, category: "travel" },
  { name: "sl", url: "https://sl.se", weight: 62, category: "travel" },
  { name: "vasttrafik", url: "https://www.vasttrafik.se", weight: 52, category: "travel" },
  { name: "skanetrafiken", url: "https://www.skanetrafiken.se", weight: 48, category: "travel" },
  { name: "flixbus", url: "https://www.flixbus.se", weight: 40, category: "travel" },
  { name: "booking", url: "https://www.booking.com", weight: 60, category: "travel" },
  { name: "airbnb", url: "https://www.airbnb.se", weight: 54, category: "travel" },
  { name: "skyscanner", url: "https://www.skyscanner.se", weight: 50, category: "travel" },
  { name: "momondo", url: "https://www.momondo.se", weight: 44, category: "travel" },
  { name: "sas", url: "https://www.flysas.com", weight: 52, category: "travel" },
  { name: "norwegian", url: "https://www.norwegian.com", weight: 48, category: "travel" },
  { name: "ryanair", url: "https://www.ryanair.com", weight: 44, category: "travel" },
  { name: "uber", url: "https://www.uber.com", weight: 44, category: "travel" },
  { name: "bolt", url: "https://bolt.eu", weight: 38, category: "travel" },

  // --- developer & AI tools -------------------------------------------------
  { name: "github", url: "https://github.com", weight: 64, category: "dev" },
  { name: "gitlab", url: "https://gitlab.com", weight: 38, category: "dev" },
  { name: "stackoverflow", url: "https://stackoverflow.com", weight: 58, category: "dev" },
  { name: "chatgpt", url: "https://chatgpt.com", weight: 74, category: "dev" },
  { name: "claude", url: "https://claude.ai", weight: 74, category: "dev" },
  { name: "gemini", url: "https://gemini.google.com", weight: 56, category: "dev" },
  { name: "npm", url: "https://www.npmjs.com", weight: 34, category: "dev" },
  { name: "perplexity", url: "https://www.perplexity.ai", weight: 42, category: "dev" },
  { name: "vercel", url: "https://vercel.com", weight: 32, category: "dev" },

  // --- gaming ----------------------------------------------------------------
  { name: "steam", url: "https://store.steampowered.com", weight: 58, category: "gaming" },
  { name: "epicgames", url: "https://store.epicgames.com", weight: 42, category: "gaming" },
  { name: "roblox", url: "https://www.roblox.com", weight: 40, category: "gaming" },
  { name: "minecraft", url: "https://www.minecraft.net", weight: 40, category: "gaming" },
  { name: "playstation", url: "https://www.playstation.com", weight: 44, category: "gaming" },
  { name: "xbox", url: "https://www.xbox.com", weight: 42, category: "gaming" },
  { name: "nintendo", url: "https://www.nintendo.com", weight: 40, category: "gaming" },
  { name: "svenskaspel", url: "https://www.svenskaspel.se", weight: 46, category: "gaming" },
];

/**
 * Resolve the best URL for a site given the user's language (e.g. "sv-SE").
 * Tries the exact tag first ("en-GB"), then the primary subtag ("en").
 */
export function resolveRegionalUrl(site, language) {
  if (!site.regional || !language) return site.url;
  if (site.regional[language]) return site.regional[language];
  const primary = language.split("-")[0];
  return site.regional[primary] ?? site.url;
}
