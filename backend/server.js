import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import adminAuthRoutes from "./src/routes/adminroutes/adminAuth.js";
import userAuthRoutes from "./src/routes/userroutes/userAuth.js";
import { dbConnnection } from './src/database-config/dbConfig.js';
import swaggerUi from "swagger-ui-express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const YAML = require("yamljs");
const AdminDocs = YAML.load("./admin.yaml");
const UserDocs = YAML.load("./user.yaml");

const app = express();
dbConnnection();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use(`/${process.env.SITE_NAME}/admin`, adminAuthRoutes);
app.use(`/${process.env.SITE_NAME}/user`, userAuthRoutes);
app.use("/admin-docs", swaggerUi.serveFiles(AdminDocs), swaggerUi.setup(AdminDocs));
app.use("/user-docs", swaggerUi.serveFiles(UserDocs), swaggerUi.setup(UserDocs));

app.listen(port, () => {
    console.log(`server started on port number ${port}`);
    console.log(`Admin docs → http://localhost:${port}/admin-docs`);
    console.log(`User docs → http://localhost:${port}/user-docs`);
});
