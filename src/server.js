import { app } from "./app.js";
import "dotenv/config";

const PORT = process.env.PORT || 7070;
const HOST = "0.0.0.0";

// Start the Express server instance
app.listen(PORT, HOST, () => {
  console.log(`🚀 Inventory System Server successfully initialized!`);
  console.log(`📡 Local Network Access active at: http://localhost:${PORT}`);
  console.log(`🌐 Public Network Listener bound to: http://${HOST}:${PORT}`);
});
