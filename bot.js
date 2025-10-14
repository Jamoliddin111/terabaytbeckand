const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
require('dotenv').config();

const TOKEN = '8288603393:AAHogZO5EbmKzDtMNrXlHdsCpkF-I1BWARQ';
const CHANNEL_ID = '-1002884890106E';
const ADMIN_CHAT_ID = 'YOUR_ADMIN_CHAT_ID_HERE';
const bot = new TelegramBot(TOKEN, { polling: true });

// MongoDB connection
mongoose.connect('mongodb+srv://krafthr:20030303@cluster0.i9vnk0w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tlsAllowInvalidCertificates: true,
    retryWrites: true,
    w: 'majority',
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
});

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB ulanish muvaffaqiyatli!');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB xatolik:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB uzildi');
});

// User schema
const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true },
    language: { type: String, default: null },
    currentQuestion: { type: Number, default: 0 },
    responses: {
        position: String,
        fullName: String,
        birthDate: String,
        mobilePhone: String,
        additionalPhone: String,
        maritalStatus: String,
        address: String,
        criminalRecord: String,
        livingWithFamily: String,
        education: String,
        workExperience: String,
        previousSalary: String,
        shiftWork: String,
        allergies: String,
        physicalLimitations: String,
        confirmation: Boolean
    },
    completedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Savollar
const questions = {
    uzb: [
        "So'rovnomani qaysi bo'sh ish o'rniga topshirmoqchisiz?",
        "Familiyangiz, Ismingiz, Sharifingiz:",
        "Tug'ilgan sanangiz (DD.MM.YYYY formatida):",
        "Mobil telefon raqami:",
        "Qo'shimcha telefon raqami (ixtiyoriy):",
        "Oilaviy holatingiz:",
        "Yashash manzilingiz:",
        "Sudlanganlikning mavjudligi:",
        "Toshkentda oilangiz bilan birga yashaysizmi?",
        "O'quv muassasasi:",
        "Mehnat faoliyati (eng oxirgi tajriba):",
        "Oldingi ish joyingizdagi maoshingiz:",
        "Smenali ishga munosabatingiz:",
        "Changga yoki kraskaga allergiyangiz bormi?",
        "Yuk ko'tarishni talab qiluvchi ishlarni bajarishingizga to'sqinlik qiladigan holatlaringiz bormi?",
        "Anketani tasdiqlaysizmi?"
    ],
    rus: [
        "На какую вакантную должность Вы подаёте анкету?",
        "Фамилия, Имя, Отчество:",
        "Дата рождения (в формате ДД.ММ.ГГГГ):",
        "Мобильный телефон:",
        "Дополнительный телефон (необязательно):",
        "Семейное положение:",
        "Адрес проживания:",
        "Наличие судимости:",
        "Вы проживаете в Ташкенте вместе с семьёй?",
        "Учебное заведение:",
        "Трудовая деятельность (самый актуальный опыт):",
        "Ваша заработная плата на предыдущем месте работы:",
        "Отношение к работе по сменам:",
        "У вас есть аллергия на пыль или краску?",
        "Есть ли у вас ограничения для работы, связанной с подъёмом грузов?",
        "Подтверждаете анкету?"
    ]
};

// Javoblar variantlari
const answerOptions = {
    uzb: {
        position: ['Stanok operator', 'Qadoqlovchi'],
        maritalStatus: ['Oilali', 'Oila qurmagan', 'Ajrashgan'],
        yesNo: ['Ha', "Yo'q"],
        education: ["O'qimayman", "Universitetda o'qiman", "Maktabda o'qiman", "Universitetni bitirganman"],
        shiftWork: ['Roziman', 'Noroziman', 'Faqat noch ishlay olaman', 'Faqat kun ishlay olaman', 'Ikkala smenada ham ishlay olaman'],
        confirmation: ['Tasdiqlayman', 'Tasdiqlamayman']
    },
    rus: {
        position: ['Оператор станка', 'Упаковщица'],
        maritalStatus: ['Женат/замужем', 'Холост/не замужем', 'Разведён(а)'],
        yesNo: ['Да', 'Нет'],
        education: ['Не учусь', 'Учусь в университете', 'Учусь в школе', 'Окончил(а) университет'],
        shiftWork: ['Согласен(на)', 'Не согласен(на)', 'Могу работать только ночью', 'Могу работать только днём', 'Могу работать в обе смены'],
        confirmation: ['Подтверждаю', 'Не подтверждаю']
    }
};

// Klaviatura yaratish funksiyasi
function getKeyboard(questionIndex, language) {
    const keyboards = {
        0: { // Lavozim
            uzb: [[{ text: '1️⃣ Stanok operator', callback_data: '1' }], [{ text: '2️⃣ Qadoqlovchi', callback_data: '2' }]],
            rus: [[{ text: '1️⃣ Оператор станка', callback_data: '1' }], [{ text: '2️⃣ Упаковщица', callback_data: '2' }]]
        },
        5: { // Oilaviy holat
            uzb: [[{ text: '1️⃣ Oilali', callback_data: '1' }], [{ text: '2️⃣ Oila qurmagan', callback_data: '2' }], [{ text: '3️⃣ Ajrashgan', callback_data: '3' }]],
            rus: [[{ text: '1️⃣ Женат/замужем', callback_data: '1' }], [{ text: '2️⃣ Холост/не замужем', callback_data: '2' }], [{ text: '3️⃣ Разведён(а)', callback_data: '3' }]]
        },
        7: { // Sudlanganlik
            uzb: [[{ text: '1️⃣ Ha', callback_data: '1' }, { text: '2️⃣ Yo\'q', callback_data: '2' }]],
            rus: [[{ text: '1️⃣ Да', callback_data: '1' }, { text: '2️⃣ Нет', callback_data: '2' }]]
        },
        8: { // Oila bilan yashash
            uzb: [[{ text: '1️⃣ Ha', callback_data: '1' }, { text: '2️⃣ Yo\'q', callback_data: '2' }]],
            rus: [[{ text: '1️⃣ Да', callback_data: '1' }, { text: '2️⃣ Нет', callback_data: '2' }]]
        },
        9: { // Ta'lim
            uzb: [[{ text: '1️⃣ O\'qimayman', callback_data: '1' }], [{ text: '2️⃣ Universitetda o\'qiman', callback_data: '2' }], [{ text: '3️⃣ Maktabda o\'qiman', callback_data: '3' }], [{ text: '4️⃣ Universitetni bitirganman', callback_data: '4' }]],
            rus: [[{ text: '1️⃣ Не учусь', callback_data: '1' }], [{ text: '2️⃣ Учусь в университете', callback_data: '2' }], [{ text: '3️⃣ Учусь в школе', callback_data: '3' }], [{ text: '4️⃣ Окончил(а) университет', callback_data: '4' }]]
        },
        12: { // Smena ishi
            uzb: [[{ text: '1️⃣ Roziman', callback_data: '1' }], [{ text: '2️⃣ Noroziman', callback_data: '2' }], [{ text: '3️⃣ Faqat noch ishlay olaman', callback_data: '3' }], [{ text: '4️⃣ Faqat kun ishlay olaman', callback_data: '4' }], [{ text: '5️⃣ Ikkala smenada ham ishlay olaman', callback_data: '5' }]],
            rus: [[{ text: '1️⃣ Согласен(на)', callback_data: '1' }], [{ text: '2️⃣ Не согласен(на)', callback_data: '2' }], [{ text: '3️⃣ Могу работать только ночью', callback_data: '3' }], [{ text: '4️⃣ Могу работать только днём', callback_data: '4' }], [{ text: '5️⃣ Могу работать в обе смены', callback_data: '5' }]]
        },
        13: { // Allergiya
            uzb: [[{ text: '1️⃣ Ha', callback_data: '1' }, { text: '2️⃣ Yo\'q', callback_data: '2' }]],
            rus: [[{ text: '1️⃣ Да', callback_data: '1' }, { text: '2️⃣ Нет', callback_data: '2' }]]
        },
        14: { // Jismoniy cheklov
            uzb: [[{ text: '1️⃣ Ha', callback_data: '1' }, { text: '2️⃣ Yo\'q', callback_data: '2' }]],
            rus: [[{ text: '1️⃣ Да', callback_data: '1' }, { text: '2️⃣ Нет', callback_data: '2' }]]
        },
        15: { // Tasdiqlash
            uzb: [[{ text: '✅ Tasdiqlayman', callback_data: '1' }], [{ text: '❌ Tasdiqlamayman', callback_data: '2' }]],
            rus: [[{ text: '✅ Подтверждаю', callback_data: '1' }], [{ text: '❌ Не подтверждаю', callback_data: '2' }]]
        }
    };

    return keyboards[questionIndex] ? keyboards[questionIndex][language] : null;
}

// Bot ishga tushganda
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        let user = await User.findOne({ telegramId: userId });
        if (!user) {
            user = new User({ telegramId: userId });
            await user.save();
        }

        const welcomeMessage = `🇺🇿 **Tilni tanlang** / 🇷🇺 **Выберите язык**`;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🇺🇿 O\'zbekcha', callback_data: 'lang_uzb' }],
                [{ text: '🇷🇺 Русский', callback_data: 'lang_rus' }]
            ]
        };

        bot.sendMessage(chatId, welcomeMessage, { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    } catch (error) {
        console.error('Start error:', error);
        bot.sendMessage(chatId, 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
});

// Callback query handler (tugmalar bosilganda)
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
        let user = await User.findOne({ telegramId: userId });
        if (!user) {
            user = new User({ telegramId: userId });
            await user.save();
        }

        // Til tanlash
        if (data === 'lang_uzb' || data === 'lang_rus') {
            user.language = data === 'lang_uzb' ? 'uzb' : 'rus';
            user.currentQuestion = 0;
            await user.save();

            bot.answerCallbackQuery(query.id);
            
            const warningMessage = user.language === 'uzb' ? 
                "⚠️ **DIQQAT:**\nSizning nomzodingizni ko'rib chiqish uchun so'rovnomani to'liq va to'g'ri to'ldirishingiz zarur. Agar sizning nomzodingiz bizni qiziqtirsa, 3 ish kuni ichida siz bilan bog'lanamiz.\n\n" :
                "⚠️ **ВНИМАНИЕ:**\nДля рассмотрения вашей кандидатуры необходимо полностью и корректно заполнить анкету. В случае заинтересованности в вашей кандидатуре, мы свяжемся с вами в течение 3 рабочих дней.\n\n";

            const keyboard = getKeyboard(0, user.language);
            
            bot.sendMessage(chatId, warningMessage + questions[user.language][0], { 
                parse_mode: 'Markdown',
                reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
            });
            return;
        }

        // Savollarga javob
        const currentQ = user.currentQuestion;
        const text = data;

        // Javobni saqlash
        switch (currentQ) {
            case 0:
                if (['1', '2'].includes(text)) {
                    user.responses.position = answerOptions[user.language].position[parseInt(text) - 1];
                } else return;
                break;
            case 5:
                if (['1', '2', '3'].includes(text)) {
                    user.responses.maritalStatus = answerOptions[user.language].maritalStatus[parseInt(text) - 1];
                } else return;
                break;
            case 7:
            case 8:
                if (['1', '2'].includes(text)) {
                    const value = answerOptions[user.language].yesNo[parseInt(text) - 1];
                    if (currentQ === 7) user.responses.criminalRecord = value;
                    if (currentQ === 8) user.responses.livingWithFamily = value;
                } else return;
                break;
            case 9:
                if (['1', '2', '3', '4'].includes(text)) {
                    user.responses.education = answerOptions[user.language].education[parseInt(text) - 1];
                } else return;
                break;
            case 12:
                if (['1', '2', '3', '4', '5'].includes(text)) {
                    user.responses.shiftWork = answerOptions[user.language].shiftWork[parseInt(text) - 1];
                } else return;
                break;
            case 13:
            case 14:
                if (['1', '2'].includes(text)) {
                    const value = answerOptions[user.language].yesNo[parseInt(text) - 1];
                    if (currentQ === 13) user.responses.allergies = value;
                    if (currentQ === 14) user.responses.physicalLimitations = value;
                } else return;
                break;
            case 15:
                if (['1', '2'].includes(text)) {
                    user.responses.confirmation = text === '1';
                    if (text === '1') {
                        user.completedAt = new Date();
                        await user.save();
                        
                        const summaryMessage = user.language === 'uzb' ? 
                            '✅ **Anketa muvaffaqiyatli to\'ldirildi!**\n\nSizning ma\'lumotlaringiz qayta ko\'rib chiqiladi va agar nomzodingiz bizni qiziqtirsa, 3 ish kuni ichida siz bilan bog\'lanamiz.\n\nRahmat!' :
                            '✅ **Анкета успешно заполнена!**\n\nВаши данные будут рассмотрены и в случае заинтересованности в вашей кандидатуре, мы свяжемся с вами в течение 3 рабочих дней.\n\nСпасибо!';
                        
                        bot.answerCallbackQuery(query.id);
                        bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' });
                        await sendToChannel(user);
                        console.log('Yangi anketa to\'ldirildi:', user.responses);
                        return;
                    } else {
                        const rejectionMessage = user.language === 'uzb' ?
                            'Anketa tasdiqlanmadi. Qaytadan boshlash uchun /start buyrug\'ini yuboring.' :
                            'Анкета не подтверждена. Для повторного заполнения отправьте команду /start.';
                        
                        bot.answerCallbackQuery(query.id);
                        bot.sendMessage(chatId, rejectionMessage);
                        
                        user.language = null;
                        user.currentQuestion = 0;
                        user.responses = {};
                        await user.save();
                        return;
                    }
                } else return;
                break;
        }

        user.currentQuestion++;
        await user.save();

        bot.answerCallbackQuery(query.id);

        // Keyingi savolni yuborish
        if (user.currentQuestion < questions[user.language].length) {
            const keyboard = getKeyboard(user.currentQuestion, user.language);
            
            bot.sendMessage(chatId, questions[user.language][user.currentQuestion], {
                reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
            });
        }

    } catch (error) {
        console.error('Callback query error:', error);
        bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi' });
    }
});

// Xabarlarni qayta ishlash (matn kiritish kerak bo'lganda)
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
        let user = await User.findOne({ telegramId: userId });
        if (!user || !user.language) return;

        const currentQ = user.currentQuestion;
        
        // Faqat matn kiritish kerak bo'lgan savollar uchun
        const textInputQuestions = [1, 2, 3, 4, 6, 10, 11];
        
        if (!textInputQuestions.includes(currentQ)) return;

        // Javobni saqlash
        switch (currentQ) {
            case 1:
                user.responses.fullName = text;
                break;
            case 2:
                if (!/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
                    const errorMsg = user.language === 'uzb' ? 
                        'Iltimos, DD.MM.YYYY formatida kiriting (masalan: 15.03.1990)' : 
                        'Пожалуйста, введите в формате ДД.ММ.ГГГГ (например: 15.03.1990)';
                    bot.sendMessage(chatId, errorMsg);
                    return;
                }
                user.responses.birthDate = text;
                break;
            case 3:
                if (!/^\+?\d{9,15}$/.test(text.replace(/\s/g, ''))) {
                    const errorMsg = user.language === 'uzb' ? 
                        'Iltimos, to\'g\'ri telefon raqam kiriting' : 
                        'Пожалуйста, введите корректный номер телефона';
                    bot.sendMessage(chatId, errorMsg);
                    return;
                }
                user.responses.mobilePhone = text;
                break;
            case 4:
                user.responses.additionalPhone = text;
                break;
            case 6:
                user.responses.address = text;
                break;
            case 10:
                user.responses.workExperience = text;
                break;
            case 11:
                user.responses.previousSalary = text;
                break;
        }

        user.currentQuestion++;
        await user.save();

        // Keyingi savolni yuborish
        if (user.currentQuestion < questions[user.language].length) {
            const keyboard = getKeyboard(user.currentQuestion, user.language);
            
            bot.sendMessage(chatId, questions[user.language][user.currentQuestion], {
                reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
            });
        }

    } catch (error) {
        console.error('Message handling error:', error);
        bot.sendMessage(chatId, 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
});

// Kanalga anketa yuborish funksiyasi
async function sendToChannel(user) {
    try {
        const responses = user.responses;
        
        const channelMessage = user.language === 'uzb' ? `
🆕 **YANGI ANKETA**

👤 **F.I.O:** ${responses.fullName}
💼 **Lavozim:** ${responses.position}
📅 **Tug'ilgan sana:** ${responses.birthDate}
📱 **Telefon:** ${responses.mobilePhone}
${responses.additionalPhone ? `📞 **Qo'shimcha tel:** ${responses.additionalPhone}` : ''}
💍 **Oilaviy holat:** ${responses.maritalStatus}
🏠 **Manzil:** ${responses.address}
⚖️ **Sudlanganlik:** ${responses.criminalRecord}
🏘️ **Oila bilan yashaydi:** ${responses.livingWithFamily}
📚 **Ta'lim:** ${responses.education}
💼 **Ish tajribasi:** ${responses.workExperience}
💰 **Oldingi maosh:** ${responses.previousSalary}
⏰ **Smena ishi:** ${responses.shiftWork}
🤧 **Allergiya:** ${responses.allergies}
🏋️ **Jismoniy cheklov:** ${responses.physicalLimitations}

📊 **ID:** #${user._id.toString().slice(-6)}
🕐 **Vaqt:** ${user.completedAt.toLocaleString('uz-UZ')}
        ` : `
🆕 **НОВАЯ АНКЕТА**

👤 **Ф.И.О:** ${responses.fullName}
💼 **Должность:** ${responses.position}
📅 **Дата рождения:** ${responses.birthDate}
📱 **Телефон:** ${responses.mobilePhone}
${responses.additionalPhone ? `📞 **Доп. телефон:** ${responses.additionalPhone}` : ''}
💍 **Семейное положение:** ${responses.maritalStatus}
🏠 **Адрес:** ${responses.address}
⚖️ **Судимость:** ${responses.criminalRecord}
🏘️ **Проживает с семьёй:** ${responses.livingWithFamily}
📚 **Образование:** ${responses.education}
💼 **Опыт работы:** ${responses.workExperience}
💰 **Предыдущая зарплата:** ${responses.previousSalary}
⏰ **Сменная работа:** ${responses.shiftWork}
🤧 **Аллергия:** ${responses.allergies}
🏋️ **Физические ограничения:** ${responses.physicalLimitations}

📊 **ID:** #${user._id.toString().slice(-6)}
🕐 **Время:** ${user.completedAt.toLocaleString('ru-RU')}
        `;

        await bot.sendMessage(CHANNEL_ID, channelMessage, { parse_mode: 'Markdown' });
        console.log('Kanalga yuborildi:', user.telegramId);
        
    } catch (error) {
        console.error('Kanalga yuborishda xatolik:', error);
        if (ADMIN_CHAT_ID && ADMIN_CHAT_ID !== 'YOUR_ADMIN_CHAT_ID_HERE') {
            try {
                await bot.sendMessage(ADMIN_CHAT_ID, `❌ Kanalga yuborishda xatolik:\n${error.message}`);
            } catch (adminError) {
                console.error('Admin ga xabar yuborishda xatolik:', adminError);
            }
        }
    }
}

// Admin komandasi
bot.onText(/\/admin_surveys/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const surveys = await User.find({ completedAt: { $ne: null } }).sort({ completedAt: -1 });
        
        if (surveys.length === 0) {
            bot.sendMessage(chatId, 'Hozircha hech qanday anketa to\'ldirilmagan.');
            return;
        }

        for (const survey of surveys) {
            const summary = `
📋 **Anketa #${survey._id.toString().slice(-6)}**
👤 **F.I.O:** ${survey.responses.fullName}
💼 **Lavozim:** ${survey.responses.position}
📱 **Telefon:** ${survey.responses.mobilePhone}
📅 **Tug'ilgan sana:** ${survey.responses.birthDate}
🏠 **Manzil:** ${survey.responses.address}
📚 **Ta'lim:** ${survey.responses.education}
💰 **Oldingi maosh:** ${survey.responses.previousSalary}
⏰ **To'ldirilgan vaqt:** ${survey.completedAt.toLocaleString('uz-UZ')}
            `;
            
            await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
        }
        
    } catch (error) {
        console.error('Admin surveys error:', error);
        bot.sendMessage(chatId, 'Xatolik yuz berdi.');
    }
});

bot.onText(/\/reset/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        await User.deleteOne({ telegramId: userId });
        bot.sendMessage(chatId, '🔄 Ma\'lumotlaringiz tozalandi. Qaytadan /start buyrug\'ini yuboring.');
    } catch (error) {
        console.error('Reset error:', error);
        bot.sendMessage(chatId, 'Xatolik yuz berdi.');
    }
});

bot.onText(/\/get_id/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Sizning chat ID: \`${chatId}\``, { parse_mode: 'Markdown' });
});

bot.onText(/\/db_status/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const dbState = mongoose.connection.readyState;
        const states = {
            0: '❌ Uzilgan',
            1: '✅ Ulangan', 
            2: '🔄 Ulanmoqda',
            3: '⚠️ Uzilmoqda'
        };
        
        const userCount = await User.countDocuments();
        const completedSurveys = await User.countDocuments({ completedAt: { $ne: null } });
        
        const statusMessage = `
📊 **DATABASE HOLATI**

🔗 **Ulanish:** ${states[dbState]}
👥 **Jami foydalanuvchilar:** ${userCount}
✅ **Tugallangan anketalar:** ${completedSurveys}
📝 **Jarayonda:** ${userCount - completedSurveys}

🕐 **Server vaqti:** ${new Date().toLocaleString('uz-UZ')}
        `;
        
        bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Database status error:', error);
        bot.sendMessage(chatId, `❌ Xatolik: ${error.message}`);
    }
});

bot.onText(/\/test_channel/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const testMessage = `🧪 **Test xabar**\n\nBu xabar bot tomonidan yuborildi.\nVaqt: ${new Date().toLocaleString('uz-UZ')}`;
        
        await bot.sendMessage(CHANNEL_ID, testMessage, { parse_mode: 'Markdown' });
        bot.sendMessage(chatId, '✅ Kanalga test xabar yuborildi!');
        
    } catch (error) {
        console.error('Test channel error:', error);
        bot.sendMessage(chatId, `❌ Xatolik: ${error.message}`);
    }
});

bot.onText(/\/test_db/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const testUser = new User({ 
            telegramId: 999999999,
            language: 'test'
        });
        
        await testUser.save();
        const foundUser = await User.findOne({ telegramId: 999999999 });
        if (foundUser) {
            await User.deleteOne({ telegramId: 999999999 });
            bot.sendMessage(chatId, '✅ MongoDB muvaffaqiyatli ishlayapti!');
        }
        
    } catch (error) {
        console.error('❌ MongoDB test xatoligi:', error);
        bot.sendMessage(chatId, `❌ MongoDB xatolik:\n${error.message}`);
    }
});

bot.onText(/\/clear_all/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        await User.deleteMany({});
        bot.sendMessage(chatId, '🗑️ Barcha foydalanuvchi ma\'lumotlari tozalandi.');
    } catch (error) {
        console.error('Clear all error:', error);
        bot.sendMessage(chatId, 'Xatolik yuz berdi.');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Bot to\'xtatilmoqda...');
    bot.stopPolling();
    mongoose.connection.close();
    process.exit(0);
});


// // bot.js
// const TelegramBot = require('node-telegram-bot-api');
// const fetch = require('node-fetch'); // axios o'rniga node-fetch

// // Telegram Bot tokeni
// const TELEGRAM_BOT_TOKEN = "8215208973:AAE8C3-Q1xvuVFTONfA8H3PYsEqZVwEI_hI";
// const API_BASE_URL = 'http://localhost:3001/api';

// // Botni yaratish
// const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// // Adminlar ro'yxati
// const ADMINS = [6309363309]; // Admin user ID lari

// // Mahsulot qo'shish boshlash
// bot.onText(/\/addproduct/, (msg) => {
//   const chatId = msg.chat.id;
  
//   if (!ADMINS.includes(msg.from.id)) {
//     bot.sendMessage(chatId, '❌ Sizda bunday buyruqni bajarish huquqi yo\'q');
//     return;
//   }
  
//   // Mahsulot qo'shish jarayoni
//   bot.sendMessage(chatId, 'Yangi mahsulot qo\'shish uchun quyidagi formatda yuboring:\n\n' +
//     'Nomi\n' +
//     'Kategoriya (iphone, macbook, ipad, watch, airpods)\n' +
//     'Narxi\n' +
//     'Eski narxi (agar mavjud bo\'lsa)\n' +
//     'Rasm URL\n' +
//     'Belgi (Yangi, Chegirma, Top - agar mavjud bo\'lsa)\n' +
//     'Tavsif\n\n' +
//     'Har bir ma\'lumot yangi qatorda bo\'lishi kerak');
  
//   // Foydalanuvchi holatini saqlash
//   userStates[chatId] = { state: 'awaiting_product_data' };
// });

// // Foydalanuvchi holatlari
// const userStates = {};

// // Xabarlarni qayta ishlash
// bot.on('message', async (msg) => {
//   const chatId = msg.chat.id;
//   const text = msg.text;
  
//   if (userStates[chatId] && userStates[chatId].state === 'awaiting_product_data') {
//     // Ma'lumotlarni ajratib olish
//     const lines = text.split('\n');
    
//     if (lines.length >= 6) {
//       const productData = {
//         name: lines[0].trim(),
//         category: lines[1].trim(),
//         price: parseInt(lines[2].trim().replace(/\D/g, '')),
//         oldPrice: lines[3].trim() ? parseInt(lines[3].trim().replace(/\D/g, '')) : null,
//         image: lines[4].trim(),
//         badge: lines[5].trim() || null,
//         description: lines.slice(6).join('\n').trim()
//       };
      
//       try {
//         // API ga so'rov yuborish (fetch bilan)
//         const response = await fetch(`${API_BASE_URL}/products`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify(productData)
//         });
        
//         if (response.ok) {
//           bot.sendMessage(chatId, '✅ Mahsulot muvaffaqiyatli qo\'shildi!');
//           bot.sendPhoto(chatId, productData.image, {
//             caption: `📦 ${productData.name}\n💰 ${productData.price.toLocaleString()} so'm\n${productData.description}`
//           });
//         } else {
//           bot.sendMessage(chatId, '❌ Mahsulot qo\'shishda xato yuz berdi');
//         }
//       } catch (error) {
//         console.error('Xato:', error);
//         bot.sendMessage(chatId, '❌ Mahsulot qo\'shishda xato yuz berdi');
//       }
      
//       // Holatni tozalash
//       delete userStates[chatId];
//     } else {
//       bot.sendMessage(chatId, '❌ Noto\'g\'ri format. Barcha ma\'lumotlarni to\'liq kiriting.');
//     }
//   }
// });

// // Mahsulotlarni ko'rish
// bot.onText(/\/products/, async (msg) => {
//   const chatId = msg.chat.id;
  
//   try {
//     const response = await fetch(`${API_BASE_URL}/products`);
//     const products = await response.json();
    
//     if (products.length === 0) {
//       bot.sendMessage(chatId, 'Hozircha mahsulotlar mavjud emas');
//       return;
//     }
    
//     let message = '📦 Barcha mahsulotlar:\n\n';
//     products.forEach((product, index) => {
//       message += `${index + 1}. ${product.name} - ${product.price.toLocaleString()} so'm\n`;
//     });
    
//     bot.sendMessage(chatId, message);
//   } catch (error) {
//     console.error('Xato:', error);
//     bot.sendMessage(chatId, '❌ Mahsulotlarni olishda xato yuz berdi');
//   }
// });

// console.log('Bot ishga tushdi...');