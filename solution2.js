import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
//import passport from passport; 
//import formidable from "formidable";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import session from 'express-session';

const __dirname = dirname(fileURLToPath(import.meta.url));
//import multer from "multer";

const app = express();
const port = 3000;
const saltRounds=10;
 

//app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Now define `upload`
//const upload = multer({ storage });
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000,
    }  // 1hour
}));
  

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use('/uploads', express.static('public/uploads'));


const db=new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "dress-rental-project",
  password: "@18Shiva@",
  Port: 5432,
 })
 db.connect();


app.get("/admin-list-dress",(req,res) =>{
  res.render("list-dresses.ejs");
});


const uploadDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

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
      await pool.query(
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

app.get("/", (req, res) => {
    const username=req.session.username;
  if(req.session.userId){
    res.render("home.ejs",{username:username});
   // console.log('Session:',req.session.userId );
  } 
  else{
    res.render("home.ejs");
  }

});


app.get("/login",(req,res)=>{
  res.render("login.ejs");
});


app.post("/submit", (req, res) => {
    res.render("sign-in.ejs"); 
  });


app.post("/submit-signup",async(req,res)=>{
  const name=req.body.name;
  const email=req.body.email;
  const password=req.body.password;
  const phone=req.body.phone;
  const address=req.body.address;
   
   try
   {  
      const checkemail=await db.query("select * from users where email=$1",[email]);
      const checkphone=await db.query("select * from users where phone=$1",[phone]);
     if(checkemail.rows.length >0)
    {
      res.render("sign-in.ejs",{mess3:"Email already exist..."});
    } 
    else if(checkphone.rows.length >0)
     {
        res.render("sign-in.ejs",{mess2:"Phone Number already exist..."}); 
     } 
    
    else
    {

      const userid=await db.query("insert into users (name,email,phone,address,password)values($1,$2,$3,$4,$5) RETURNING id",[name,email,phone,address,password]);
      req.session.userId = userid;
      req.session.username=name;
      res.redirect("/");
    }
   }
   catch(err)
   {
       console.error(err);
   }   
});
   

app.post("/login-submit",async (req,res)=>{
  const email=req.body.email;
  const password=req.body.password;
  const result= await db.query("select * from users where email=$1",[email]);
  const user=result.rows[0];
  if(result.rows.length>0)
  {
      if(user.password==password)
      {
        req.session.userId = user.id;
        req.session.username=user.name;
        res.redirect("/");
      }
      else
      {
        res.render("login.ejs",{message:"Wrong password"});
      }
  }
  else
  {
    res.render("login.ejs",{message:"Account doesn't exist"});
  }
});

app.get("/logout",(req,res)=>{
   req.session.destroy(()=>{
    res.render("home.ejs");
   });
});


app.get("/add-more-images",(req,res)=>{
   res.render("add-more-images.ejs");
});


app.post("/search",async (req,res)=>{

  const search=req.body.search;
  //const userid=req.body.userid;
  //onsole.log(userid);
  //console.log(search);

  const searchterm = `%${search}%`;
  try 
  {
     const result=await db.query("select * from dresses where d_name ilike $1 ",[searchterm]);
     res.render("search.ejs",{dresses:result.rows,search:search});
  } catch (error)
  {
    console.log(error);
  }
});
 
app.get("/rent/:dressId",async(req,res)=>{
  const dressid=req.params.dressId;
  const userid = req.session.userId;
  //const userid=req.body.userid;
  if(userid)
  {
    const result=await db.query("select * from users where id=$1",[userid]);
    const user=result.rows[0];
    res.render("rentdress.ejs",{name:user.name});
  }
 console.log(userid);
  //console.log(dressid);
   res.render("rentdress.ejs");
});

app.get("/dress/:id",async(req,res)=>{
   const dressid=req.params.id;
  // const userid=req.body.userid;
   //console.log(userid);
   const result=await db.query("SELECT * FROM dresses WHERE dresses.id = $1",[dressid]);
   const details=result.rows[0];
   res.render("dress.ejs",{detail:details});  
});
   

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });