require('dotenv').config();
const { server } = require('./src/server');

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[Server] Real-time chat server listening on port ${PORT}`);
  });
}

module.exports = require('./src/server');