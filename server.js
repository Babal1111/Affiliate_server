require('dotenv').config();
const express = require('express'); // Express module included
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./src/routes/authRoutes');
const linksRoutes = require('./src/routes/linksRoutes');
const userRoutes = require('./src/routes/userRoutes');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Database connected'))
    .catch(error => console.log(error));

const app = express(); // Instance of express application

app.use(express.json()); // Middleware
app.use(cookieParser()); // Middleware

const corsOptions = {
    origin: process.env.CLIENT_ENDPOINT,
    credentials: true
};
app.use(cors(corsOptions));

app.use('/auth', authRoutes);
app.use('/links', linksRoutes);
app.use('/users', userRoutes);

const PORT = 5000;
app.listen(PORT, (error) => {
    if (error) {
        console.log('Server not started: ', error);
    } else {
        console.log(`Server is running on http://localhost:${PORT}`)
    }
});