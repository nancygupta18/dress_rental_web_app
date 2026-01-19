/* import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import path from "path";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// PostgreSQL setup
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "dress-rental-project",
  password: "@18Shiva@",
  port: 5432,
});
db.connect();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.get("/admin-list-dress",(req,res) =>{
  res.render("list-dresses.ejs");
});
// Route: Add New Dress with multiple images
app.post('/admin/add-dress', async (req, res) => {
  try {
    const {
      d_name,
      availability,
      d_description,
      color,
      type,
      price_per_day,
      late_fee_per_day,
      stock_count
    } = req.body;

    if (!req.files || !req.files.main_image) {
      return res.status(400).send('Main image is required.');
    }

    const mainImage = req.files.main_image;
  
    const mainImageName = `${Date.now()}_${mainImage.name}`;
    const mainImagePath = `uploads/${mainImageName}`;
    const fullMainPath = path.join(uploadDir, mainImageName);
    await mainImage.mv(fullMainPath);

    // Insert main dress info
    const result = await db.query(
      `INSERT INTO dresses 
      (d_name, availability, d_description, color, type, price_per_day, late_fee_per_day, stock_count, main_image)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [d_name, availability, d_description, color, type, price_per_day, late_fee_per_day, stock_count, mainImagePath]
    );

    const dressId = result.rows[0].id;

    // Handle multiple additional images
    if (req.files.additional_images) {
      const images = Array.isArray(req.files.additional_images)
        ? req.files.additional_images
        : [req.files.additional_images];

      for (const image of images) {
        const imageName = `${Date.now()}_${image.name}`;
        const imagePath = `uploads/${imageName}`;
        const fullImagePath = path.join(uploadDir, imageName);
        await image.mv(fullImagePath);

        await db.query(
          "INSERT INTO dress_images (dress_id, image_url) VALUES ($1, $2)",
          [dressId, imagePath]
        );
      }
    }

    res.send("Dress and images uploaded successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error while uploading dress.");
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});  */

import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import fileUpload from "express-fileupload";

// Initialize the express app
const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize PostgreSQL client
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "dress-rental-project",
  password: "@18Shiva@",
  port: 5432,
});
db.connect();

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(fileUpload());


// Render the add dress form (GET)
app.get("/admin-list-dress", (req, res) => {
  res.render("list-dresses.ejs");
});

// Handle the form submission for adding a new dress (POST)
app.post("/admin/add-dress", async (req, res) => {
   const {d_name,
          availability,
          d_description,
          color,
          price_per_day,
          late_fee_per_day,
          material,
          size,
          type,
          title,
          gender,
        category }=req.body;
      
      const main_image=req.files?.main_image?.name || null;
      const image1=req.files?.image1?.name ||
      null;
      const image2=req.files?.image2?.name ||
      null;
      const image3=req.files?.image3?.name ||
      null;
      const image4=req.files?.image4?.name ||
      null;
      const image5=req.files?.image5?.name ||
      null;
    try {
      await db.query("insert into dresses(d_name,availability,d_description,color,price_per_day,late_fee_per_day,material,size,type,main_image,image1,image2,image3,image4,image5,title,gender,category) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)",
        [d_name,availability,d_description,color,price_per_day,late_fee_per_day,material,size,type,main_image,image1,image2,image3,image4,image5,title,gender,category]);
        res.send("Successful upload");
    } catch (error) {
        console.log(error);
        res.send("Failed upload");
    }
});

// Home route
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

