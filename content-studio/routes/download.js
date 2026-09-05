import express from 'express';
import path from 'path';
import { createReadStream, existsSync } from 'fs';

const router = express.Router();

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[\w\-]+\.(pptx|docx|pdf)$/.test(filename)) return res.status(400).json({ error: 'Invalid filename' });

  const filePath = path.join('/tmp', filename);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const mimeTypes = {
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf:  'application/pdf',
  };
  const ext = path.extname(filename).slice(1).toLowerCase();
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  createReadStream(filePath).pipe(res);
});

export default router;
