const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const next = require("next");

// Set the region and other options for all functions
setGlobalOptions({ region: "us-central1" });

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, conf: { distDir: ".next" } });
const handle = app.getRequestHandler();

exports.nextServer = onRequest({cpu: 2}, (req, res) => {
  return app.prepare().then(() => handle(req, res));
});
