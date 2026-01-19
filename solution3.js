import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import session from 'express-session';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;
const saltRounds = 10;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 }  // 1 hour
}));


app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use('/uploads', express.static('public/uploads'));



// PostgreSQL database connection
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "dress-rental-project",
  password: "@18Shiva@",
  port: 5432,
});
db.connect();

// File upload setup
const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Routes
app.get("/admin-list-dress", (req, res) => {
  res.render("list-dresses.ejs");
});

// Add dress
app.post("/admin/add-dress", (req, res) => {
  const form = formidable({
    multiples: true,
    uploadDir: uploadDir,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable Error:", err);
      return res.status(500).send("Upload failed");
    }

    // Process images
    const saveImage = (file) => {
      if (!file || !file.originalFilename || file.size === 0) return null;
      const newFileName = Date.now() + "_" + file.originalFilename;
      const newPath = path.join(uploadDir, newFileName);
      fs.renameSync(file.filepath, newPath);
      return "/uploads/" + newFileName;
    };

    const mainImagePath = saveImage(files.main_image);
    const image1Path = saveImage(files.image1);
    const image2Path = saveImage(files.image2);
    const image3Path = saveImage(files.image3);
    const image4Path = saveImage(files.image4);
    const image5Path = saveImage(files.image5);

    try {
      await db.query(
        `INSERT INTO dresses (
          d_name, type, color, material, size, 
          price_per_day, late_fee_per_day, availability, d_description,
          main_image, image1, image2, image3, image4, image5
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          fields.d_name,
          fields.type,
          fields.color,
          fields.material,
          fields.size,
          fields.price_per_day,
          fields.late_fee_per_day,
          fields.availability,
          fields.d_description,
          mainImagePath,
          image1Path,
          image2Path,
          image3Path,
          image4Path,
          image5Path
        ]
      );

      res.send("Dress added successfully!");
    } catch (dbErr) {
      console.error("DB Error:", dbErr);
      res.status(500).send("Database error");
    }
  });
});

// Home page route
app.get("/", (req, res) => {
  const username = req.session.username;
  if (req.session.userId) {
    res.render("home.ejs", { username: username });
  } else {
    res.render("home.ejs");
  }
});

// Login page route
app.get("/login", (req, res) => {
    res.render("login.ejs"); 
});

app.get("/submit",(req,res)=>{
  res.render("sign-in.ejs");
});

// Signup page route
app.post("/submit-signup", async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  try {
    const checkEmail = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    const checkPhone = await db.query("SELECT * FROM users WHERE phone=$1", [phone]);

    if (checkEmail.rows.length > 0) {
      res.render("sign-in.ejs", { mess3: "Email already exists..." });
    } else if (checkPhone.rows.length > 0) {
      res.render("sign-in.ejs", { mess2: "Phone number already exists..." });
    } else {
      const result = await db.query(
        "INSERT INTO users (name, email, phone, address, password) values($1,$2,$3,$4,$5)",
        [name, email, phone, address, password]
      );
     // const userId = result.rows[0].id;
     // req.session.userId = userId;        
    //  req.session.username = name;
      res.redirect("/");                  
    }
  } catch (err) {
    console.error(err);
  }
});

// Login submit route
app.post("/login-submit", async (req, res) => {
  const { email, password } = req.body;
  const dressId=req.body.dressId;
  const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
  const user = result.rows[0];
  if (result.rows.length > 0) {
    if (user.password == password) {
      req.session.userId = user.id;
      req.session.username = user.name;  
      if(dressId)
        {
          res.redirect(`/dress/${dressId}`)
        }    
        else{
        res.redirect("/");
        }
      
      // Redirect after successful login
      
    } else {
      res.render("login.ejs", { message: "Wrong password" });
    }
  } else {
    res.render("login.ejs", { message: "Account doesn't exist" });
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");  // Redirect to home after logout
  });
});

// Rent page route
app.get("/rent/:dressId", async (req, res) => {
  const dressId = req.params.dressId;
  const userId = req.session.userId;
  const dress= await db.query("select * from dresses where id=$1",[dressId]);
  console.log(dress.rows[0].price_per_day);
  if (userId)
  {
    const result = await db.query("SELECT * FROM users WHERE id=$1", [userId]);
    const user = result.rows[0];
    res.render("rentdress.ejs", { userdetail: user  ,amount:dress.rows[0].price_per_day,dress_id:dress.rows[0].id});
  } 
  else {
   res.redirect(`/login`);  
  }
});



app.post("/rentdress", async (req, res) => {
  const userId = req.session.userId;
  const {
    name,
    phone,
    address,
    pincode,
    city,
    d_date,
    r_date,
    alt_phone,
    no_of_days,
    amount,
    payment_method,
    dress_id
  } = req.body;
  try {
    // Update user info using userId
    await db.query(
      "UPDATE users SET name=$1, phone=$2, address=$3 WHERE id=$4",
      [name, phone, address, userId]
    );

    // Insert rental order
    await db.query(
      "INSERT INTO rental_order (user_id, dress_id, pincode, city, alt_phone, r_date, d_date, no_of_days, amount, payment_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [userId, dress_id, pincode, city, alt_phone, r_date, d_date, no_of_days, amount, payment_method]
    );
    res.render('pop-up.ejs', { success: true });

  } catch (error) {
    console.error(error);
    res.status(500).send("Rent failed");
  }
});

app.get("/addedtocart/:id",async(req,res)=>{
  const dressId = req.params.id;
  const userId = req.session.userId;
  try {
    if(userId){
      const result=await db.query("select * from cart where dress_id=$1 and user_id=$2",[dressId,userId]);
       if(result){
        
        await db.query("delete from cart where dress_id=$1 and user_id=$1",[dressId,userId]);
        }
      else
       {
        const result= await db.query("SELECT * FROM dresses WHERE id=$1", [dressId]);
        const details = result.rows[0];
       await db.query("insert into cart (user_id,dress_is) values ($1,$2)",[userId,dressId]);
        res.render("dress.ejs",{cart:true ,detail: details});
        
       }
      }
      else{
       res.redirect("/login");
      }
  } catch (error) {
    res.send("fail")
    
  }
})


app.get("/dress/:id", async (req, res) => {
  const dressId = req.params.id;
  const userId=req.session.userId;
  const result = await db.query("SELECT * FROM dresses WHERE id=$1", [dressId]);
  const feedback=await db.query("select * from users,feedback where d_id=$1 and users.id=feedback.u_id;",[dressId]);
  const details = result.rows[0];
  res.render("dress.ejs", { detail: details,feedback:feedback.rows });
});


app.get('/category', async (req, res) => {
  const {gender,type,id} = req.query;
  try {
    if(id)
    {
      const dresses = await db.query('SELECT * FROM dresses WHERE id=$1',[id]);
      const details=dresses.rows[0];
      res.render("dress.ejs",{detail:details});  
    }
    else if(gender){
    const dresses = await db.query(
      'SELECT * FROM dresses WHERE gender = $1 AND type = $2 or id=$3',
      [gender,type,id]
    );   
    res.render("search.ejs", { dresses: dresses.rows});}
    else{
      const dresses = await db.query('SELECT * FROM dresses',);   
      res.render("search.ejs", { dresses: dresses.rows});
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dresses");
  }

});

app.get("/feedback:dressId",async(req,res)=>{
  const dressId = req.params.dressId;
  const userId = req.session.userId;
  if(userId)
  {
      res.render("feedback.ejs",{dressId:dressId,userId:userId});
  }
  else
  {
  res.redirect("/login");
  }

});

app.post("/submit-feedback", async (req, res) => {
  const stars = parseInt(req.body.stars);
  const comment = req.body.comment.trim();
  const userId = req.session.userId;
  const dressId = req.body.dressId;

  // Validate stars value (1–5)
  if (!stars || stars < 1 || stars > 5) {
    return res.send("Invalid star rating.");
  }

  try {
    await db.query(
      "INSERT INTO feedback (u_id, d_id, comment, stars) VALUES ($1, $2, $3, $4)",
      [userId, dressId, comment, stars]
    );
    res.redirect(`/dress/${dressId}`);
  } catch (error) {
    console.error("Error inserting feedback:", error);
    res.send("fail");
  }
});



app.get("/order-history",async(req,res)=>{
  const userId = req.session.userId;
  if(userId)
  {  
    const result=await db.query(`SELECT * FROM rental_order,users,dresses WHERE user_id = $1 
    and rental_order.dress_id=dresses.id and rental_order.user_id=users.id;`,[userId]);  
    const details=result.rows;
    res.render("order_history.ejs",{dresses:details});
  }
  else
  {
    res.redirect("/login");
  }
});


app.post("/search", async (req, res) => {
  const search = req.body.search;
  const searchTerm = `%${search}%`;
  try {
    const result = await db.query("SELECT * FROM dresses WHERE d_name ILIKE $1", [searchTerm]);
    res.render("search.ejs", { dresses: result.rows, search: search });
  } catch (error) {
    console.error(error);
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
