// EcoLend backend — Express app entry point.
// Real wiring (helmet, session, csurf, logger, error handler, route mounting)
// is added incrementally. For now this only exposes a health check.

const express = require('express');

const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`EcoLend backend on :${port}`));
}
