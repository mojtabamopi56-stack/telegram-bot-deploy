import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN = "8129620169:AAFVQHtaLUUBEayBm9msUS5hLQ2ng15MjUk";
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_USERNAME = "mojeao";
const MANDATORY_CHANNEL = "lnterFreedom";
const MANDATORY_CHANNEL_LINK = "https://t.me/lnterFreedom";

// ─── Premium Emoji IDs ───────────────────────────────────────────────────────
const ID = {
  btn_subscribe: "5206607081334906820",
  btn_invite:    "5424818078833715060",
  btn_profile:   "5190806721286657692",
  btn_support:   "5413704112220949842",
  btn_rules:     "5271604874419647061",
  btn_guide:     "5447644880824181073",
  check:         "5472363448404809929",
  cross:         "5436040291507247633",
  party:         "6037618875846102911",
  orange:        "5375296873982604963",
  money:         "5231200819986047254",
  chart:         "5395444784611480792",
  link:          "5461117441612462242",
  up:            "5391112412445288650",
  bulb:          "5334544901428229844",
  plus:          "5264713049637409446",
  trophy:        "5453957997418004470",
  person:        "5246989476248429334",
  hero:          "5440660757194744323",
  gift:          "5240241223632954241",
  info:          "5472308992514464048",
  calendar:      "5400250414929041085",
  red:           "5994495364084796671",
  phone:         "5436113877181941026",
  bell:          "5465665476971471368",
  key:           "5472027899789843495",
  gear:          "6300757202651055745",
  broadcast:     "5422439311196834318",
  user_icon:     "4981404027402061416",
  search:        "5213383002129702114",
  coin:          "5427009714745517609",
  tool:          "6032751234790726550",
  clipboard:     "5255883984151276991",
  note:          "5785193735075663481",
  lock:          "5785219784052314091",
  antenna:       "5924664865208671041",
  trash:         "5785033300867288899",
  moon:          "5215392879320505675",
};

// Premium emoji tag for message text
function e(id, fallback = "•") {
  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
}

// ─── Database ────────────────────────────────────────────────────────────────
const DB_PATH = existsSync("/data") ? "/data/db.json" : join(__dirname, "db.json");

function loadDB() {
  if (!existsSync(DB_PATH)) {
    return {
      users: {},
      settings: {
        subscriptionCost: 2,
        subscriptionName: "اشتراک 1 گیگی 24 ساعته",
        configs: [],
        welcomeText: null,
        maintenanceMode: false,
      },
      adminState: {},
      banned: {},
    };
  }
  try { return JSON.parse(readFileSync(DB_PATH, "utf8")); }
  catch { return loadDB(); }
}

function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(db, userId, name, username) {
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId, name: name || "بدون نام", username: username || null,
      points: 0, referrals: 0, referredBy: null,
      joinDate: new Date().toISOString().slice(0, 10), subscriptions: [],
    };
    saveDB(db);
  } else {
    let changed = false;
    if (name && db.users[userId].name !== name) { db.users[userId].name = name; changed = true; }
    if (username !== undefined && db.users[userId].username !== username) { db.users[userId].username = username; changed = true; }
    if (changed) saveDB(db);
  }
  return db.users[userId];
}

// ─── Telegram API ─────────────────────────────────────────────────────────────
async function api(method, params = {}) {
  try {
    const res = await fetch(`${BASE_URL}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  } catch (err) {
    console.error(`[${method}]`, err.message);
    return { ok: false };
  }
}

const sendMsg = (chatId, text, extra = {}) =>
  api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });

const editMsg = (chatId, msgId, text, extra = {}) =>
  api("editMessageText", { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", ...extra });

const answerCb = (id, text = "", alert = false) =>
  api("answerCallbackQuery", { callback_query_id: id, text, show_alert: alert });

// copyMessage preserves ALL entities including premium custom emoji
const copyMsg = (fromChatId, msgId, toChatId) =>
  api("copyMessage", { chat_id: toChatId, from_chat_id: fromChatId, message_id: msgId });

async function isMember(userId, channel) {
  const r = await api("getChatMember", { chat_id: `@${channel}`, user_id: userId });
  if (!r.ok) return false;
  return ["member", "administrator", "creator"].includes(r.result?.status);
}

let BOT_USERNAME = "";
async function getBotInfo() {
  const r = await api("getMe");
  if (r.ok) { BOT_USERNAME = r.result.username; console.log("Bot:", BOT_USERNAME); }
}

// ─── Keyboards ────────────────────────────────────────────────────────────────
const mainKeyboard = () => ({
  keyboard: [
    [{ text: "دریافت اشتراک", icon_custom_emoji_id: ID.btn_subscribe, style: "primary" }],
    [
      { text: "دعوت دوستان", icon_custom_emoji_id: ID.btn_invite, style: "primary" },
      { text: "پروفایل",     icon_custom_emoji_id: ID.btn_profile, style: "primary" },
    ],
    [
      { text: "پشتیبانی", icon_custom_emoji_id: ID.btn_support, style: "primary" },
      { text: "قوانین",   icon_custom_emoji_id: ID.btn_rules,   style: "primary" },
    ],
    [{ text: "راهنما", icon_custom_emoji_id: ID.btn_guide, style: "primary" }],
  ],
  resize_keyboard: true,
  persistent: true,
});

// Inline button with premium emoji icon
const ib = (text, data, eid) =>
  eid ? { text, callback_data: data, icon_custom_emoji_id: eid } : { text, callback_data: data };

const ibUrl = (text, url, eid) =>
  eid ? { text, url, icon_custom_emoji_id: eid } : { text, url };

const joinKeyboard = () => ({
  inline_keyboard: [
    [ibUrl("عضویت در کانال", MANDATORY_CHANNEL_LINK, ID.antenna)],
    [ib("تایید عضویت", "verify_membership", ID.check)],
  ],
});

// ─── Admin Panel Keyboard ─────────────────────────────────────────────────────
const adminKeyboard = () => ({
  inline_keyboard: [
    [ib("وضعیت ربات",      "a_status",    ID.clipboard), ib("آمار کامل",        "a_stats",     ID.chart)],
    [ib("آخرین کاربران",   "a_recent",    ID.person),    ib("برترین دعوت‌ها",   "a_top_ref",   ID.trophy)],
    [ib("بیشترین سرویس",   "a_top_sub",   ID.hero),      ib("ثروتمندترین‌ها",   "a_top_rich",  ID.coin)],
    [ib("پیام به کاربر",   "a_msg_user",  ID.note),      ib("پیام همگانی",      "a_broadcast", ID.broadcast)],
    [ib("جستجوی کاربر",    "a_search",    ID.search),    ib("اطلاعات کاربر",    "a_userinfo",  ID.user_icon)],
    [ib("رفع مسدودی",      "a_unban",     ID.check),     ib("مسدود کردن",       "a_ban",       ID.cross)],
    [ib("افزودن سکه",      "a_add_pts",   ID.plus),      ib("تنظیم سکه",        "a_set_pts",   ID.money)],
    [ib("ری‌ست سکه",       "a_reset_pts", ID.moon),      ib("سرویس دستی",       "a_manual_sub",ID.gift)],
    [ib("متن خوش‌آمد",     "a_welcome",   ID.bell),      ib("حذف کاربر",        "a_del_user",  ID.trash)],
    [ib("کانال‌های اجباری","a_channels",  ID.antenna),   ib("تنظیمات سکه‌ها",  "a_coin_cfg",  ID.gear)],
    [ib("همه کاربران",     "a_allusers",  ID.clipboard), ib("آمار ماهانه",      "a_monthly",   ID.calendar)],
    [ib("مدیریت کانفیگ",   "a_configs",   ID.key),       ib("گزارش کامل",       "a_report",    ID.chart)],
    [ib("افزودن کانفیگ",   "a_addconfig", ID.plus)],
    [ib("حالت تعمیر",      "a_maintenance",ID.tool)],
    [ib("بازگشت",          "a_back",      ID.info)],
  ],
});

const backRow = () => ({ inline_keyboard: [[ib("بازگشت به پنل", "a_back", ID.info)]] });

// ─── Message Templates ────────────────────────────────────────────────────────
const welcomeText = (custom) => custom || `${e(ID.bell)} <b>به ربات کانفیگ رایگان خوش آمدید</b>

${e(ID.bell)} با این ربات می‌تونی خیلی راحت:
${e(ID.check)} کانفیگ‌های پرسرعت و باکیفیت دریافت کنی
${e(ID.check)} با فعالیت و دعوت دوستان، امتیاز جمع کنی
${e(ID.check)} با امتیازهای کانفیگ رایگان بگیری
${e(ID.check)} همیشه از وضعیت و سلامت سرویس‌ها با خبر باشی

${e(ID.red)} یکی از گزینه‌های زیر رو انتخاب کن:
@${BOT_USERNAME}`;

const channelText = () =>
  `${e(ID.phone)} <b>برای استفاده از ربات ابتدا باید در کانال زیر عضو شوید</b>\n\n${e(ID.check)} پس از عضویت روی دکمه «تایید عضویت» کلیک کنید.`;

const rulesText = () =>
  `${e(ID.clipboard)} <b>قوانین و شرایط استفاده</b>

${e(ID.lock)} کاربر گرامی،
برای حفظ کیفیت سرویس‌ها و ایجاد تجربه‌ای عادلانه رعایت موارد زیر الزامی است:

${e(ID.lock)} <b>حریم خصوصی</b>
• اطلاعات شما کاملاً محرمانه بوده و فقط جهت مدیریت سرویس استفاده می‌شود.

${e(ID.trophy)} <b>سیستم دعوت (رفرال)</b>
• دریافت اشتراک رایگان از طریق دعوت دوستان با لینک اختصاصی شما امکان‌پذیر است.
• هرگونه تقلب (اکانت فیک، ربات یا دور زدن سیستم) منجر به مسدودسازی دائمی حساب خواهد شد.

${e(ID.cross)} <b>قوانین استفاده</b>
• اشتراک دریافتی صرفاً برای استفاده شخصی بوده و به اشتراک‌گذاری آن ممنوع است.
• استفاده از سرویس برای فعالیت‌های مخرب یا حملات DDoS اکیداً ممنوع می‌باشد.

${e(ID.info)} <b>مسئولیت</b>
• تمامی مسئولیت نحوه استفاده از سرویس بر عهده کاربر خواهد بود.`;

const guideText = (db) => {
  const cost = db.settings.subscriptionCost;
  const name = db.settings.subscriptionName;
  return `${e(ID.bulb)} <b>راهنمای دریافت اشتراک رایگان</b>

برای دریافت اشتراک پرسرعت، مراحل زیر را دنبال کنید:

1️⃣ <b>مرحله ۱: دریافت لینک اختصاصی</b>
وارد بخش «دعوت دوستان» شوید و لینک اختصاصی خود را دریافت کنید.

2️⃣ <b>مرحله ۲: دعوت از دوستان</b>
لینک را برای دوستان خود ارسال کنید. با عضویت هر کاربر، امتیاز به حساب شما افزوده می‌شود.

3️⃣ <b>مرحله ۳: دریافت اشتراک</b>
پس از رسیدن امتیاز به حد نصاب، از بخش «دریافت اشتراک»، کانفیگ خود را رایگان دریافت کنید.

${e(ID.bulb)} <b>نکته مهم</b>
سیستم دارای آنتی‌تقلب بوده و استفاده از اکانت‌های فیک منجر به حذف امتیازات خواهد شد.

${e(ID.tool)} <b>پشتیبانی</b>
در صورت بروز مشکل، از بخش «پشتیبانی» اقدام کنید.

${e(ID.coin)} هزینه اشتراک فعلی: <b>${cost} امتیاز</b> — ${name}`;
};

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function handleStart(msg, db) {
  const { id: userId, first_name, username } = msg.from;
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const user = getUser(db, userId, first_name, username || null);

  // Referral
  const ref = text.match(/\/start ref_(\d+)/);
  if (ref && !user.referredBy) {
    const rid = parseInt(ref[1]);
    if (rid !== userId && db.users[rid]) {
      user.referredBy = rid;
      const referrer = db.users[rid];
      const prev = referrer.points;
      referrer.points += 1;
      referrer.referrals += 1;
      saveDB(db);
      const who = username ? `@${username}` : first_name;
      await sendMsg(rid,
        `${e(ID.party)} <b>زیرمجموعه جدید!</b>\n\n${e(ID.orange)} به ربات دعوت شد <b>${who}</b>\n\n${e(ID.money)} موجودی شما:\nقبل: ${prev} امتیاز\nبعد: ${referrer.points} امتیاز (+1)\n\n${e(ID.chart)} تعداد کل زیرمجموعه‌های شما: ${referrer.referrals}`
      );
    }
  }

  // Maintenance
  if (db.settings.maintenanceMode) {
    await sendMsg(chatId, `${e(ID.tool)} ربات در حال تعمیر است. لطفاً بعداً مراجعه کنید.`);
    return;
  }

  // Mandatory channel
  const member = await isMember(userId, MANDATORY_CHANNEL);
  if (!member) {
    await sendMsg(chatId, channelText(), { reply_markup: joinKeyboard() });
    return;
  }

  await sendMsg(chatId, welcomeText(db.settings.welcomeText), { reply_markup: mainKeyboard() });
}

async function handleSubscribe(chatId, userId, db) {
  if (db.settings.maintenanceMode) {
    await sendMsg(chatId, `${e(ID.tool)} ربات در حال تعمیر است.`);
    return;
  }
  const member = await isMember(userId, MANDATORY_CHANNEL);
  if (!member) { await sendMsg(chatId, channelText(), { reply_markup: joinKeyboard() }); return; }

  const user = db.users[userId];
  const cost = db.settings.subscriptionCost;
  const current = user?.points || 0;

  if (current < cost) {
    await sendMsg(chatId,
      `${e(ID.cross)} <b>امتیاز کافی نیست!</b>\n\n${e(ID.hero)} هزینه اشتراک: ${cost} امتیاز\n${e(ID.person)} امتیاز فعلی شما: ${current}\n${e(ID.bulb)} امتیاز کمبود: ${cost - current}\n\n${e(ID.bulb)} با دعوت دوستان می‌توانید امتیاز کسب کنید!`,
      { reply_markup: { inline_keyboard: [[ib("دعوت دوستان", "show_invite", ID.btn_invite)]] } }
    );
    return;
  }

  const configs = db.settings.configs || [];
  if (!configs.length) {
    await sendMsg(chatId, `${e(ID.info)} در حال حاضر کانفیگی موجود نیست.\nلطفاً با پشتیبانی در تماس باشید.`);
    return;
  }

  const config = configs.shift();
  db.settings.configs = configs;
  user.points -= cost;
  user.subscriptions.push({ config, date: new Date().toISOString().slice(0, 10) });
  saveDB(db);

  await sendMsg(chatId,
    `${e(ID.check)} <b>اشتراک شما با موفقیت فعال شد!</b>\n\n${e(ID.key)} کانفیگ شما:\n<code>${config}</code>\n\n${e(ID.money)} امتیاز باقیمانده: ${user.points}`
  );
}

async function handleInvite(chatId, userId, db) {
  const user = db.users[userId];
  const cost = db.settings.subscriptionCost;
  const name = db.settings.subscriptionName;
  const link = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
  await sendMsg(chatId,
    `${e(ID.gift)} <b>سیستم دعوت دوستان</b>\n\n${e(ID.plus)} امتیاز هر دعوت: 1\n${e(ID.trophy)} تعداد دعوت‌های شما: ${user.referrals}\n${e(ID.person)} امتیاز فعلی: ${user.points}\n\n${e(ID.link)} لینک دعوت اختصاصی شما:\n<code>${link}</code>\n\n${e(ID.up)} این لینک را با دوستان خود بگذارید و به ازای هر نفر که وارد ربات شود، 1 امتیاز دریافت کنید!\n\n${e(ID.bulb)} با ${cost} امتیاز می‌توانید یک ${name} دریافت کنید.`
  );
}

async function handleProfile(chatId, userId, db) {
  const u = db.users[userId];
  const uname = u.username ? `@${u.username}` : "—";
  await sendMsg(chatId,
    `${e(ID.note)} <b>پروفایل شما</b>\n\n${e(ID.search)} شناسه: <code>${u.id}</code>\n${e(ID.hero)} نام: ${u.name}\n${e(ID.info)} نام کاربری: ${uname}\n${e(ID.person)} امتیاز فعلی: ${u.points}\n${e(ID.trophy)} تعداد دعوت: ${u.referrals}\n${e(ID.calendar)} تاریخ عضویت: ${u.joinDate}`
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
async function showAdminPanel(chatId, db) {
  const total = Object.keys(db.users).length;
  const configs = (db.settings.configs || []).length;
  const maintenance = db.settings.maintenanceMode ? "🔴 روشن" : "🟢 خاموش";
  await sendMsg(chatId,
    `${e(ID.check)} <b>پنل مدیریت ادمین</b>\n\n${e(ID.person)} کل کاربران: <b>${total}</b>\n${e(ID.key)} کانفیگ‌های موجود: <b>${configs}</b>\n${e(ID.coin)} هزینه اشتراک: <b>${db.settings.subscriptionCost} امتیاز</b>\n${e(ID.tool)} حالت تعمیر: ${maintenance}`,
    { reply_markup: adminKeyboard() }
  );
}

function setAdminState(db, adminId, state) {
  if (!db.adminState) db.adminState = {};
  if (state === null) { delete db.adminState[adminId]; }
  else { db.adminState[adminId] = state; }
  saveDB(db);
}

function getAdminState(db, adminId) {
  return db.adminState?.[adminId] || null;
}

async function handleAdminCallback(cq, db) {
  const chatId = cq.message.chat.id;
  const msgId = cq.message.message_id;
  const data = cq.data;
  const adminId = cq.from.id;

  if (cq.from.username?.toLowerCase() !== ADMIN_USERNAME) {
    await answerCb(cq.id, "⛔️ دسترسی ندارید.", true); return;
  }
  await answerCb(cq.id);

  // ── Stats & Info ─────────────────────────────────────────────────────────
  if (data === "a_back") {
    setAdminState(db, adminId, null);
    await showAdminPanel(chatId, db); return;
  }

  if (data === "a_status") {
    const uptime = Math.floor(process.uptime() / 60);
    const total = Object.keys(db.users).length;
    const maintenance = db.settings.maintenanceMode ? "روشن" : "خاموش";
    await editMsg(chatId, msgId,
      `${e(ID.clipboard)} <b>وضعیت ربات</b>\n\n${e(ID.check)} آپتایم: ${uptime} دقیقه\n${e(ID.person)} کل کاربران: ${total}\n${e(ID.tool)} حالت تعمیر: ${maintenance}\n${e(ID.key)} کانفیگ‌های موجود: ${(db.settings.configs || []).length}`,
      { reply_markup: backRow() }); return;
  }

  if (data === "a_stats") {
    const users = Object.values(db.users);
    const totalPts = users.reduce((a, u) => a + u.points, 0);
    const totalRefs = users.reduce((a, u) => a + u.referrals, 0);
    const totalSubs = users.reduce((a, u) => a + u.subscriptions.length, 0);
    await editMsg(chatId, msgId,
      `${e(ID.chart)} <b>آمار کامل</b>\n\n${e(ID.person)} کل کاربران: ${users.length}\n${e(ID.money)} مجموع امتیازات: ${totalPts}\n${e(ID.trophy)} مجموع دعوت‌ها: ${totalRefs}\n${e(ID.gift)} اشتراک‌های داده شده: ${totalSubs}\n${e(ID.key)} کانفیگ‌های باقیمانده: ${(db.settings.configs || []).length}`,
      { reply_markup: backRow() }); return;
  }

  if (data === "a_recent") {
    const users = Object.values(db.users).slice(-10).reverse();
    let txt = `${e(ID.person)} <b>آخرین کاربران</b>\n\n`;
    users.forEach((u, i) => {
      txt += `${i + 1}. ${u.username ? "@" + u.username : u.name} | <code>${u.id}</code> | ${u.joinDate}\n`;
    });
    await editMsg(chatId, msgId, txt, { reply_markup: backRow() }); return;
  }

  if (data === "a_top_ref") {
    const top = Object.values(db.users).sort((a, b) => b.referrals - a.referrals).slice(0, 10);
    let txt = `${e(ID.trophy)} <b>برترین دعوت‌ها</b>\n\n`;
    top.forEach((u, i) => { txt += `${i + 1}. ${u.username ? "@" + u.username : u.name}: ${u.referrals} دعوت\n`; });
    await editMsg(chatId, msgId, txt, { reply_markup: backRow() }); return;
  }

  if (data === "a_top_sub") {
    const top = Object.values(db.users).sort((a, b) => b.subscriptions.length - a.subscriptions.length).slice(0, 10);
    let txt = `${e(ID.hero)} <b>بیشترین سرویس</b>\n\n`;
    top.forEach((u, i) => { txt += `${i + 1}. ${u.username ? "@" + u.username : u.name}: ${u.subscriptions.length} سرویس\n`; });
    await editMsg(chatId, msgId, txt, { reply_markup: backRow() }); return;
  }

  if (data === "a_top_rich") {
    const top = Object.values(db.users).sort((a, b) => b.points - a.points).slice(0, 10);
    let txt = `${e(ID.coin)} <b>ثروتمندترین‌ها</b>\n\n`;
    top.forEach((u, i) => { txt += `${i + 1}. ${u.username ? "@" + u.username : u.name}: ${u.points} امتیاز\n`; });
    await editMsg(chatId, msgId, txt, { reply_markup: backRow() }); return;
  }

  if (data === "a_monthly") {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const users = Object.values(db.users).filter(u => u.joinDate?.startsWith(month));
    const subs = users.reduce((a, u) => a + u.subscriptions.filter(s => s.date?.startsWith(month)).length, 0);
    await editMsg(chatId, msgId,
      `${e(ID.calendar)} <b>آمار ماهانه (${month})</b>\n\n${e(ID.person)} کاربران جدید: ${users.length}\n${e(ID.gift)} اشتراک‌های داده شده: ${subs}`,
      { reply_markup: backRow() }); return;
  }

  if (data === "a_allusers") {
    const users = Object.values(db.users);
    let txt = `${e(ID.clipboard)} <b>همه کاربران (${users.length} نفر)</b>\n\n`;
    users.slice(0, 50).forEach(u => {
      txt += `• ${u.username ? "@" + u.username : u.name} | <code>${u.id}</code> | ${u.points}pt\n`;
    });
    if (users.length > 50) txt += `\n... و ${users.length - 50} نفر دیگر`;
    await editMsg(chatId, msgId, txt, { reply_markup: backRow() }); return;
  }

  if (data === "a_report") {
    const users = Object.values(db.users);
    const totalPts = users.reduce((a, u) => a + u.points, 0);
    const totalRefs = users.reduce((a, u) => a + u.referrals, 0);
    const totalSubs = users.reduce((a, u) => a + u.subscriptions.length, 0);
    const banned = Object.keys(db.banned || {}).length;
    await editMsg(chatId, msgId,
      `${e(ID.chart)} <b>گزارش کامل</b>\n\n${e(ID.person)} کل کاربران: ${users.length}\n${e(ID.cross)} بن‌شده‌ها: ${banned}\n${e(ID.money)} مجموع امتیازات: ${totalPts}\n${e(ID.trophy)} مجموع دعوت‌ها: ${totalRefs}\n${e(ID.gift)} اشتراک‌های داده شده: ${totalSubs}\n${e(ID.key)} کانفیگ‌های موجود: ${(db.settings.configs || []).length}\n${e(ID.coin)} هزینه اشتراک: ${db.settings.subscriptionCost} امتیاز\n${e(ID.tool)} حالت تعمیر: ${db.settings.maintenanceMode ? "روشن" : "خاموش"}`,
      { reply_markup: backRow() }); return;
  }

  if (data === "a_configs") {
    const configs = db.settings.configs || [];
    let txt = `${e(ID.key)} <b>مدیریت کانفیگ</b>\n\n${e(ID.info)} تعداد موجود: ${configs.length}\n\n`;
    configs.slice(0, 5).forEach((c, i) => { txt += `${i + 1}. <code>${c.slice(0, 40)}...</code>\n`; });
    txt += `\nبرای افزودن کانفیگ از دکمه «افزودن کانفیگ» استفاده کنید.`;
    await editMsg(chatId, msgId, txt, { reply_markup: backRow() }); return;
  }

  if (data === "a_coin_cfg") {
    await editMsg(chatId, msgId,
      `${e(ID.gear)} <b>تنظیمات سکه‌ها</b>\n\n${e(ID.coin)} هزینه اشتراک: ${db.settings.subscriptionCost} امتیاز\n${e(ID.gift)} نام اشتراک: ${db.settings.subscriptionName}\n\nدستورات:\n• /setcost [عدد] — تغییر هزینه\n• /setname [نام] — تغییر نام اشتراک`,
      { reply_markup: backRow() }); return;
  }

  if (data === "a_channels") {
    await editMsg(chatId, msgId,
      `${e(ID.antenna)} <b>کانال‌های اجباری</b>\n\n${e(ID.check)} کانال فعلی: @${MANDATORY_CHANNEL}\n\nبرای تغییر کانال از دستور زیر استفاده کنید:\n/setchannel [یوزرنیم کانال]`,
      { reply_markup: backRow() }); return;
  }

  if (data === "a_maintenance") {
    db.settings.maintenanceMode = !db.settings.maintenanceMode;
    saveDB(db);
    const status = db.settings.maintenanceMode ? "روشن شد" : "خاموش شد";
    await editMsg(chatId, msgId,
      `${e(ID.tool)} حالت تعمیر <b>${status}</b>.`,
      { reply_markup: backRow() }); return;
  }

  // ── Actions requiring follow-up text ─────────────────────────────────────
  const promptMap = {
    a_broadcast:   { state: "broadcast",    prompt: `${e(ID.broadcast)} <b>پیام همگانی</b>\n\nپیام خود را ارسال کنید.\n${e(ID.bulb)} ایموجی پریمیوم کاملاً پشتیبانی می‌شود.` },
    a_msg_user:    { state: "msg_user_id",   prompt: `${e(ID.note)} <b>پیام به کاربر</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_search:      { state: "search",        prompt: `${e(ID.search)} <b>جستجوی کاربر</b>\n\nیوزرنیم یا آیدی عددی را بنویسید:` },
    a_userinfo:    { state: "userinfo",      prompt: `${e(ID.user_icon)} <b>اطلاعات کاربر</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_ban:         { state: "ban",           prompt: `${e(ID.cross)} <b>مسدود کردن</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_unban:       { state: "unban",         prompt: `${e(ID.check)} <b>رفع مسدودی</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_add_pts:     { state: "add_pts_id",    prompt: `${e(ID.plus)} <b>افزودن سکه</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_set_pts:     { state: "set_pts_id",    prompt: `${e(ID.money)} <b>تنظیم سکه</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_reset_pts:   { state: "reset_pts",     prompt: `${e(ID.moon)} <b>ری‌ست سکه</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_manual_sub:  { state: "manual_sub_id", prompt: `${e(ID.gift)} <b>سرویس دستی</b>\n\nآیدی عددی کاربر را بنویسید:` },
    a_del_user:    { state: "del_user",      prompt: `${e(ID.trash)} <b>حذف کاربر</b>\n\nآیدی عددی کاربر را بنویسید (برگشت‌ناپذیر):` },
    a_welcome:     { state: "set_welcome",   prompt: `${e(ID.bell)} <b>متن خوش‌آمد</b>\n\nمتن جدید را ارسال کنید. ایموجی پریمیوم پشتیبانی می‌شود.\nبرای بازگشت به پیش‌فرض بنویسید: /resetwelcome` },
    a_addconfig:   { state: "addconfig",     prompt: `${e(ID.key)} <b>افزودن کانفیگ</b>\n\nکانفیگ جدید را ارسال کنید:` },
  };

  if (promptMap[data]) {
    const { state, prompt } = promptMap[data];
    setAdminState(db, adminId, { action: state, data: {} });
    await editMsg(chatId, msgId, prompt,
      { reply_markup: { inline_keyboard: [[ib("لغو", "a_back", ID.cross)]] } });
    return;
  }
}

// ─── Admin Text State Machine ─────────────────────────────────────────────────
async function handleAdminState(msg, db, adminId) {
  const state = getAdminState(db, adminId);
  if (!state) return false;

  const chatId = msg.chat.id;
  const text = msg.text || "";
  const { action, data: stateData } = state;

  // broadcast — use copyMessage to preserve ALL entities including premium emoji
  if (action === "broadcast") {
    setAdminState(db, adminId, null);
    const users = Object.keys(db.users);
    await sendMsg(chatId, `${e(ID.broadcast)} در حال ارسال به ${users.length} کاربر...`);
    let sent = 0, failed = 0;
    for (const uid of users) {
      const r = await copyMsg(chatId, msg.message_id, parseInt(uid));
      if (r.ok) sent++; else failed++;
      await new Promise(r => setTimeout(r, 60));
    }
    await sendMsg(chatId, `${e(ID.check)} ارسال تمام شد.\n${e(ID.check)} موفق: ${sent}\n${e(ID.cross)} ناموفق: ${failed}`);
    return true;
  }

  // msg_user_id → get user id, then prompt for message
  if (action === "msg_user_id") {
    const uid = text.trim();
    if (!db.users[uid]) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); setAdminState(db, adminId, null); return true; }
    setAdminState(db, adminId, { action: "msg_user_msg", data: { uid } });
    await sendMsg(chatId, `${e(ID.note)} پیام خود را برای کاربر <code>${uid}</code> بنویسید:\n${e(ID.bulb)} ایموجی پریمیوم پشتیبانی می‌شود.`);
    return true;
  }

  // msg_user_msg → send message to user using copyMessage
  if (action === "msg_user_msg") {
    const { uid } = stateData;
    setAdminState(db, adminId, null);
    const r = await copyMsg(chatId, msg.message_id, parseInt(uid));
    if (r.ok) await sendMsg(chatId, `${e(ID.check)} پیام ارسال شد.`);
    else await sendMsg(chatId, `${e(ID.cross)} ارسال ناموفق. کاربر ربات را بلاک کرده باشد.`);
    return true;
  }

  // search
  if (action === "search") {
    setAdminState(db, adminId, null);
    const q = text.trim().replace("@", "");
    const found = Object.values(db.users).filter(u =>
      u.id?.toString() === q || u.username?.toLowerCase() === q.toLowerCase()
    );
    if (!found.length) { await sendMsg(chatId, `${e(ID.cross)} کاربری یافت نشد.`); return true; }
    const u = found[0];
    await sendUserInfo(chatId, u, db);
    return true;
  }

  // userinfo
  if (action === "userinfo") {
    setAdminState(db, adminId, null);
    const u = db.users[text.trim()];
    if (!u) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); return true; }
    await sendUserInfo(chatId, u, db);
    return true;
  }

  // ban
  if (action === "ban") {
    setAdminState(db, adminId, null);
    const uid = text.trim();
    if (!db.users[uid]) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); return true; }
    if (!db.banned) db.banned = {};
    db.banned[uid] = true;
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} کاربر <code>${uid}</code> مسدود شد.`);
    return true;
  }

  // unban
  if (action === "unban") {
    setAdminState(db, adminId, null);
    const uid = text.trim();
    delete db.banned?.[uid];
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} مسدودی کاربر <code>${uid}</code> رفع شد.`);
    return true;
  }

  // add_pts_id → get user id
  if (action === "add_pts_id") {
    const uid = text.trim();
    if (!db.users[uid]) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); setAdminState(db, adminId, null); return true; }
    setAdminState(db, adminId, { action: "add_pts_val", data: { uid } });
    await sendMsg(chatId, `${e(ID.plus)} چند سکه به کاربر <code>${uid}</code> اضافه کنم؟`);
    return true;
  }

  // add_pts_val → add points
  if (action === "add_pts_val") {
    const { uid } = stateData;
    const n = parseInt(text);
    setAdminState(db, adminId, null);
    if (isNaN(n)) { await sendMsg(chatId, `${e(ID.cross)} عدد نامعتبر.`); return true; }
    db.users[uid].points += n;
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} ${n} سکه به کاربر <code>${uid}</code> اضافه شد. موجودی: ${db.users[uid].points}`);
    return true;
  }

  // set_pts_id → get user id
  if (action === "set_pts_id") {
    const uid = text.trim();
    if (!db.users[uid]) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); setAdminState(db, adminId, null); return true; }
    setAdminState(db, adminId, { action: "set_pts_val", data: { uid } });
    await sendMsg(chatId, `${e(ID.money)} سکه کاربر <code>${uid}</code> را به چند تنظیم کنم؟`);
    return true;
  }

  // set_pts_val → set points
  if (action === "set_pts_val") {
    const { uid } = stateData;
    const n = parseInt(text);
    setAdminState(db, adminId, null);
    if (isNaN(n) || n < 0) { await sendMsg(chatId, `${e(ID.cross)} عدد نامعتبر.`); return true; }
    db.users[uid].points = n;
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} سکه کاربر <code>${uid}</code> به ${n} تنظیم شد.`);
    return true;
  }

  // reset_pts → reset user points
  if (action === "reset_pts") {
    setAdminState(db, adminId, null);
    const uid = text.trim();
    if (!db.users[uid]) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); return true; }
    db.users[uid].points = 0;
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} سکه کاربر <code>${uid}</code> ری‌ست شد.`);
    return true;
  }

  // manual_sub_id → get user id
  if (action === "manual_sub_id") {
    const uid = text.trim();
    if (!db.users[uid]) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); setAdminState(db, adminId, null); return true; }
    setAdminState(db, adminId, { action: "manual_sub_val", data: { uid } });
    await sendMsg(chatId, `${e(ID.gift)} کانفیگ سرویس دستی را بنویسید:`);
    return true;
  }

  // manual_sub_val → give config to user
  if (action === "manual_sub_val") {
    const { uid } = stateData;
    setAdminState(db, adminId, null);
    db.users[uid].subscriptions.push({ config: text.trim(), date: new Date().toISOString().slice(0, 10) });
    saveDB(db);
    await copyMsg(chatId, msg.message_id, parseInt(uid));
    await sendMsg(chatId, `${e(ID.check)} سرویس دستی به کاربر <code>${uid}</code> ارسال شد.`);
    return true;
  }

  // del_user
  if (action === "del_user") {
    setAdminState(db, adminId, null);
    const uid = text.trim();
    if (!db.users[uid]) { await sendMsg(chatId, `${e(ID.cross)} کاربر یافت نشد.`); return true; }
    delete db.users[uid];
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} کاربر <code>${uid}</code> حذف شد.`);
    return true;
  }

  // set_welcome — uses copyMessage to support premium emoji in welcome message
  if (action === "set_welcome") {
    setAdminState(db, adminId, null);
    if (text === "/resetwelcome") {
      db.settings.welcomeText = null;
      saveDB(db);
      await sendMsg(chatId, `${e(ID.check)} متن خوش‌آمد به حالت پیش‌فرض برگشت.`);
      return true;
    }
    // Store text (entities will be in the copied message)
    db.settings.welcomeText = text;
    db.settings.welcomeMsgRef = { chatId, messageId: msg.message_id };
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} متن خوش‌آمد تنظیم شد.`);
    return true;
  }

  // addconfig
  if (action === "addconfig") {
    setAdminState(db, adminId, null);
    if (!db.settings.configs) db.settings.configs = [];
    db.settings.configs.push(text.trim());
    saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} کانفیگ اضافه شد. تعداد کل: ${db.settings.configs.length}`);
    return true;
  }

  return false;
}

async function sendUserInfo(chatId, u, db) {
  const uname = u.username ? `@${u.username}` : "—";
  const banned = db.banned?.[u.id] ? "بله" : "خیر";
  await sendMsg(chatId,
    `${e(ID.user_icon)} <b>اطلاعات کاربر</b>\n\n${e(ID.search)} آیدی: <code>${u.id}</code>\n${e(ID.hero)} نام: ${u.name}\n${e(ID.info)} یوزرنیم: ${uname}\n${e(ID.money)} امتیاز: ${u.points}\n${e(ID.trophy)} دعوت‌ها: ${u.referrals}\n${e(ID.calendar)} عضویت: ${u.joinDate}\n${e(ID.gift)} اشتراک‌ها: ${u.subscriptions.length}\n${e(ID.cross)} بن: ${banned}`,
    {
      reply_markup: {
        inline_keyboard: [
          [ib("افزودن سکه", `qs_add_${u.id}`, ID.plus), ib("ری‌ست سکه", `qs_rst_${u.id}`, ID.moon)],
          [ib("مسدود/رفع مسدودی", `qs_ban_${u.id}`, ID.cross), ib("حذف کاربر", `qs_del_${u.id}`, ID.trash)],
        ],
      },
    }
  );
}

// ─── Admin Quick Actions ──────────────────────────────────────────────────────
async function handleQuickAction(cq, db) {
  const data = cq.data;
  const chatId = cq.message.chat.id;
  const adminId = cq.from.id;
  if (cq.from.username?.toLowerCase() !== ADMIN_USERNAME) {
    await answerCb(cq.id, "⛔️ دسترسی ندارید.", true); return;
  }
  await answerCb(cq.id);

  if (data.startsWith("qs_add_")) {
    const uid = data.replace("qs_add_", "");
    setAdminState(db, adminId, { action: "add_pts_val", data: { uid } });
    await sendMsg(chatId, `${e(ID.plus)} چند سکه به کاربر <code>${uid}</code> اضافه کنم؟`);
  } else if (data.startsWith("qs_rst_")) {
    const uid = data.replace("qs_rst_", "");
    db.users[uid].points = 0; saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} سکه کاربر <code>${uid}</code> ری‌ست شد.`);
  } else if (data.startsWith("qs_ban_")) {
    const uid = data.replace("qs_ban_", "");
    if (!db.banned) db.banned = {};
    if (db.banned[uid]) { delete db.banned[uid]; await sendMsg(chatId, `${e(ID.check)} مسدودی رفع شد.`); }
    else { db.banned[uid] = true; await sendMsg(chatId, `${e(ID.check)} کاربر مسدود شد.`); }
    saveDB(db);
  } else if (data.startsWith("qs_del_")) {
    const uid = data.replace("qs_del_", "");
    delete db.users[uid]; saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} کاربر <code>${uid}</code> حذف شد.`);
  }
}

// ─── Admin Commands (slash) ───────────────────────────────────────────────────
async function handleAdminCommands(msg, db) {
  const text = msg.text || "";
  const chatId = msg.chat.id;
  if (msg.from.username?.toLowerCase() !== ADMIN_USERNAME) return false;

  if (text.startsWith("/setcost ")) {
    const n = parseInt(text.split(" ")[1]);
    if (isNaN(n) || n < 1) { await sendMsg(chatId, `${e(ID.cross)} عدد نامعتبر.`); return true; }
    db.settings.subscriptionCost = n; saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} هزینه اشتراک به ${n} امتیاز تغییر یافت.`); return true;
  }
  if (text.startsWith("/setname ")) {
    db.settings.subscriptionName = text.replace("/setname ", "").trim(); saveDB(db);
    await sendMsg(chatId, `${e(ID.check)} نام اشتراک تغییر یافت.`); return true;
  }
  if (text.startsWith("/setchannel ")) {
    const ch = text.replace("/setchannel ", "").trim().replace("@", "");
    // Note: channel is currently hardcoded, guide admin
    await sendMsg(chatId, `${e(ID.info)} برای تغییر کانال اجباری، مقدار MANDATORY_CHANNEL را در کد ربات به <code>${ch}</code> تغییر دهید.`); return true;
  }
  return false;
}

// ─── Main Message Handler ─────────────────────────────────────────────────────
async function onMessage(msg) {
  const db = loadDB();
  const { id: userId, first_name, username } = msg.from || {};
  const chatId = msg.chat?.id;
  const text = msg.text || "";

  if (!userId || chatId < 0) return;
  if (db.banned?.[userId]) return;

  getUser(db, userId, first_name, username || null);

  if (text.startsWith("/start")) { await handleStart(msg, db); return; }
  if (text === "/admin") {
    if (username?.toLowerCase() !== ADMIN_USERNAME) { await sendMsg(chatId, `${e(ID.cross)} دسترسی ندارید.`); return; }
    await showAdminPanel(chatId, db); return;
  }

  // Admin commands
  if (username?.toLowerCase() === ADMIN_USERNAME) {
    if (await handleAdminCommands(msg, db)) return;
    if (await handleAdminState(msg, db, userId)) return;
  }

  // Maintenance mode
  if (db.settings.maintenanceMode && username?.toLowerCase() !== ADMIN_USERNAME) {
    await sendMsg(chatId, `${e(ID.tool)} ربات در حال تعمیر است. لطفاً بعداً مراجعه کنید.`); return;
  }

  // Keyboard buttons
  if (text === "دریافت اشتراک") { await handleSubscribe(chatId, userId, db); return; }
  if (text === "دعوت دوستان")   { await handleInvite(chatId, userId, db); return; }
  if (text === "پروفایل")       { await handleProfile(chatId, userId, db); return; }
  if (text === "پشتیبانی")      { await sendMsg(chatId, "فاقد ورودی!"); return; }
  if (text === "قوانین")        { await sendMsg(chatId, rulesText()); return; }
  if (text === "راهنما")        { await sendMsg(chatId, guideText(db)); return; }

  await sendMsg(chatId, `${e(ID.bulb)} لطفاً از دکمه‌های زیر استفاده کنید:`, { reply_markup: mainKeyboard() });
}

// ─── Callback Query Handler ───────────────────────────────────────────────────
async function onCallback(cq) {
  const db = loadDB();
  const data = cq.data || "";

  if (data === "verify_membership") {
    const { id: userId, first_name, username } = cq.from;
    const chatId = cq.message.chat.id;
    const msgId = cq.message.message_id;
    const member = await isMember(userId, MANDATORY_CHANNEL);
    if (member) {
      getUser(db, userId, first_name, username || null);
      await api("editMessageReplyMarkup", { chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: [] } });
      await sendMsg(chatId, welcomeText(db.settings.welcomeText), { reply_markup: mainKeyboard() });
    } else {
      await answerCb(cq.id, "هنوز عضو نشدید! ابتدا در کانال عضو شوید.", true);
    }
    return;
  }

  if (data === "show_invite") {
    const { id: userId, first_name, username } = cq.from;
    getUser(db, userId, first_name, username || null);
    await answerCb(cq.id);
    await handleInvite(cq.message.chat.id, userId, db);
    return;
  }

  if (data.startsWith("qs_")) { await handleQuickAction(cq, db); return; }
  if (data.startsWith("a_"))  { await handleAdminCallback(cq, db); return; }

  await answerCb(cq.id);
}

// ─── Startup: push new keyboard to all existing users ────────────────────────
async function resetKeyboardForAllUsers() {
  const db = loadDB();
  const userIds = Object.keys(db.users);
  if (!userIds.length) return;
  console.log(`Sending new keyboard to ${userIds.length} users...`);
  for (const uid of userIds) {
    try {
      await api("sendMessage", {
        chat_id: parseInt(uid),
        text: `${e(ID.bell)} <b>ربات آپدیت شد!</b>\n\n${e(ID.check)} کیبورد جدید فعال شد.`,
        parse_mode: "HTML",
        reply_markup: mainKeyboard(),
      });
      await new Promise(r => setTimeout(r, 50));
    } catch {}
  }
  console.log("Keyboard reset done.");
}

// ─── Poll ─────────────────────────────────────────────────────────────────────
let offset = 0;
async function poll() {
  await getBotInfo();
  await resetKeyboardForAllUsers();
  console.log("Bot started.");
  while (true) {
    try {
      const r = await api("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
      if (!r.ok) { await new Promise(x => setTimeout(x, 3000)); continue; }
      for (const upd of r.result) {
        offset = upd.update_id + 1;
        try {
          if (upd.message)        await onMessage(upd.message);
          if (upd.callback_query) await onCallback(upd.callback_query);
        } catch (err) { console.error("Handler error:", err.message); }
      }
    } catch (err) {
      console.error("Poll error:", err.message);
      await new Promise(x => setTimeout(x, 3000));
    }
  }
}

poll();
