const TOKEN = "8129620169:AAFVQHtaLUUBEayBm9msUS5hLQ2ng15MjUk";
const EMOJI_ID = "5416081784641168838";
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;

async function apiCall(method, params = {}) {
  const res = await fetch(`${BASE_URL}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  return data;
}

async function sendWithKeyboard(chatId) {
  const result = await apiCall("sendMessage", {
    chat_id: chatId,
    text: "سلام! 👋",
    reply_markup: {
      keyboard: [
        [
          {
            text: "دکمه",
            icon_custom_emoji_id: EMOJI_ID,
            style: "primary",
          },
        ],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  });

  if (result.ok) {
    console.log("✅ Reply keyboard sent!");
  } else {
    console.log("❌ Failed:", result.description);
  }
}

let offset = 0;

async function poll() {
  console.log("🤖 Bot started, polling...");
  while (true) {
    try {
      const data = await apiCall("getUpdates", {
        offset,
        timeout: 30,
      });

      if (!data.ok) {
        console.error("getUpdates error:", data.description);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      for (const update of data.result) {
        offset = update.update_id + 1;

        if (update.message) {
          const chatId = update.message.chat.id;
          console.log(`📩 Message from ${chatId}: ${update.message.text}`);
          await sendWithKeyboard(chatId);
        }

        if (update.callback_query) {
          await apiCall("answerCallbackQuery", {
            callback_query_id: update.callback_query.id,
          });
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

poll();
