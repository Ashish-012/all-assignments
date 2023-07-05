const e = require("express");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

app.use(express.json());

secret = "MySecretToken";

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean,
});

const Admin = mongoose.model("Admin", adminSchema);
const User = mongoose.model("User", userSchema);
const Course = mongoose.model("Course", courseSchema);

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        res.sendStatus(403);
      } else {
        req.user = user;
        next();
      }
    });
  } else {
    res.sendStatus(401);
  }
};

mongoose.connect(
  "mongodb+srv://ashish_012:SOyBa7W6UdbX82hl@cluster0.apxe94v.mongodb.net/Courses",
  { useNewUrlParser: true, useUnifiedTopology: true, dbName: "Courses" }
);

// Admin routes
app.post("/admin/signup", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (admin) {
    res.status(403).send("Admin already exists");
  } else {
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    const token = jwt.sign({ username, role: "admin" }, secret, {
      expiresIn: "1h",
    });
    res.json({ message: "Admin created successfully", token });
  }
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.headers;
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    const token = jwt.sign({ username, role: "admin" }, secret, {
      expiresIn: "1h",
    });
    res.json({ message: "Logged in successfully", token });
  } else {
    res.status(403).send("Admin not found");
  }
});

app.post("/admin/courses", authenticateJwt, (req, res) => {
  if (req.user.role === "admin") {
    const newCourse = new Course(req.body);
    newCourse.save();
    res.json({
      message: "Course created successfully",
      courseId: newCourse.id,
    });
  } else {
    res.sendStatus(403);
  }
});

app.put("/admin/courses/:courseId", authenticateJwt, async (req, res) => {
  if (req.user.role === "admin") {
    try {
      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.courseId,
        req.body,
        { new: true }
      );
      if (!updatedCourse) {
        res.status(404).json({ message: "Course not found" });
      } else {
        res.json({ message: "Course updated successfully" });
      }
    } catch (error) {
      res.status(422).send({ message: "Please enter correct course ID" });
    }
  } else {
    res.sendStatus(403);
  }
});

app.get("/admin/courses", authenticateJwt, async (req, res) => {
  if (req.user.role === "admin") {
    const courses = await Course.find();
    res.json({ courses });
  } else {
    res.sendStatus(403);
  }
});

// User routes
app.post("/users/signup", async (req, res) => {
  const { username, password } = req.body;
  const checkUser = await User.findOne({ username });
  if (checkUser) {
    res.status(403).json({ message: "User already exists" });
  } else {
    const newuser = new User({ username, password });
    const token = jwt.sign({ username, role: "user" }, secret, {
      expiresIn: "1h",
    });
    await newuser.save();
    res.json({ message: "User created successfully", token: token });
  }
});

app.post("/users/login", (req, res) => {
  const { username, password } = req.headers;
  const user = User.findOne({ username, password });
  if (user) {
    const token = jwt.sign({ username, role: "user" }, secret, {
      expiresIn: "1h",
    });
    res.send({ message: "Logged in successfully", token: token });
  } else {
    res.status(403).json({ message: "User not found" });
  }
});

app.get("/users/courses", authenticateJwt, async (req, res) => {
  const courses = await Course.find({ published: true });
  res.json({ courses });
});

app.post("/users/courses/:courseId", authenticateJwt, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (course) {
    const user = await User.findOne({ username: req.user.username });
    if (user) {
      user.purchasedCourses.push(course);
      await user.save();
      res.json({ message: "Course added successfully" });
    } else {
      res.status(403).json({ message: "User not found" });
    }
  } else {
    res.status(404).json({ message: "Course not found" });
  }
});

app.get("/users/purchasedCourses", authenticateJwt, async (req, res) => {
  const user = await User.findOne({ username: req.user.username }).populate(
    "purchasedCourses"
  );
  if (user) {
    console.log(user.purchasedCourses);
    res.json({ purchasedCourses: user.purchasedCourses || [] });
  } else {
    res.status(403).json({ message: "User not found" });
  }
});

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
