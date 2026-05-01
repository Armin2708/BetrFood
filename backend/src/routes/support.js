const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const screenshotStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `support_${uuidv4()}${ext}`);
  },
});

const screenshotUpload = multer({
  storage: screenshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heif|heic/;
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = ext ? allowed.test(ext) : true;
    const mimeSubtype = file.mimetype.split('/')[1] || '';
    const mimeOk = allowed.test(mimeSubtype);
    if (mimeOk && extOk) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files (jpeg, jpg, png, webp, heif, heic) are allowed'));
  },
});

function formatTicket(row) {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    description: row.description,
    screenshotPath: row.screenshot_path,
    deviceInfo: row.device_info,
    osVersion: row.os_version,
    appVersion: row.app_version,
    status: row.status,
    createdAt: row.created_at,
  };
}

function createSupportTicketHandler(dbClient = supabase) {
  return async function createSupportTicket(req, res) {
    try {
      const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
      const deviceInfo = typeof req.body.deviceInfo === 'string' ? req.body.deviceInfo.trim() : '';
      const osVersion = typeof req.body.osVersion === 'string' ? req.body.osVersion.trim() : '';
      const appVersion = typeof req.body.appVersion === 'string' ? req.body.appVersion.trim() : '';
      const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;

      if (!subject || !description) {
        return res.status(400).json({ error: 'subject and description are required.' });
      }

      const { data, error } = await dbClient
        .from('support_tickets')
        .insert({
          user_id: req.userId,
          subject,
          description,
          screenshot_path: screenshotPath,
          device_info: deviceInfo,
          os_version: osVersion,
          app_version: appVersion,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(formatTicket(data));
    } catch (error) {
      console.error('Error creating support ticket:', error);
      return res.status(500).json({ error: 'Failed to submit support request.' });
    }
  };
}

const createSupportTicket = createSupportTicketHandler();

router.post('/', requireAuth, screenshotUpload.single('screenshot'), createSupportTicket);

module.exports = router;
module.exports.createSupportTicketHandler = createSupportTicketHandler;
module.exports.createSupportTicket = createSupportTicket;
