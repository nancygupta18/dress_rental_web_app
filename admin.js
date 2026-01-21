import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import nodemailer from 'nodemailer';
import fileUpload from "express-fileupload";
import dotenv from "dotenv";
dotenv.config();


const port=3000;
const app=express();
const db=new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "dress-rental-project",
  password: process.env.DB_PASSWORD,
  Port: 5432,
 })
 db.connect();

const admin={email:'nancygupta1803@gmail.com',password:'1234'}
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use('/uploads', express.static('public/uploads'));
app.use(fileUpload());


app.post("/admin/login",(req,res)=>{
   const email=req.body.email;
   const password=req.body.password;
   if(email==admin.email && password==admin.password)
   {
      res.render("dashboard.ejs");
   }
   else{
    res.render("admin-login.ejs",{message:"Invalid Credentials"});
   }
});

app.get("/delivery",async(req,res)=>{
    const searchdate=req.query.searchDate;
    console.log(searchdate);
    try
    {
      if(searchdate)
      {
        const result=await db.query("SELECT * FROM dresses,rental_order,users WHERE d_date =$1 and rental_order.dress_id=dresses.id and rental_order.user_id=users.id ORDER BY d_date ASC;",[searchdate]);
         res.render("delivery.ejs",{result:result.rows,searchdate:searchdate});
      }
      else
      {
        const result=await db.query("SELECT * FROM dresses,rental_order,users WHERE d_date >= CURRENT_DATE and rental_order.dress_id=dresses.id and rental_order.user_id=users.id ORDER BY d_date ASC;");
        res.render("delivery.ejs",{result:result.rows});
      }     
    } 
    catch (error)
    {
        res.send(error);
    }
});

app.get("/return",async(req,res)=>{
    const searchdate=req.query.searchDate;
    console.log(searchdate);
    try
    {
      if(searchdate)
      {
        const result=await db.query("SELECT * FROM dresses,rental_order,users WHERE r_date =$1 and rental_order.dress_id=dresses.id and rental_order.user_id=users.id ORDER BY r_date ASC;",[searchdate]);
         res.render("return.ejs",{result:result.rows,searchdate:searchdate});
      }
      else
      {
        const result=await db.query("SELECT * FROM dresses,rental_order,users WHERE r_date >= CURRENT_DATE and rental_order.dress_id=dresses.id and rental_order.user_id=users.id ORDER BY r_date ASC;");
        res.render("return.ejs",{result:result.rows});
      }     
    } 
    catch (error)
    {
        res.send(error);
    }
});

app.post("/return-email-sent", async (req, res) => {
  const { userid, dressid, rentalid } = req.body;
  
  try {
    const result = await db.query(
      `select * from dresses,rental_order,users where users.id=$1 and 
       dresses.id=$2 and rental_order.rentalid=$3;`,
      [userid, dressid, rentalid]
    );


    const detail = result.rows[0];
    if (!detail) {
      return res.status(404).send('Rental not found'); 
    }
   
   if (result.rows[0].return_email_sent==true) {
      return res.redirect('/delivery');
    }
   
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'nancygupta1803@gmail.com',
        pass: process.env.EMAIL_PASSWORD,

      },
    });

    const mailOptions = {
  from: 'nancygupta1803@gmail.com',
  to: 'courierwala1803@gmail.com',
  subject: 'Pickup Request – Dress Return from Customer',
  text: `Dear Courier Service,

We would like to schedule a pickup for a returned rental dress from the following customer:

Dress ID: ##${detail.dress_id}  
Customer Name: ${detail.name}  
Address: ${detail.address}, ${detail.city}, ${detail.pincode}  
Contact Number: ${detail.phone}  
Alternate Number: ${detail.alt_phone}  
Return Pickup Date: ${detail.r_date}

Please ensure the pickup is arranged on or before the specified return date.  
Kindly confirm the pickup schedule or inform us if any additional details are required.

Best regards,  
Nancy Gupta  
Dress Rental Service`
};


    await transporter.sendMail(mailOptions);
    await db.query('UPDATE rental_order SET return_email_sent = TRUE WHERE rentalid = $1', [rentalid]);
    return res.send("Email sent successful"); // ✅ return here

  } catch (err) {
    console.error("Error sending email:", err);
    return res.status(500).send("Failed to send email."); // ✅ and return here
  }
});
           
app.post("/delivery_email_sent", async (req, res) => {
  const { userid, dressid, rentalid } = req.body;
  
  try {
    const result = await db.query(
      `select * from dresses,rental_order,users where users.id=$1 and 
       dresses.id=$2 and rental_order.rentalid=$3;`,
      [userid, dressid, rentalid]
    );

  
    const detail = result.rows[0];
    if (!detail) {
      return res.status(404).send('Rental not found'); 
    }
   
   if (result.rows[0].delivery_email_sent==true) {
      return res.redirect('/delivery');
    }
   
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'nancygupta1803@gmail.com',
        pass: process.env.EMAIL_PASSWORD,

      },
    });

    const mailOptions = {
      from: 'nancygupta1803@gmail.com',
      to: 'courierwala1803@gmail.com',
      subject: 'Urgent Delivery Request – Dress for Customer',
      text: `Dear Courier Service,

       We would like to request a delivery of a dress to the following customer:

       Dress ID: ##${detail.dress_id}  
       Customer Name: ${detail.name}  
       Address: ${detail.address}, ${detail.city}, ${detail.pincode}  
       Contact Number: ${detail.phone}  
       Alternate Number: ${detail.alt_phone}  
       Delivery Date: ${detail.d_date}

      Please ensure the delivery is completed on or before the specified date.
      Kindly confirm the pickup or let us know if any further details are needed.
      Best regards,  
      Nancy Gupta`
    };

    await transporter.sendMail(mailOptions);
    await db.query('UPDATE rental_order SET delivery_email_sent = TRUE WHERE rentalid = $1', [rentalid]);
    return res.send("Email sent successful"); // ✅ return here

  } catch (err) {
    console.error("Error sending email:", err);
    return res.status(500).send("Failed to send email."); // ✅ and return here
  }
});

app.get("/dress/:id", async (req, res) => {
  const update=true;
  const dressId = req.params.id;
  const result = await db.query("SELECT * FROM dresses WHERE id=$1", [dressId]);
  const details = result.rows[0];
  res.render("dress.ejs", { detail: details,update:update});
});

app.get("/admin-list-dress", (req, res) => {
  res.render("list-dresses.ejs");
});

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


app.get("/rental",(req,res)=>{
    res.render("rental-dates.ejs")
});

app.get("/dashboard",(req,res)=>{
    res.render("dashboard.ejs");
})

app.get("/show-dresses",async(req,res)=>{
    const result=await db.query("select * from dresses");
    res.render("admin-show-dress",{dresses:result.rows});
  
})

app.get("/logout",(req,res)=>{
    res.render("admin-login.ejs");
})

app.get("/",(req,res)=>{
  res.render("admin-login.ejs");
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });