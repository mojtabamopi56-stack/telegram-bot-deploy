import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = "8129620169:AAFVQHtaLUUBEayBm9msUS5hLQ2ng15MjUk";
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_USERNAME = "mojeao";
const MANDATORY_CHANNEL = "lnterFreedom";
const MANDATORY_CHANNEL_LINK = "https://t.me/lnterFreedom";

const EMOJI = {
  subscribe: "5206607081334906820",
  invite:    "5424818078833715060",
  profile:   "5190806721286657692",
  support:   "5413704112220949842",
  rules:     "5271604874419647061",
  guide:     "5447644880824181073",
};

// ─── Database ───────────────────────────────────────────────────────────────
const DB_PATH = existsSync("/data") ? "/data/db.json" : join(__dirname, "db.json");

function loadDB() {
  if (!existsSync(DB_PATH)) {
    return {
      users: {},
      settings: { subscriptionCost: 2, subscriptionName: "اشتراک 1 گیگی 24 ساعته", configs: [] },
      pendingBroadcast: {},
      pendingAddPoints: {},
      pendingRemovePoints: {},
      pendingAddConfig: {},
      banned: {},
    };
  }
  return JSON.parse(readFileSync(DB_PATH, "utf8"));
}

function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(db, userId, name, username) {
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      name: name || "بدون نام",
      username: username || null,
      points: 0,
      referrals: 0,
      referredBy: null,
      joinDate: new Date().toISOString().slice(0, 10),
      subscriptions: [],
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

// ─── Telegram API ────────────────────────────────────────────────────────────
async function api(method, params = {}) {
  try {
    const res = await fetch(`${BASE_URL}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  } catch (e) {
    console.error(`API error [${method}]:`, e.message);
    return { ok: false };
  }
}

async function sendMsg(chatId, text, extra = {}) {
  return api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

async function editMsg(chatId, messageId, text, extra = {}) {
  return api("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...extra });
}

async function isMember(userId, channel) {
  const r = await api("getChatMember", { chat_id: `@${channel}`, user_id: userId });
  if (!r.ok) return false;
  return ["member", "administrator", "creator"].includes(r.result?.status);
}

let BOT_USERNAME = "";
async function getBotInfo() {
  const r = await api("getMe");
  if (r.ok) BOT_USERNAME = r.result.username;
  console.log("Bot username:", BOT_USERNAME);
}

// ─── Keyboards ───────────────────────────────────────────────────────────────
function mainKeyboard() {
  return {
    keyboard: [
      [{ text: "دریافت اشتراک", icon_custom_emoji_id: EMOJI.subscribe, style: "primary" }],
      [
        { text: "دعوت دوستان", icon_custom_emoji_id: EMOJI.invite, style: "primary" },
        { text: "پروفایل", icon_custom_emoji_id: EMOJI.profile, style: "primary" },
      ],
      [
        { text: "پشتیبانی", icon_custom_emoji_id: EMOJI.support, style: "primary" },
        { text: "قوانین", icon_custom_emoji_id: EMOJI.rules, style: "primary" },
      ],
      [{ text: "راهنما", icon_custom_emoji_id: EMOJI.guide, style: "primary" }],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

function joinInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📢 عضویت در کانال", url: MANDATORY_CHANNEL_LINK }],
      [{ text: "✅ تایید عضویت", callback_data: "verify_membership" }],
    ],
  };
}

// ─── Messages ────────────────────────────────────────────────────────────────
function welcomeText() {
  return `🔔 <b>به ربات کانفیگ رایگان خوش آمدید</b>

🔔 با این ربات می‌تونی خیلی راحت:
✅ کانفیگ‌های پرسرعت و باکیفیت دریافت کنی
✅ با فعالیت و دعوت دوستان، امتیاز جمع کنی
✅ با امتیازهای کانفیگ رایگان بگیری
✅ همیشه از وضعیت و سلامت سرویس‌ها با خبر باشی

🔴 یکی از گزینه‌های زیر رو انتخاب کن:
@${BOT_USERNAME}`;
}

function channelCheckText() {
  return `📱 <b>برای استفاده از ربات ابتدا باید در کانال زیر عضو شوید</b>

🤝 پس از عضویت روی دکمه «تایید عضویت» کلیک کنید.`;
}

function rulesText() {
  return `📋 <b>قوانین و شرایط استفاده</b>

⚖️ کاربر گرامی،
برای حفظ کیفیت سرویس‌ها و ایجاد تجربه‌ای عادلانه برای همه کاربران، رعایت موارد زیر الزامی است:

🔒 <b>حریم خصوصی</b>
• اطلاعات شما کاملاً محرمانه بوده و فقط جهت مدیریت سرویس استفاده می‌شود.

🏆 <b>سیستم دعوت (رفرال)</b>
• دریافت اشتراک رایگان از طریق دعوت دوستان با لینک اختصاصی شما امکان‌پذیر است.
• هرگونه تقلب (اکانت فیک، ربات یا دور زدن سیستم) شناسایی شده و منجر به مسدودسازی دائمی حساب و حذف امتیازات خواهد شد.

🚫 <b>قوانین استفاده</b>
• اشتراک دریافتی صرفاً برای استفاده شخصی بوده و به اشتراک‌گذاری آن ممنوع است.
• استفاده از سرویس برای فعالیت‌های مخرب، اسم یا حملات (DDoS) اکیداً ممنوع می‌باشد.

‼️ <b>مسئولیت</b>
• تمامی مسئولیت نحوه استفاده از سرویس بر عهده کاربر خواهد بود.`;
}

function guideText(db) {
  const cost = db.settings.subscriptionCost;
  const name = db.settings.subscriptionName;
  return `❓ <b>راهنمای دریافت اشتراک رایگان</b>

برای دریافت اشتراک پرسرعت، مراحل زیر را دنبال کنید:

1️⃣ <b>مرحله ۱: دریافت لینک اختصاصی</b>
وارد بخش «دعوت دوستان» شوید و لینک اختصاصی خود را دریافت کنید.

2️⃣ <b>مرحله ۲: دعوت از دوستان</b>
لینک را برای دوستان خود ارسال کنید. با عضویت هر کاربر، امتیاز به حساب شما افزوده می‌شود.

3️⃣ <b>مرحله ۳: دریافت اشتراک</b>
پس از رسیدن امتیاز به حد نصاب، از بخش «دریافت اشتراک»، کانفیگ خود را به صورت رایگان دریافت کنید.

💡 <b>نکته مهم</b>
سیستم دارای آنتی‌تقلب بوده و استفاده از اکانت‌های فیک منجر به حذف امتیازات خواهد شد.

🔧 <b>پشتیبانی</b>
در صورت بروز مشکل، از بخش «پشتیبانی» اقدام کنید.

📊 هزینه اشتراک فعلی: <b>${cost} امتیاز</b> برای ${name}`;
}

// ─── Handlers ────────────────────────────────────────────────────────────────
async function handleStart(msg, db) {
  const userId = msg.from.id;
  const name = msg.from.first_name || "کاربر";
  const username = msg.from.username || null;
  const text = msg.text || "";
  const chatId = msg.chat.id;

  const user = getUser(db, userId, name, username);

  // Handle referral
  const refMatch = text.match(/\/start ref_(\d+)/);
  if (refMatch && !user.referredBy) {
    const referrerId = parseInt(refMatch[1]);
    if (referrerId !== userId && db.users[referrerId]) {
      user.referredBy = referrerId;
      db.users[referrerId].points += 1;
      db.users[referrerId].referrals += 1;
      saveDB(db);

      const referrer = db.users[referrerId];
      const prevPoints = referrer.points - 1;
      const refName = username ? `@${username}` : name;
      await sendMsg(referrerId,
        `🎉 <b>زیرمجموعه جدید!</b>\n\n🟠 به ربات دعوت شد <b>${refName}</b>\n\n💰 موجودی شما:\nقبل: ${prevPoints} امتیاز\nبعد: ${referrer.points} امتیاز (+1)\n\n📊 تعداد کل زیرمجموعه‌های شما: ${referrer.referrals}`
      );
    }
  }

  // Check mandatory membership
  const member = await isMember(userId, MANDATORY_CHANNEL);
  if (!member) {
    await sendMsg(chatId, channelCheckText(), {
      reply_markup: joinInlineKeyboard(),
    });
    return;
  }

  await sendMsg(chatId, welcomeText(), { reply_markup: mainKeyboard() });
}

async function handleSubscribe(chatId, userId, db) {
  const member = await isMember(userId, MANDATORY_CHANNEL);
  if (!member) {
    await sendMsg(chatId, channelCheckText(), { reply_markup: joinInlineKeyboard() });
    return;
  }

  const user = db.users[userId];
  const cost = db.settings.subscriptionCost;

  if (!user || user.points < cost) {
    const current = user?.points || 0;
    const diff = cost - current;
    await sendMsg(chatId,
      `❌ <b>امتیاز کافی نیست!</b>\n\n🦸 هزینه اشتراک: ${cost} امتیاز\n🧑 امتیاز فعلی شما: ${current}\n🔵 امتیاز کمبود: ${diff}\n\n💡 با دعوت دوستان می‌توانید امتیاز کسب کنید!`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🍑 دعوت دوستان", callback_data: "show_invite" }]],
        },
      }
    );
    return;
  }

  const configs = db.settings.configs || [];
  if (configs.length === 0) {
    await sendMsg(chatId, "⚠️ در حال حاضر کانفیگی موجود نیست.\nلطفاً با پشتیبانی در تماس باشید.");
    return;
  }

  const config = configs.shift();
  db.settings.configs = configs;
  user.points -= cost;
  user.subscriptions.push({ config, date: new Date().toISOString().slice(0, 10) });
  saveDB(db);

  await sendMsg(chatId,
    `✅ <b>اشتراک شما با موفقیت فعال شد!</b>\n\n🔑 کانفیگ شما:\n<code>${config}</code>\n\n💰 امتیاز باقیمانده: ${user.points}`
  );
}

async function handleInvite(chatId, userId, db) {
  const user = db.users[userId];
  const cost = db.settings.subscriptionCost;
  const name = db.settings.subscriptionName;
  const link = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;

  await sendMsg(chatId,
    `🎁 <b>سیستم دعوت دوستان</b>\n\n➕ امتیاز هر دعوت: 1\n🏆 تعداد دعوت‌های شما: ${user.referrals}\n🧑 امتیاز فعلی: ${user.points}\n\n🔗 لینک دعوت اختصاصی شما:\n<code>${link}</code>\n\n⬆️ این لینک را با دوستان خود بگذارید و به ازای هر نفر که وارد ربات شود، 1 امتیاز دریافت کنید!\n\n💡 با ${cost} امتیاز می‌توانید یک ${name} دریافت کنید.`
  );
}

async function handleProfile(chatId, userId, db) {
  const user = db.users[userId];
  const uname = user.username ? `@${user.username}` : "—";
  await sendMsg(chatId,
    `✏️ <b>پروفایل شما</b>\n\n😀 شناسه: <code>${user.id}</code>\n🦸 نام: ${user.name}\nℹ️ نام کاربری: ${uname}\n🧑 امتیاز فعلی: ${user.points}\n🏆 تعداد دعوت: ${user.referrals}\n📅 تاریخ عضویت: ${user.joinDate}`
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function adminMainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📊 آمار کلی", callback_data: "admin_stats" },
        { text: "👥 کاربران", callback_data: "admin_users" },
      ],
      [
        { text: "📣 ارسال همگانی", callback_data: "admin_broadcast" },
        { text: "⚙️ تنظیمات", callback_data: "admin_settings" },
      ],
      [
        { text: "➕ افزودن کانفیگ", callback_data: "admin_add_config" },
        { text: "🎯 مدیریت امتیاز", callback_data: "admin_points" },
      ],
    ],
  };
}

async function handleAdminCommand(chatId, username, db) {
  if (!username || username.toLowerCase() !== ADMIN_USERNAME) {
    await sendMsg(chatId, "⛔️ دسترسی ندارید.");
    return;
  }
  const total = Object.keys(db.users).length;
  const configs = (db.settings.configs || []).length;
  await sendMsg(chatId,
    `🔧 <b>پنل مدیریت</b>\n\nخوش آمدید @${username}\n\n👤 کل کاربران: ${total}\n🔑 کانفیگ‌های موجود: ${configs}\n💰 هزینه اشتراک: ${db.settings.subscriptionCost} امتیاز`,
    { reply_markup: adminMainKeyboard() }
  );
}

async function handleAdminCallback(callbackQuery, db) {
  const chatId = callbackQuery.message.chat.id;
  const msgId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const username = callbackQuery.from.username?.toLowerCase();
  const userId = callbackQuery.from.id;

  if (username !== ADMIN_USERNAME) {
    await api("answerCallbackQuery", { callback_query_id: callbackQuery.id, text: "⛔️ دسترسی ندارید." });
    return;
  }

  await api("answerCallbackQuery", { callback_query_id: callbackQuery.id });

  if (data === "admin_stats") {
    const users = Object.values(db.users);
    const total = users.length;
    const totalPoints = users.reduce((a, u) => a + u.points, 0);
    const totalRefs = users.reduce((a, u) => a + u.referrals, 0);
    const totalSubs = users.reduce((a, u) => a + u.subscriptions.length, 0);
    const configs = (db.settings.configs || []).length;

    await editMsg(chatId, msgId,
      `📊 <b>آمار کلی</b>\n\n👥 کل کاربران: ${total}\n💰 مجموع امتیازات: ${totalPoints}\n🏆 مجموع دعوت‌ها: ${totalRefs}\n📦 اشتراک‌های داده شده: ${totalSubs}\n🔑 کانفیگ‌های موجود: ${configs}\n⚙️ هزینه اشتراک: ${db.settings.subscriptionCost} امتیاز`,
      { reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "admin_back" }]] } }
    );

  } else if (data === "admin_users") {
    const users = Object.values(db.users).slice(0, 10);
    let txt = "👥 <b>لیست کاربران (10 نفر اخیر)</b>\n\n";
    for (const u of users) {
      const uname = u.username ? `@${u.username}` : u.name;
      txt += `• ${uname} | امتیاز: ${u.points} | دعوت: ${u.referrals}\n`;
    }
    txt += `\n🔍 برای جستجو یا مدیریت کاربر خاص، آیدی عددی او را بنویسید:\n/user [آیدی]`;
    await editMsg(chatId, msgId, txt, {
      reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "admin_back" }]] },
    });

  } else if (data === "admin_broadcast") {
    db.pendingBroadcast[userId] = true;
    saveDB(db);
    await editMsg(chatId, msgId,
      "📣 <b>ارسال پیام همگانی</b>\n\nپیام خود را بنویسید. این پیام به تمام کاربران ارسال خواهد شد:",
      { reply_markup: { inline_keyboard: [[{ text: "❌ لغو", callback_data: "admin_cancel" }]] } }
    );

  } else if (data === "admin_settings") {
    await editMsg(chatId, msgId,
      `⚙️ <b>تنظیمات</b>\n\n💰 هزینه اشتراک: ${db.settings.subscriptionCost} امتیاز\n📦 نام اشتراک: ${db.settings.subscriptionName}\n\nبرای تغییر هزینه اشتراک بنویسید:\n/setcost [عدد]\n\nبرای تغییر نام اشتراک:\n/setname [نام]`,
      { reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "admin_back" }]] } }
    );

  } else if (data === "admin_add_config") {
    db.pendingAddConfig[userId] = true;
    saveDB(db);
    await editMsg(chatId, msgId,
      "➕ <b>افزودن کانفیگ</b>\n\nکانفیگ جدید را ارسال کنید (یک کانفیگ در هر پیام):",
      { reply_markup: { inline_keyboard: [[{ text: "❌ لغو", callback_data: "admin_cancel" }]] } }
    );

  } else if (data === "admin_points") {
    await editMsg(chatId, msgId,
      "🎯 <b>مدیریت امتیاز</b>\n\nبرای افزودن امتیاز:\n/addpoints [آیدی] [مقدار]\n\nبرای کاهش امتیاز:\n/removepoints [آیدی] [مقدار]\n\nبرای مشاهده پروفایل:\n/user [آیدی]",
      { reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "admin_back" }]] } }
    );

  } else if (data === "admin_cancel") {
    delete db.pendingBroadcast[userId];
    delete db.pendingAddConfig[userId];
    delete db.pendingAddPoints[userId];
    delete db.pendingRemovePoints[userId];
    saveDB(db);
    await handleAdminCommand(chatId, ADMIN_USERNAME, db);

  } else if (data === "admin_back") {
    await handleAdminCommand(chatId, ADMIN_USERNAME, db);

  } else if (data === "verify_membership") {
    const fromId = callbackQuery.from.id;
    const member = await isMember(fromId, MANDATORY_CHANNEL);
    if (member) {
      const name = callbackQuery.from.first_name;
      const uname = callbackQuery.from.username;
      const db2 = loadDB();
      getUser(db2, fromId, name, uname);
      await api("editMessageReplyMarkup", { chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: [] } });
      await sendMsg(chatId, welcomeText(), { reply_markup: mainKeyboard() });
    } else {
      await api("answerCallbackQuery", {
        callback_query_id: callbackQuery.id,
        text: "❌ هنوز عضو نشدید! ابتدا در کانال عضو شوید.",
        show_alert: true,
      });
    }

  } else if (data === "show_invite") {
    const fromId = callbackQuery.from.id;
    const db2 = loadDB();
    await handleInvite(chatId, fromId, db2);
  }
}

// ─── Admin Commands ───────────────────────────────────────────────────────────
async function handleAdminTextCommands(msg, db) {
  const text = msg.text || "";
  const chatId = msg.chat.id;
  const username = msg.from.username?.toLowerCase();
  const adminId = msg.from.id;

  if (username !== ADMIN_USERNAME) return false;

  // /user [id]
  if (text.startsWith("/user ")) {
    const uid = text.split(" ")[1];
    const u = db.users[uid];
    if (!u) { await sendMsg(chatId, "❌ کاربر یافت نشد."); return true; }
    const uname = u.username ? `@${u.username}` : "—";
    await sendMsg(chatId,
      `👤 <b>اطلاعات کاربر</b>\n\n🆔 آیدی: <code>${u.id}</code>\n🦸 نام: ${u.name}\nℹ️ یوزرنیم: ${uname}\n💰 امتیاز: ${u.points}\n🏆 دعوت‌ها: ${u.referrals}\n📅 عضویت: ${u.joinDate}\n📦 اشتراک‌های گرفته: ${u.subscriptions.length}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "➕ افزودن امتیاز", callback_data: `pts_add_${uid}` },
              { text: "➖ کاهش امتیاز", callback_data: `pts_rem_${uid}` },
            ],
            [{ text: "🚫 بن کردن", callback_data: `ban_${uid}` }],
          ],
        },
      }
    );
    return true;
  }

  // /setcost [n]
  if (text.startsWith("/setcost ")) {
    const n = parseInt(text.split(" ")[1]);
    if (isNaN(n) || n < 1) { await sendMsg(chatId, "❌ عدد نامعتبر."); return true; }
    db.settings.subscriptionCost = n;
    saveDB(db);
    await sendMsg(chatId, `✅ هزینه اشتراک به ${n} امتیاز تغییر یافت.`);
    return true;
  }

  // /setname [name]
  if (text.startsWith("/setname ")) {
    const name = text.replace("/setname ", "").trim();
    db.settings.subscriptionName = name;
    saveDB(db);
    await sendMsg(chatId, `✅ نام اشتراک به «${name}» تغییر یافت.`);
    return true;
  }

  // /addpoints [id] [n]
  if (text.startsWith("/addpoints ")) {
    const parts = text.split(" ");
    const uid = parts[1];
    const n = parseInt(parts[2]);
    if (!db.users[uid] || isNaN(n)) { await sendMsg(chatId, "❌ پارامتر نامعتبر."); return true; }
    db.users[uid].points += n;
    saveDB(db);
    await sendMsg(chatId, `✅ ${n} امتیاز به کاربر ${uid} اضافه شد. امتیاز فعلی: ${db.users[uid].points}`);
    return true;
  }

  // /removepoints [id] [n]
  if (text.startsWith("/removepoints ")) {
    const parts = text.split(" ");
    const uid = parts[1];
    const n = parseInt(parts[2]);
    if (!db.users[uid] || isNaN(n)) { await sendMsg(chatId, "❌ پارامتر نامعتبر."); return true; }
    db.users[uid].points = Math.max(0, db.users[uid].points - n);
    saveDB(db);
    await sendMsg(chatId, `✅ امتیاز کاربر ${uid} به ${db.users[uid].points} رسید.`);
    return true;
  }

  // Pending broadcast
  if (db.pendingBroadcast[adminId]) {
    delete db.pendingBroadcast[adminId];
    saveDB(db);
    const users = Object.keys(db.users);
    let sent = 0, failed = 0;
    await sendMsg(chatId, `📣 در حال ارسال به ${users.length} کاربر...`);
    for (const uid of users) {
      const r = await sendMsg(uid, text);
      if (r.ok) sent++; else failed++;
      await new Promise(r => setTimeout(r, 50));
    }
    await sendMsg(chatId, `✅ ارسال تمام شد.\n✔️ موفق: ${sent}\n❌ ناموفق: ${failed}`);
    return true;
  }

  // Pending add config
  if (db.pendingAddConfig[adminId]) {
    delete db.pendingAddConfig[adminId];
    if (!db.settings.configs) db.settings.configs = [];
    db.settings.configs.push(text.trim());
    saveDB(db);
    await sendMsg(chatId, `✅ کانفیگ اضافه شد. تعداد کل: ${db.settings.configs.length}`);
    return true;
  }

  return false;
}

async function handleCallbackExtra(callbackQuery, db) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const msgId = callbackQuery.message.message_id;
  const username = callbackQuery.from.username?.toLowerCase();

  if (username !== ADMIN_USERNAME) {
    await api("answerCallbackQuery", { callback_query_id: callbackQuery.id, text: "⛔️ دسترسی ندارید." });
    return;
  }

  await api("answerCallbackQuery", { callback_query_id: callbackQuery.id });

  if (data.startsWith("pts_add_")) {
    const uid = data.replace("pts_add_", "");
    db.pendingAddPoints[callbackQuery.from.id] = uid;
    saveDB(db);
    await editMsg(chatId, msgId, `➕ چند امتیاز به کاربر ${uid} اضافه کنم؟\n\nبنویسید: /addpoints ${uid} [عدد]`);

  } else if (data.startsWith("pts_rem_")) {
    const uid = data.replace("pts_rem_", "");
    await editMsg(chatId, msgId, `➖ برای کاهش امتیاز بنویسید:\n/removepoints ${uid} [عدد]`);

  } else if (data.startsWith("ban_")) {
    const uid = data.replace("ban_", "");
    if (db.banned[uid]) {
      delete db.banned[uid];
      saveDB(db);
      await editMsg(chatId, msgId, `✅ کاربر ${uid} آنبن شد.`);
    } else {
      db.banned[uid] = true;
      saveDB(db);
      await editMsg(chatId, msgId, `🚫 کاربر ${uid} بن شد.`);
    }
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
async function handleMessage(msg) {
  const db = loadDB();
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text || "";
  const username = msg.from?.username?.toLowerCase();
  const name = msg.from?.first_name || "کاربر";
  const uname = msg.from?.username || null;

  if (!userId || chatId < 0) return;

  // Check ban
  if (db.banned[userId]) return;

  // Register user
  getUser(db, userId, name, uname);

  // /start
  if (text.startsWith("/start")) {
    await handleStart(msg, db);
    return;
  }

  // /admin
  if (text === "/admin") {
    await handleAdminCommand(chatId, username, db);
    return;
  }

  // Admin text commands
  if (username === ADMIN_USERNAME) {
    const handled = await handleAdminTextCommands(msg, db);
    if (handled) return;
  }

  // Main keyboard buttons
  if (text === "دریافت اشتراک") {
    await handleSubscribe(chatId, userId, db);
  } else if (text === "دعوت دوستان") {
    await handleInvite(chatId, userId, db);
  } else if (text === "پروفایل") {
    await handleProfile(chatId, userId, db);
  } else if (text === "پشتیبانی") {
    await sendMsg(chatId, "فاقد ورودی!");
  } else if (text === "قوانین") {
    await sendMsg(chatId, rulesText());
  } else if (text === "راهنما") {
    await sendMsg(chatId, guideText(db));
  } else {
    // Show keyboard if no match
    if (!text.startsWith("/")) {
      await sendMsg(chatId, "❓ لطفاً از دکمه‌های زیر استفاده کنید:", { reply_markup: mainKeyboard() });
    }
  }
}

async function handleCallback(callbackQuery) {
  const db = loadDB();
  const data = callbackQuery.data || "";

  const adminCallbacks = [
    "admin_stats", "admin_users", "admin_broadcast", "admin_settings",
    "admin_add_config", "admin_points", "admin_cancel", "admin_back",
    "verify_membership", "show_invite"
  ];

  if (adminCallbacks.includes(data) || data === "verify_membership" || data === "show_invite") {
    await handleAdminCallback(callbackQuery, db);
  } else if (data.startsWith("pts_") || data.startsWith("ban_")) {
    await handleCallbackExtra(callbackQuery, db);
  } else {
    await api("answerCallbackQuery", { callback_query_id: callbackQuery.id });
  }
}

// ─── Poll Loop ────────────────────────────────────────────────────────────────
let offset = 0;

async function poll() {
  await getBotInfo();
  console.log("🤖 Bot started, polling...");

  while (true) {
    try {
      const data = await api("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
      if (!data.ok) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      for (const update of data.result) {
        offset = update.update_id + 1;
        try {
          if (update.message) await handleMessage(update.message);
          if (update.callback_query) await handleCallback(update.callback_query);
        } catch (e) {
          console.error("Handler error:", e.message);
        }
      }
    } catch (e) {
      console.error("Poll error:", e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

poll();
