require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { uploadsDir } = require('./middleware/upload');

const customersRouter = require('./routes/customers');
const sitesRouter = require('./routes/sites');
const auditsRouter = require('./routes/audits');
const auditSitesRouter = require('./routes/auditSites');
const internetConnectionsRouter = require('./routes/internetConnections');
const networksRouter = require('./routes/networks');
const activeDirectoryRouter = require('./routes/activeDirectory');
const infrastructureItemsRouter = require('./routes/infrastructureItems');
const commsRoomsRouter = require('./routes/commsRooms');
const softwareRouter = require('./routes/software');
const vendorSupportRouter = require('./routes/vendorSupport');
const imagesRouter = require('./routes/images');
const concernsRouter = require('./routes/concerns');
const exportsRouter = require('./routes/exports');

const app = express();
const PORT = process.env.PORT || 4000;

// Generous limit: JSON audit import inlines base64 photo data in the request body.
app.use(express.json({ limit: '300mb' }));
app.use('/uploads', express.static(uploadsDir));

app.use('/api/customers', customersRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/audits/:auditId/sites', auditSitesRouter);
app.use('/api/audits', auditsRouter);
app.use('/api/internet-connections', internetConnectionsRouter);
app.use('/api/networks', networksRouter);
app.use('/api/active-directory', activeDirectoryRouter);
app.use('/api/infrastructure-items', infrastructureItemsRouter);
app.use('/api/comms-rooms', commsRoomsRouter);
app.use('/api/software', softwareRouter);
app.use('/api/vendor-support', vendorSupportRouter);
app.use('/api/images', imagesRouter);
app.use('/api/concerns', concernsRouter);
app.use('/api/exports', exportsRouter);

// Once the client is built (npm run build), serve it from this same port so the
// whole app is a single `npm start` process on http://localhost:PORT.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === '23503') {
    // Postgres foreign_key_violation - e.g. deleting a site/customer that still has
    // audit data recorded against it (sites/customers are intentionally not cascade-deleted
    // once referenced, so audit history can never be silently wiped out).
    return res.status(409).json({ error: 'This record still has audit data linked to it and cannot be deleted.' });
  }
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`IT Audit server listening on http://localhost:${PORT}`);
});
