
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './.env' });
// require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS sozlamasi
const corsOptions = {
  origin: 'https://terabayt24-7.uz',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

if (!fs.existsSync('uploads/hero')) {
  fs.mkdirSync('uploads/hero', { recursive: true });
}

if (!fs.existsSync('uploads/products')) {
  fs.mkdirSync('uploads/products', { recursive: true });
}

app.use('/uploads', express.static('uploads'));

// Multer konfiguratsiyasi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = file.fieldname === 'heroImage' ? 'uploads/hero/' : 'uploads/products/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'heroImage' ? 'hero-' : 'product-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari ruxsat etiladi'), false);
    }
  }
});

// MongoDB diagnostika
console.log('🔍 MongoDB diagnostika...');
console.log('📍 MONGODB_URI:', process.env.MONGODB_URI ? 'Mavjud' : 'Yo\'q');
console.log('📍 NODE_ENV:', process.env.NODE_ENV || 'development');

// MongoDB URI
// const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/terabayt';
// console.log('🔗 MongoDB URI:', mongoUri);
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is missing!');
  process.exit(1); // Dasturni to‘xtating, agar URI yo‘q bo‘lsa
}
const mongoUri = process.env.MONGODB_URI; // Faqat .env dan oling
console.log('🔗 MongoDB URI:', mongoUri);

// MongoDB ga ulanish
const connectDB = async () => {
  try {
    // Buffer commands ni o'chirish
    mongoose.set('bufferCommands', false);
    
    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      connectTimeoutMS: 30000,
    };

    console.log('🔗 MongoDB ga ulanmoqda...');
    await mongoose.connect(mongoUri, mongooseOptions);
    
    console.log('✅ MongoDB muvaffaqiyatli ulandi!');
    console.log('📊 Connection state:', mongoose.connection.readyState);
    console.log('📍 Database name:', mongoose.connection.name);
    
    // Data initialization
    await initializeData();
    
    // Server start
    startServer();
    
  } catch (err) {
    console.error('❌ MongoDB ulanish xatosi:', err.message);
    console.error('💡 MongoDB container ishlayotganini tekshiring: docker ps');
    console.error('💡 Port 27017 ochiq ekanligini tekshiring');
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB ulanish tiklandi');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB xatosi:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.error('🔌 MongoDB ulanish uzildi');
});

// === SCHEMAS ===
const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Mahsulot nomi kerak'] },
  category: { 
    type: String, 
    required: [true, 'Kategoriya kerak'], 
    enum: {
      values: ['iphone', 'macbook', 'airpods', 'watch', 'ipad'],
      message: 'Noto\'g\'ri kategoriya'
    }
  },
  price: { 
    type: Number, 
    required: [true, 'Narx kerak'], 
    min: [0, 'Narx manfiy bo\'lishi mumkin emas']
  },
  oldPrice: { type: Number, min: [0, 'Eski narx manfiy bo\'lishi mumkin emas'] },
  image: { 
    type: String, 
    required: [true, 'Rasm kerak'], 
    match: [/^https?:\/\/|\/uploads\//, 'Noto\'g\'ri rasm URL']
  },
  badge: { type: String, maxlength: [20, 'Badge 20 belgidan oshmasligi kerak'] },
  description: { type: String, maxlength: [500, 'Tavsif 500 belgidan oshmasligi kerak'] },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Product = mongoose.model('Product', productSchema);

const heroSlideSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Sarlavha kerak'], 
    trim: true,
    maxlength: [100, 'Sarlavha 100 belgidan oshmasligi kerak']
  },
  subtitle: { 
    type: String, 
    required: [true, 'Pastki matn kerak'], 
    trim: true,
    maxlength: [200, 'Pastki matn 200 belgidan oshmasligi kerak']
  },
  image: { 
    type: String, 
    required: [true, 'Rasm kerak'], 
    trim: true,
    match: [/^https?:\/\/|\/uploads\//, 'Noto\'g\'ri rasm URL formati']
  },
  order: { 
    type: Number, 
    default: 0, 
    min: [0, 'Tartib raqami manfiy bo\'lishi mumkin emas']
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

heroSlideSchema.index({ isActive: 1, order: 1 });
heroSlideSchema.index({ createdAt: -1 });

heroSlideSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);

// === INITIALIZATION ===
const initializeData = async () => {
  try {
    console.log('🔄 Database initialization...');
    
    // Products
    const productCount = await Product.countDocuments({ isActive: true });
    console.log(`📦 Mavjud mahsulotlar: ${productCount}`);
    
    if (productCount === 0) {
      console.log('📦 Default products yaratilmoqda...');
      const defaultProducts = [
        { 
          name: "iPhone 16 Pro", 
          category: "iphone", 
          price: 12990000, 
          oldPrice: 13990000, 
          image: "https://images.unsplash.com/photo-1592899677979-23fc1399db67?w=800&h=600&fit=crop", 
          badge: "Yangi", 
          description: "A18 Pro chip, Pro camera system, Action Button" 
        },
        { 
          name: "iPhone 16", 
          category: "iphone", 
          price: 9990000, 
          image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop", 
          description: "A18 chip, Advanced dual-camera system" 
        },
        { 
          name: "MacBook Pro 14\"", 
          category: "macbook", 
          price: 21990000, 
          oldPrice: 23990000, 
          image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop", 
          badge: "Chegirma", 
          description: "M3 Pro chip, 14.2-inch Liquid Retina XDR display" 
        },
        { 
          name: "iPad Pro", 
          category: "ipad", 
          price: 1990000, 
          image: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&h=600&fit=crop" 
        },
        { 
          name: "Apple Watch Ultra 2", 
          category: "watch", 
          price: 7990000, 
          oldPrice: 8990000, 
          image: "https://images.unsplash.com/photo-1524592094714-0f0652a74e95?w=800&h=600&fit=crop", 
          badge: "Yangi" 
        },
        { 
          name: "AirPods Pro 2", 
          category: "airpods", 
          price: 2490000, 
          image: "https://images.unsplash.com/photo-1579586144249-f12c90ee2154?w=800&h=600&fit=crop" 
        }
      ];
      
      await Product.insertMany(defaultProducts);
      console.log('✅ Default products created:', defaultProducts.length);
    }

    // Hero Slides
    const heroCount = await HeroSlide.countDocuments({ isActive: true });
    console.log(`🎨 Mavjud hero slides: ${heroCount}`);
    
    if (heroCount === 0) {
      console.log('🎨 Default hero slides yaratilmoqda...');
      const defaultHeroSlides = [
        {
          title: 'iPhone Air',
          subtitle: 'Скоро в продаже.',
          image: 'https://images.unsplash.com/photo-1592899677979-23fc1399db67?ixlib=rb-4.0.3&w=1920&h=1080&fit=crop',
          order: 1,
          isActive: true
        },
        {
          title: 'iPhone 16 Pro',
          subtitle: 'The ultimate iPhone.',
          image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?ixlib=rb-4.0.3&w=1920&h=1080&fit=crop',
          order: 2,
          isActive: true
        },
        {
          title: 'MacBook Pro',
          subtitle: 'Supercharged by M4.',
          image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&w=1920&h=1080&fit=crop',
          order: 3,
          isActive: true
        }
      ];
      
      await HeroSlide.insertMany(defaultHeroSlides);
      console.log('✅ Default hero slides created:', defaultHeroSlides.length);
    }

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// === ERROR HANDLER ===
const errorHandler = (err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Validatsiya xatosi', 
      errors 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      message: 'Noto\'g\'ri ID formati' 
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({ 
      message: 'Bu ma\'lumot allaqachon mavjud' 
    });
  }
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Rasm hajmi 10MB dan kichik bo\'lishi kerak' });
    }
    return res.status(400).json({ message: 'Rasm yuklashda xato' });
  }
  
  res.status(500).json({ 
    message: 'Server ichki xatosi',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// === API ROUTES ===
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongoose: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: '✅ Backend ishlayapti!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'terabayt',
    port: PORT,
    mongoose: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uri: mongoUri
  });
});

// Hero Slides endpoints
app.get('/api/hero-slides', async (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const isActiveOnly = activeOnly === 'true';
    const query = isActiveOnly ? { isActive: true } : {};
    
    const slides = await HeroSlide.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    
    res.json(slides);
  } catch (error) {
    console.error('❌ Hero slides error:', error);
    res.status(500).json({ message: 'Hero slaydlarni yuklashda xato' });
  }
});

app.get('/api/hero-slides/:id', async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id).lean();
    
    if (!slide) {
      return res.status(404).json({ message: 'Hero slayd topilmadi' });
    }
    
    res.json(slide);
  } catch (error) {
    console.error('❌ Single hero slide error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }
    res.status(500).json({ message: 'Hero slayd yuklashda xato' });
  }
});

app.post('/api/hero-slides', async (req, res) => {
  try {
    const { title, subtitle, image, order = 0, isActive = true } = req.body;
    
    if (!title || !subtitle || !image) {
      return res.status(400).json({ 
        message: 'Sarlavha, pastki matn va rasm majburiy' 
      });
    }
    
    const existingSlide = await HeroSlide.findOne({ 
      order: parseInt(order), 
      isActive: true 
    });
    
    if (existingSlide) {
      await HeroSlide.updateMany(
        { order: { $gte: parseInt(order) } },
        { $inc: { order: 1 } }
      );
    }
    
    const slide = new HeroSlide({
      title: title.trim(),
      subtitle: subtitle.trim(),
      image: image.trim(),
      order: parseInt(order),
      isActive: Boolean(isActive)
    });
    
    const savedSlide = await slide.save();
    
    res.status(201).json({ 
      message: 'Hero slayd muvaffaqiyatli qo\'shildi', 
      slide: savedSlide 
    });
  } catch (error) {
    console.error('❌ Hero slide creation error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        message: 'Validatsiya xatosi', 
        errors 
      });
    }
    
    res.status(500).json({ message: 'Hero slayd qo\'shishda xato' });
  }
});

app.put('/api/hero-slides/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image, order, isActive } = req.body;
    
    if (!title || !subtitle || !image) {
      return res.status(400).json({ 
        message: 'Sarlavha, pastki matn va rasm majburiy' 
      });
    }
    
    const existingSlide = await HeroSlide.findById(id);
    if (!existingSlide) {
      return res.status(404).json({ message: 'Hero slayd topilmadi' });
    }
    
    if (order !== undefined && order !== existingSlide.order) {
      const newOrder = parseInt(order);
      const oldOrder = existingSlide.order;
      
      if (newOrder < oldOrder) {
        await HeroSlide.updateMany(
          { order: { $gte: newOrder, $lt: oldOrder }, _id: { $ne: id } },
          { $inc: { order: 1 } }
        );
      } else if (newOrder > oldOrder) {
        await HeroSlide.updateMany(
          { order: { $gt: oldOrder, $lte: newOrder }, _id: { $ne: id } },
          { $inc: { order: -1 } }
        );
      }
    }
    
    const updatedSlide = await HeroSlide.findByIdAndUpdate(
      id,
      { 
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        order: parseInt(order) || existingSlide.order,
        isActive: Boolean(isActive),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    res.json({ 
      message: 'Hero slayd muvaffaqiyatli yangilandi', 
      slide: updatedSlide 
    });
  } catch (error) {
    console.error('❌ Hero slide update error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        message: 'Validatsiya xatosi', 
        errors 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }
    
    res.status(500).json({ message: 'Hero slayd yangilashda xato' });
  }
});

app.delete('/api/hero-slides/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await HeroSlide.findByIdAndDelete(id);
    
    if (!slide) {
      return res.status(404).json({ message: 'Hero slayd topilmadi' });
    }
    
    await HeroSlide.updateMany(
      { order: { $gt: slide.order } },
      { $inc: { order: -1 } }
    );
    
    res.json({ message: 'Hero slayd muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('❌ Hero slide deletion error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }
    
    res.status(500).json({ message: 'Hero slayd o\'chirishda xato' });
  }
});

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort, page = 1, limit = 20 } = req.query;
    let query = { isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'low') sortOption = { price: 1 };
    if (sort === 'high') sortOption = { price: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('❌ Products fetch error:', error);
    res.status(500).json({ message: 'Mahsulotlarni yuklashda xato' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).lean();
    
    if (!product) {
      return res.status(404).json({ message: 'Mahsulot topilmadi' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('❌ Product fetch error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }
    
    res.status(500).json({ message: 'Mahsulot yuklashda xato' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    
    res.status(201).json({ 
      message: 'Mahsulot muvaffaqiyatli qo\'shildi', 
      product: savedProduct 
    });
  } catch (error) {
    console.error('❌ Product creation error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        message: 'Validatsiya xatosi', 
        errors 
      });
    }
    
    res.status(500).json({ message: 'Mahsulot qo\'shishda xato' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(
      id, 
      { ...req.body, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Mahsulot topilmadi' });
    }
    
    res.json({ 
      message: 'Mahsulot muvaffaqiyatli yangilandi', 
      product 
    });
  } catch (error) {
    console.error('❌ Product update error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        message: 'Validatsiya xatosi', 
        errors 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }
    
    res.status(500).json({ message: 'Mahsulot yangilashda xato' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Mahsulot topilmadi' });
    }
    
    res.json({ message: 'Mahsulot muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('❌ Product deletion error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }
    
    res.status(500).json({ message: 'Mahsulot o\'chirishda xato' });
  }
});

// Upload endpoints
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Rasm fayl topilmadi' });
    }
    
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
    
    res.json({ 
      message: 'Rasm muvaffaqiyatli yuklandi', 
      imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Rasm hajmi 10MB dan kichik bo\'lishi kerak' });
      }
    }
    
    res.status(500).json({ message: 'Rasm yuklashda xato' });
  }
});

app.post('/api/hero-slides/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Rasm fayl topilmadi' });
    }
    
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/hero/${req.file.filename}`;
    
    res.status(200).json({ 
      message: 'Rasm muvaffaqiyatli yuklandi', 
      url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ Hero image upload error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Rasm hajmi 10MB dan kichik bo\'lishi kerak' });
      }
    }
    
    res.status(500).json({ message: 'Rasm yuklashda xato' });
  }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    message: 'API endpoint topilmadi',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Server start
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📡 Products: http://localhost:${PORT}/api/products`);
    console.log(`🎨 Hero Slides: http://localhost:${PORT}/api/hero-slides`);
    console.log(`📸 Upload: http://localhost:${PORT}/api/upload`);
    console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
    console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
    console.log(`\n📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`🌐 CORS: ${corsOptions.origin}\n`);
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Server to\'xtatilmoqda...');
  await mongoose.connection.close();
  console.log('✅ MongoDB yopildi');
  process.exit(0);
});

// Start
console.log('🚀 Terabayt Admin Backend ishga tushmoqda...\n');
connectDB();
