// server/src/routes/admin.js

const router = require('express').Router();
// ... boshqa importlar

router.get('/user', (req, res) => {
  if (req.session.adminUser) {
    // Agar admin tizimga kirgan bo'lsa, foydalanuvchi ma'lumotlarini qaytarish
    res.json({ user: req.session.adminUser });
  } else {
    // Aks holda, 401 (ruxsat berilmagan) statusini yuborish
    res.status(401).json({ message: "Admin tizimga kirmagan" });
  }
});

// ... boshqa yo'nalishlar
module.exports = router;