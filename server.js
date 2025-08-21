// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(express.static('public'));



app.post('/api/save-offer/:id', async (req, res) => {
  const offerID = req.params.id;
  const offerData = req.body;
  const filePath = path.join(__dirname, 'public', 'offers', `${offerID}.json`);
  try {
    await fs.outputJson(filePath, offerData);
    console.log(`Offer saved for ID: ${offerID}`);
    res.status(200).json({ message: 'Offer saved', id: offerID });
  } catch (err) {
    console.error('Error saving offer:', err);
    res.status(500).json({ error: 'Failed to save offer' });
  }
});

app.get('/api/get-offer/:id', async (req, res) => {
  const offerID = req.params.id;
  const filePath = path.join(__dirname, 'public', 'offers', `${offerID}.json`);
  try {
    const offerData = await fs.readJson(filePath);
    res.status(200).json(offerData);
  } catch (err) {
    console.error('Error reading offer:', err);
    res.status(404).json({ error: 'Offer not found' });
  }
});

app.post('/api/save-answer/:id', async (req, res) => {
  const answerID = req.params.id;
  const answerData = req.body;
  const filePath = path.join(__dirname, 'public', 'answers', `${answerID}.json`);
  try {
    await fs.outputJson(filePath, answerData);
    console.log(`Answer saved for ID: ${answerID}`);
    console.log("💾 Received answer for:", answerID);
    res.status(200).json({ message: 'Answer saved', id: answerID });
  } catch (err) {
    console.error('Error saving answer:', err);
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

app.get('/api/get-answer/:id', async (req, res) => {
  const answerID = req.params.id;
  const filePath = path.join(__dirname, 'public', 'answers', `${answerID}.json`);
  try {
    const answerData = await fs.readJson(filePath);
    res.status(200).json(answerData);
  } catch (err) {
    console.error('Error reading answer:', err);
    res.status(404).json({ error: 'Answer not found' });
  }
});

// Save metrics endpoint
app.post('/api/save-metrics', async (req, res) => {
  try {
    const metrics = req.body;
    const filePath = path.join(__dirname, 'public', 'metrics', `metrics-${Date.now()}.json`);
    await fs.outputJson(filePath, metrics);
    console.log('Metrics saved:', filePath);
    res.json({ ok: true, path: filePath });
  } catch (err) {
    console.error('save-metrics error', err);
    res.status(500).json({ error: 'failed to save metrics' });
  }
});

// Add this near other /api routes
app.post('/api/save-metrics-final', async (req, res) => {
  try {
    const metrics = req.body;
    const filePath = path.join(__dirname, 'metrics.json');  // ← Changed: not in public
    await fs.outputJson(filePath, metrics, { spaces: 2 });
    console.log('✅ Final metrics saved to:', filePath);
    res.json({ ok: true, path: filePath });
  } catch (err) {
    console.error('❌ Failed to save metrics.json:', err);
    res.status(500).json({ error: 'Failed to save metrics.json' });
  }
});

// Serve current mode to frontend
app.get('/api/mode', (req, res) => {
  const mode = process.env.MODE || 'wasm';
  res.json({ mode });
});

app.get('/test', (req, res) => {
  res.json({ ok: true, message: 'Server is working!', time: new Date().toISOString() });
});

app.get('/receive.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'receive.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
