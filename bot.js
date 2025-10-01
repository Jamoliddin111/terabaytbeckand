// bot.js
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch'); // axios o'rniga node-fetch

// Telegram Bot tokeni
const TELEGRAM_BOT_TOKEN = "8215208973:AAE8C3-Q1xvuVFTONfA8H3PYsEqZVwEI_hI";
const API_BASE_URL = 'http://localhost:3001/api';

// Botni yaratish
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Adminlar ro'yxati
const ADMINS = [6309363309]; // Admin user ID lari

// Mahsulot qo'shish boshlash
bot.onText(/\/addproduct/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!ADMINS.includes(msg.from.id)) {
    bot.sendMessage(chatId, '❌ Sizda bunday buyruqni bajarish huquqi yo\'q');
    return;
  }
  
  // Mahsulot qo'shish jarayoni
  bot.sendMessage(chatId, 'Yangi mahsulot qo\'shish uchun quyidagi formatda yuboring:\n\n' +
    'Nomi\n' +
    'Kategoriya (iphone, macbook, ipad, watch, airpods)\n' +
    'Narxi\n' +
    'Eski narxi (agar mavjud bo\'lsa)\n' +
    'Rasm URL\n' +
    'Belgi (Yangi, Chegirma, Top - agar mavjud bo\'lsa)\n' +
    'Tavsif\n\n' +
    'Har bir ma\'lumot yangi qatorda bo\'lishi kerak');
  
  // Foydalanuvchi holatini saqlash
  userStates[chatId] = { state: 'awaiting_product_data' };
});

// Foydalanuvchi holatlari
const userStates = {};

// Xabarlarni qayta ishlash
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (userStates[chatId] && userStates[chatId].state === 'awaiting_product_data') {
    // Ma'lumotlarni ajratib olish
    const lines = text.split('\n');
    
    if (lines.length >= 6) {
      const productData = {
        name: lines[0].trim(),
        category: lines[1].trim(),
        price: parseInt(lines[2].trim().replace(/\D/g, '')),
        oldPrice: lines[3].trim() ? parseInt(lines[3].trim().replace(/\D/g, '')) : null,
        image: lines[4].trim(),
        badge: lines[5].trim() || null,
        description: lines.slice(6).join('\n').trim()
      };
      
      try {
        // API ga so'rov yuborish (fetch bilan)
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });
        
        if (response.ok) {
          bot.sendMessage(chatId, '✅ Mahsulot muvaffaqiyatli qo\'shildi!');
          bot.sendPhoto(chatId, productData.image, {
            caption: `📦 ${productData.name}\n💰 ${productData.price.toLocaleString()} so'm\n${productData.description}`
          });
        } else {
          bot.sendMessage(chatId, '❌ Mahsulot qo\'shishda xato yuz berdi');
        }
      } catch (error) {
        console.error('Xato:', error);
        bot.sendMessage(chatId, '❌ Mahsulot qo\'shishda xato yuz berdi');
      }
      
      // Holatni tozalash
      delete userStates[chatId];
    } else {
      bot.sendMessage(chatId, '❌ Noto\'g\'ri format. Barcha ma\'lumotlarni to\'liq kiriting.');
    }
  }
});

// Mahsulotlarni ko'rish
bot.onText(/\/products/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    const products = await response.json();
    
    if (products.length === 0) {
      bot.sendMessage(chatId, 'Hozircha mahsulotlar mavjud emas');
      return;
    }
    
    let message = '📦 Barcha mahsulotlar:\n\n';
    products.forEach((product, index) => {
      message += `${index + 1}. ${product.name} - ${product.price.toLocaleString()} so'm\n`;
    });
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Xato:', error);
    bot.sendMessage(chatId, '❌ Mahsulotlarni olishda xato yuz berdi');
  }
});

console.log('Bot ishga tushdi...');