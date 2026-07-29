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
  { name: "google", url: "https://www.google.com", weight: 100 },
  { name: "gmail", url: "https://mail.google.com", weight: 88 },
  { name: "maps", url: "https://maps.google.com", weight: 70 },
  { name: "translate", url: "https://translate.google.com", weight: 55 },
  { name: "drive", url: "https://drive.google.com", weight: 58 },
  { name: "calendar", url: "https://calendar.google.com", weight: 52 },
  { name: "outlook", url: "https://outlook.live.com", weight: 66 },
  { name: "hotmail", url: "https://outlook.live.com", weight: 40 },
  { name: "office", url: "https://www.office.com", weight: 50 },
  { name: "teams", url: "https://teams.microsoft.com", weight: 54 },
  { name: "onedrive", url: "https://onedrive.live.com", weight: 40 },
  { name: "dropbox", url: "https://www.dropbox.com", weight: 38 },
  { name: "notion", url: "https://www.notion.so", weight: 44 },
  { name: "slack", url: "https://slack.com", weight: 46 },
  { name: "zoom", url: "https://zoom.us", weight: 44 },
  { name: "figma", url: "https://www.figma.com", weight: 42 },
  { name: "canva", url: "https://www.canva.com", weight: 42 },
  { name: "wikipedia", url: "https://sv.wikipedia.org", weight: 72 },

  // --- social & messaging -------------------------------------------------
  { name: "facebook", url: "https://www.facebook.com", weight: 85 },
  { name: "instagram", url: "https://www.instagram.com", weight: 84 },
  { name: "tiktok", url: "https://www.tiktok.com", weight: 76 },
  { name: "snapchat", url: "https://web.snapchat.com", weight: 62 },
  { name: "whatsapp", url: "https://web.whatsapp.com", weight: 64 },
  { name: "messenger", url: "https://www.messenger.com", weight: 58 },
  { name: "discord", url: "https://discord.com", weight: 60 },
  { name: "telegram", url: "https://web.telegram.org", weight: 48 },
  { name: "reddit", url: "https://www.reddit.com", weight: 74 },
  { name: "x", url: "https://x.com", weight: 66 },
  { name: "twitter", url: "https://x.com", weight: 66 },
  { name: "pinterest", url: "https://www.pinterest.com", weight: 50 },
  { name: "linkedin", url: "https://www.linkedin.com", weight: 68 },
  { name: "threads", url: "https://www.threads.com", weight: 40 },

  // --- streaming & entertainment -----------------------------------------
  { name: "youtube", url: "https://www.youtube.com", weight: 95 },
  { name: "netflix", url: "https://www.netflix.com", weight: 80 },
  { name: "spotify", url: "https://open.spotify.com", weight: 78 },
  { name: "svtplay", url: "https://www.svtplay.se", weight: 76 },
  { name: "tv4play", url: "https://www.tv4play.se", weight: 62 },
  { name: "viaplay", url: "https://viaplay.se", weight: 60 },
  { name: "disneyplus", url: "https://www.disneyplus.com", weight: 58 },
  { name: "max", url: "https://www.max.com", weight: 56 },
  { name: "primevideo", url: "https://www.primevideo.com", weight: 52 },
  { name: "twitch", url: "https://www.twitch.tv", weight: 58 },
  { name: "soundcloud", url: "https://soundcloud.com", weight: 36 },
  { name: "imdb", url: "https://www.imdb.com", weight: 48 },

  // --- news ---------------------------------------------------------------
  { name: "aftonbladet", url: "https://www.aftonbladet.se", weight: 82 },
  { name: "expressen", url: "https://www.expressen.se", weight: 74 },
  { name: "dn", url: "https://www.dn.se", weight: 70 },
  { name: "svd", url: "https://www.svd.se", weight: 62 },
  { name: "gp", url: "https://www.gp.se", weight: 50 },
  { name: "svt", url: "https://www.svt.se", weight: 72 },
  { name: "tv4", url: "https://www.tv4.se", weight: 54 },
  { name: "omni", url: "https://omni.se", weight: 52 },
  { name: "di", url: "https://www.di.se", weight: 50 },
  { name: "bbc", url: "https://www.bbc.com", weight: 52 },
  { name: "cnn", url: "https://www.cnn.com", weight: 44 },
  { name: "nytimes", url: "https://www.nytimes.com", weight: 42 },
  { name: "guardian", url: "https://www.theguardian.com", weight: 40 },
  { name: "reuters", url: "https://www.reuters.com", weight: 36 },

  // --- Swedish classifieds & marketplaces ---------------------------------
  { name: "blocket", url: "https://www.blocket.se", weight: 84 },
  { name: "tradera", url: "https://www.tradera.com", weight: 70 },
  { name: "sellpy", url: "https://www.sellpy.se", weight: 48 },
  { name: "hemnet", url: "https://www.hemnet.se", weight: 74 },
  { name: "booli", url: "https://www.booli.se", weight: 46 },

  // --- Swedish shopping & groceries ---------------------------------------
  { name: "ica", url: "https://www.ica.se", weight: 72 },
  { name: "coop", url: "https://www.coop.se", weight: 58 },
  { name: "willys", url: "https://www.willys.se", weight: 60 },
  { name: "lidl", url: "https://www.lidl.se", weight: 58 },
  { name: "hemkop", url: "https://www.hemkop.se", weight: 50 },
  { name: "citygross", url: "https://www.citygross.se", weight: 44 },
  { name: "mathem", url: "https://www.mathem.se", weight: 48 },
  { name: "foodora", url: "https://www.foodora.se", weight: 56 },
  { name: "prisjakt", url: "https://www.prisjakt.nu", weight: 62 },
  { name: "elgiganten", url: "https://www.elgiganten.se", weight: 64 },
  { name: "netonnet", url: "https://www.netonnet.se", weight: 56 },
  { name: "webhallen", url: "https://www.webhallen.com", weight: 52 },
  { name: "inet", url: "https://www.inet.se", weight: 50 },
  { name: "komplett", url: "https://www.komplett.se", weight: 46 },
  { name: "clasohlson", url: "https://www.clasohlson.com", weight: 52 },
  { name: "jula", url: "https://www.jula.se", weight: 54 },
  { name: "biltema", url: "https://www.biltema.se", weight: 54 },
  { name: "bauhaus", url: "https://www.bauhaus.se", weight: 48 },
  { name: "byggmax", url: "https://www.byggmax.se", weight: 46 },
  { name: "cdon", url: "https://cdon.se", weight: 44 },
  { name: "apotea", url: "https://www.apotea.se", weight: 60 },
  { name: "apoteket", url: "https://www.apoteket.se", weight: 56 },
  { name: "lyko", url: "https://lyko.com", weight: 44 },
  { name: "boozt", url: "https://www.boozt.com", weight: 44 },
  { name: "systembolaget", url: "https://www.systembolaget.se", weight: 62 },
  { name: "ikea", url: "https://www.ikea.com/se/sv/", weight: 70 },
  { name: "hm", url: "https://www2.hm.com/sv_se/", weight: 58 },

  // --- global shopping ----------------------------------------------------
  {
    name: "amazon",
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
  { name: "ebay", url: "https://www.ebay.com", weight: 50 },
  { name: "aliexpress", url: "https://www.aliexpress.com", weight: 52 },
  { name: "temu", url: "https://www.temu.com", weight: 50 },
  { name: "etsy", url: "https://www.etsy.com", weight: 40 },
  { name: "zalando", url: "https://www.zalando.se", weight: 58 },
  { name: "asos", url: "https://www.asos.com", weight: 42 },
  { name: "shein", url: "https://www.shein.com", weight: 46 },
  { name: "nike", url: "https://www.nike.com", weight: 46 },
  { name: "adidas", url: "https://www.adidas.se", weight: 44 },
  { name: "zara", url: "https://www.zara.com", weight: 44 },

  // --- banks, finance & insurance -----------------------------------------
  { name: "swedbank", url: "https://www.swedbank.se", weight: 76 },
  { name: "seb", url: "https://seb.se", weight: 68 },
  { name: "nordea", url: "https://www.nordea.se", weight: 68 },
  { name: "handelsbanken", url: "https://www.handelsbanken.se", weight: 62 },
  { name: "lansforsakringar", url: "https://www.lansforsakringar.se", weight: 56 },
  { name: "avanza", url: "https://www.avanza.se", weight: 66 },
  { name: "nordnet", url: "https://www.nordnet.se", weight: 56 },
  { name: "klarna", url: "https://www.klarna.com/se/", weight: 64 },
  { name: "folksam", url: "https://www.folksam.se", weight: 44 },
  { name: "trygghansa", url: "https://www.trygghansa.se", weight: 40 },

  // --- government, health & public services -------------------------------
  { name: "skatteverket", url: "https://www.skatteverket.se", weight: 66 },
  { name: "forsakringskassan", url: "https://www.forsakringskassan.se", weight: 62 },
  { name: "csn", url: "https://www.csn.se", weight: 54 },
  { name: "arbetsformedlingen", url: "https://arbetsformedlingen.se", weight: 50 },
  { name: "bankid", url: "https://www.bankid.com", weight: 52 },
  { name: "postnord", url: "https://www.postnord.se", weight: 58 },
  { name: "transportstyrelsen", url: "https://www.transportstyrelsen.se", weight: 46 },
  { name: "bolagsverket", url: "https://bolagsverket.se", weight: 36 },
  { name: "kry", url: "https://www.kry.se", weight: 40 },
  { name: "1177", url: "https://www.1177.se", weight: 62 },
  { name: "vardguiden", url: "https://www.1177.se", weight: 34 },
  { name: "kivra", url: "https://kivra.se", weight: 54 },
  { name: "polisen", url: "https://polisen.se", weight: 44 },
  { name: "migrationsverket", url: "https://www.migrationsverket.se", weight: 34 },
  { name: "pensionsmyndigheten", url: "https://www.pensionsmyndigheten.se", weight: 34 },

  // --- lookup & directories -----------------------------------------------
  { name: "hitta", url: "https://www.hitta.se", weight: 54 },
  { name: "eniro", url: "https://www.eniro.se", weight: 44 },
  { name: "ratsit", url: "https://www.ratsit.se", weight: 46 },
  { name: "allabolag", url: "https://www.allabolag.se", weight: 42 },

  // --- travel & transport --------------------------------------------------
  { name: "sj", url: "https://www.sj.se", weight: 64 },
  { name: "sl", url: "https://sl.se", weight: 62 },
  { name: "vasttrafik", url: "https://www.vasttrafik.se", weight: 52 },
  { name: "skanetrafiken", url: "https://www.skanetrafiken.se", weight: 48 },
  { name: "flixbus", url: "https://www.flixbus.se", weight: 40 },
  { name: "booking", url: "https://www.booking.com", weight: 60 },
  { name: "airbnb", url: "https://www.airbnb.se", weight: 54 },
  { name: "skyscanner", url: "https://www.skyscanner.se", weight: 50 },
  { name: "momondo", url: "https://www.momondo.se", weight: 44 },
  { name: "sas", url: "https://www.flysas.com", weight: 52 },
  { name: "norwegian", url: "https://www.norwegian.com", weight: 48 },
  { name: "ryanair", url: "https://www.ryanair.com", weight: 44 },
  { name: "uber", url: "https://www.uber.com", weight: 44 },
  { name: "bolt", url: "https://bolt.eu", weight: 38 },

  // --- developer & AI tools -------------------------------------------------
  { name: "github", url: "https://github.com", weight: 64 },
  { name: "gitlab", url: "https://gitlab.com", weight: 38 },
  { name: "stackoverflow", url: "https://stackoverflow.com", weight: 58 },
  { name: "chatgpt", url: "https://chatgpt.com", weight: 74 },
  { name: "claude", url: "https://claude.ai", weight: 74 },
  { name: "gemini", url: "https://gemini.google.com", weight: 56 },
  { name: "npm", url: "https://www.npmjs.com", weight: 34 },
  { name: "vercel", url: "https://vercel.com", weight: 32 },

  // --- gaming ----------------------------------------------------------------
  { name: "steam", url: "https://store.steampowered.com", weight: 58 },
  { name: "epicgames", url: "https://store.epicgames.com", weight: 42 },
  { name: "roblox", url: "https://www.roblox.com", weight: 40 },
  { name: "minecraft", url: "https://www.minecraft.net", weight: 40 },
  { name: "playstation", url: "https://www.playstation.com", weight: 44 },
  { name: "xbox", url: "https://www.xbox.com", weight: 42 },
  { name: "nintendo", url: "https://www.nintendo.com", weight: 40 },
  { name: "svenskaspel", url: "https://www.svenskaspel.se", weight: 46 },
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
