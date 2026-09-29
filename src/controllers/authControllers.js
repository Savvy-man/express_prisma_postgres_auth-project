import  { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import { generate_jwt } from "../middlewares/authMiddleware.js";
import { messenger } from "../config/email.js";

export const register = async (req, res) => {
    console.log("➡️ Hey! The register route was successfully triggered! Body:", req.body);

  try {
    // get values from user form
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ msg: "Please provide name, email and password" });
    }

    // check if user already exist

     // 2. Safely fall back to check both prisma.user and prisma.User casing
    const userModel = prisma.user || prisma.User;
    if (!userModel) {
      console.error("💥 ERROR: User model is completely missing from the Prisma instance.");
      return res.status(500).json({ 
        message: "Internal Server Error", 
        errorDetail: "Database schema mapping mismatch. Check your schema.prisma file." 
      });
    }
    
    const exist_user = await prisma.user.findUnique({ where: { email } });
    if (exist_user)
      return res.status(400).json({ message: "user already exist" });

    // hash the password
    const hashed_password = await bcrypt.hash(password, 5);

    // save user to db
   const newUser = await prisma.user.create({ 
  data: {
    name,
    email,
    password: hashed_password
  }
})

    // send otp
    messenger.sendMail(
      {
        to: email,
        subject: "User Registration",
        text: `hello ${name}, your account has been registered successfully`,
      },
      (err, info) => {
    if (err) {
      console.log("❌ Email sending failed:", err.message);
    } else {
      console.log("📧 Email status:", info);
    }
  }
    );

    // console.log("email sent");

    // return successful
    // return res.sendStatus(201);
return res.status(201).json({ message: "created", data: newUser });  }catch (error) {
    // 1. This forces Node to print the FULL error stack trace in your terminal
    console.dir(error, { depth: null }); 
    
    // 2. This sends the error message directly back to Postman so you can see it instantly
    return res.status(500).json({ 
      message: "Internal Server Error", 
      errorDetail: error.message || String(error) 
    });
  }
};

// login endpoint
export const login = async (req, res) => {
  try {
    console.log("username:", req.user_name);
    // get email and password
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ msg: "Please provide, email and password" });
    }

    // check if user exist
    const exist_user = await prisma.user.findUnique({ where: { email } });
    if (!exist_user)
      return res.status(400).json({ message: "invalid credentials 1" });

    console.log("exist_user_password: ", typeof exist_user.password);
    // compare password
    const is_password_match = await bcrypt.compare(
      password,
      exist_user.password,
    );
    if (!is_password_match)
      return res.status(400).json({ message: "invalid credentials 2" });

    // return (jwt token)
    const token = await generate_jwt({ user_id: exist_user.id });
    return res.status(200).json({ token });
  } catch (error) {
    console.log("[/login] error: ", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// auth user profile
export const me = async (req, res) => {
  try {
    const user_id = req.user_id;
    console.log("user_id: ", user_id);
    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });
    if (!user) return res.sendStatus(404);

    return res
      .status(200)
      .json({ message: "user retrieved successfully", data: user });
  } catch (error) {
    console.log("[auth/me] error occured: ", error.message);
    return res.sendStatus(500);
  }
};

// change password
export const change_password = async (req, res) => {
  try {
    const user_id = req.user_id;
    if (!user_id) return res.sendStatus(401);

    // const user = await prisma.user.findUnique({ where: { id: user_id } });
    // if (!user) return res.sendStatus(404);

    const new_password = req.body.password;
    if (!new_password)
      return res.status(400).json({ message: "password field is required" });

    const hashed_password = await bcrypt.hash(new_password, 5);

    // modify the user password
    const new_user = await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        password: hashed_password,
      },
    });

    return res.sendStatus(200);
  } catch (error) {
    console.log("[auth/change_password] error occured: ", error.message);
    return res.sendStatus(500);
  }
};
