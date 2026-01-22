// backend/swagger.js
const swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Task API",
    version: "1.0.0",
    description:
      "Simple REST API for tasks (Firestore) + offline sync + drag&drop reorder.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local dev server",
    },
  ],
};

const options = {
  swaggerDefinition,
  // IMPORTANT: trebuie să pointeze către fișierul unde ai @openapi comentariile
  apis: ["./server.js"],
};

module.exports = swaggerJSDoc(options);