const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination called for file:', file.originalname);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    console.log('Multer filename called for file:', file.originalname);
    console.log('File mimetype:', file.mimetype);
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname);
    
    // If extension is empty or not recognized, infer from mimetype
    if (!ext || ext === '') {
      if (file.mimetype === 'image/jpeg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/gif') ext = '.gif';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else ext = '.jpg'; // Default to jpg if unable to determine
    }
    
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// Filter for image files only
const fileFilter = (req, file, cb) => {
  console.log('Multer fileFilter called for file:', file.originalname);
  console.log('File mimetype:', file.mimetype);
  
  // Accept any image type
  if (file.mimetype.startsWith('image/')) {
    console.log('File accepted as image');
    cb(null, true);
  } else {
    console.log('File rejected as non-image');
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size (increased)
  } 
});

module.exports = upload; 