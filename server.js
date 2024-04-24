const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const port = 3000;

app.use(express.json());


mongoose.connect('mongodb+srv://alokalok280:alokSIN@bookapi.kqvwvfu.mongodb.net/?retryWrites=true&w=majority&appName=BookAPI', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  app.listen(port, () => {
    console.log(`API is listening at ${port}`);
  });
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});


userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});


userSchema.methods.generateAuthToken = function() {
  const user = this;
  const token = jwt.sign({ _id: user._id }, '6675565ffcdfxs');
  return token;
};

const User = mongoose.model('User', userSchema);


app.post('/signup', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    const token = newUser.generateAuthToken();
    res.status(201).send({ newUser, token });
  } catch (error) {
    res.status(400).send(error.message);
  }
});


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new Error('Invalid email or password');
    }
    const token = user.generateAuthToken();
    res.send({ success: "success", user, token });
  } catch (error) {
    res.status(400).send(error.message);
  }
});


const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, '6675565ffcdfxs');
    const user = await User.findOne({ _id: decoded._id });
    if (!user) {
      throw new Error();
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate' });
  }
};


const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  publicationYear: {
    type: Number,
    required: true
  }
});


const Book = mongoose.model('Book', bookSchema);

app.post('/books', auth, [
  body('title').notEmpty(),
  body('author').notEmpty(),
  body('publicationYear').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newBook = new Book(req.body);
    await newBook.save();
    res.status(201).send(newBook);
  } catch (error) {
    res.status(400).send(error.message);
  }
});


app.get('/books', auth, async (req, res) => {
  try {
    const books = await Book.find();
    res.send(books);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.get('/books/author/:author', auth, async (req, res) => {
  const author = req.params.author;

  try {
    const books = await Book.find({ author });
    res.send(books);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.get('/books/year/:year', auth, async (req, res) => {
  const year = req.params.year;

  try {
    const books = await Book.find({ publicationYear: year });
    res.send(books);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.put('/books/:id', auth, async (req, res) => {
  const updates = req.body;

  try {
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedBook) {
      return res.status(404).send({ error: 'Book not found' });
    }
    res.send(updatedBook);
  } catch (error) {
    res.status(400).send(error.message);
  }
});


app.delete('/books/:id', auth, async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) {
      return res.status(404).send({ error: 'Book not found' });
    }
    res.send(deletedBook);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.get('/docs', (req, res) => {
  
  res.send('Documentation will be provided here');
});


app.use((req, res) => {
  res.status(404).send('404: Page not Found');
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});
