// server/src/routes/cart.js

const router = require('express').Router();
const Cart = require('../models/Cart'); // Savatcha modelini import qilish

// Savatchani session ID bo'yicha olish
router.get('/:sessionId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ sessionId: req.params.sessionId }).populate('items.product');
    if (!cart) {
      return res.status(404).json({ message: "Savatcha topilmadi" });
    }
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error });
  }
});

// ... savatchani yangilash, qo'shish, o'chirish uchun boshqa yo'nalishlar

module.exports = router;