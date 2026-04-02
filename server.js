const { app, init } = require("./src/app");
const seed = require("./seed");

const PORT = process.env.PORT || 3000;

init
  .then(seed)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 FinanceOS running at http://localhost:${PORT}`);
      console.log(`   Login: admin@finance.com / admin123\n`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err.message);
    process.exit(1);
  });
