const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Task API",
      version: "1.0.0",
      description: "API pentru Task Manager (Firebase Firestore)",
    },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./server.js"],
};

module.exports = swaggerJSDoc(options);