const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for temporary file storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `bug-report-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, and WebP images are allowed'));
    }
    cb(null, true);
  },
});

/**
 * Helper: Upload image to Supabase Storage and return public URL
 */
async function uploadToSupabaseStorage(localPath, userId, originalFilename) {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const mimeType = 'image/jpeg'; // We'll compress to JPEG
    
    // Generate unique filename for Supabase
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}-${uuidv4()}.jpg`;
    
    // Compress image with sharp
    const compressedBuffer = await sharp(fileBuffer)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('bug-reports')
      .upload(fileName, compressedBuffer, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('bug-reports')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw error;
  } finally {
    // Clean up temporary file
    try {
      fs.unlinkSync(localPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * POST /api/bug-reports - Submit a bug report
 * Required fields: description
 * Optional fields: screenshot (file)
 * Auto-included: device_info (JSONB), app_version
 */
router.post('/', requireAuth, upload.single('screenshot'), async (req, res) => {
  try {
    const { description, deviceInfo, appVersion } = req.body;
    
    // Validate required field
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        error: 'Description is required and must be a non-empty string',
      });
    }
    
    // Limit description length
    if (description.trim().length > 5000) {
      return res.status(400).json({
        error: 'Description must not exceed 5000 characters',
      });
    }
    
    let screenshotUrl = null;
    
    // Process screenshot if provided
    if (req.file) {
      try {
        screenshotUrl = await uploadToSupabaseStorage(
          req.file.path,
          req.userId,
          req.file.originalname
        );
      } catch (error) {
        console.error('Screenshot upload failed:', error);
        return res.status(400).json({
          error: 'Failed to upload screenshot. Please try again.',
        });
      }
    }
    
    // Parse device info (sent as JSON string from frontend)
    let parsedDeviceInfo = {};
    if (deviceInfo) {
      try {
        parsedDeviceInfo = typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo;
      } catch (e) {
        console.warn('Failed to parse deviceInfo:', e);
      }
    }
    
    // Create bug report record
    const { data, error } = await supabase
      .from('bug_reports')
      .insert({
        user_id: req.userId,
        description: description.trim(),
        device_info: parsedDeviceInfo,
        app_version: appVersion || null,
        screenshot_url: screenshotUrl,
        status: 'pending',
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating bug report:', error);
      throw error;
    }
    
    // Return success response with bug report ID for user reference
    res.status(201).json({
      id: data.id,
      message: 'Bug report submitted successfully',
      reference: data.id.split('-')[0].toUpperCase(), // Short reference for user
      description: data.description,
      screenshotUrl: data.screenshot_url,
      appVersion: data.app_version,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Error in POST /api/bug-reports:', error);
    res.status(500).json({
      error: 'Failed to submit bug report. Please try again later.',
    });
  }
});

/**
 * GET /api/bug-reports - Get user's own bug reports (paginated)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    const { data, error, count } = await supabase
      .from('bug_reports')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    res.json({
      reports: data.map(report => ({
        id: report.id,
        description: report.description,
        status: report.status,
        hasScreenshot: !!report.screenshot_url,
        screenshotUrl: report.screenshot_url,
        appVersion: report.app_version,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      })),
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    res.status(500).json({
      error: 'Failed to fetch bug reports',
    });
  }
});

/**
 * GET /api/bug-reports/:id - Get a specific bug report (only user's own)
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Bug report not found' });
    }
    
    res.json({
      id: data.id,
      description: data.description,
      status: data.status,
      screenshotUrl: data.screenshot_url,
      deviceInfo: data.device_info,
      appVersion: data.app_version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Error fetching bug report:', error);
    res.status(500).json({ error: 'Failed to fetch bug report' });
  }
});

module.exports = router;
