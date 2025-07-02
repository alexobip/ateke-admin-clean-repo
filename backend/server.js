// backend/server.js
const express = require("express");
const cors = require("cors");
const usersRouter = require("./routes/users");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
